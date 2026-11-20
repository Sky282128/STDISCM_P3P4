
# enrollment-node/enrollment.py

import configparser
import os
import threading
import time
from concurrent import futures

import jwt
import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import enrollment_pb2
import enrollment_pb2_grpc
from db import get_connection
from mysql.connector import Error

# Loads the configuration settings from config.ini.
_config = configparser.ConfigParser()
_config.read(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini")
)

# Gets the full name of the Enrollment gRPC service.
SERVICE_NAME = enrollment_pb2.DESCRIPTOR.services_by_name[
    "EnrollmentService"
].full_name

HEALTH_CHECK_INTERVAL_SECONDS = 5


class EnrollmentServiceImpl(
    enrollment_pb2_grpc.EnrollmentServiceServicer
):

    # Verifies the JWT token and checks whether the user's session is active.
    def _authenticated_payload(self, context):

        metadata = dict(context.invocation_metadata())
        authorization = metadata.get("authorization", "")

        # Checks whether the request contains a Bearer token.
        if not authorization.startswith("Bearer "):
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Missing session token"
            )

        token = authorization.removeprefix("Bearer ").strip()

        # Retrieves the JWT secret from the environment or config.ini.
        secret = os.environ.get("JWT_SECRET") or _config.get(
            "jwt", "secret", fallback=""
        )

        if not secret:
            context.abort(
                grpc.StatusCode.INTERNAL,
                "JWT secret is not configured"
            )

        # Decodes and verifies the JWT token.
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"]
            )
        except jwt.InvalidTokenError:
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Invalid or expired session"
            )

        # Retrieves the session ID and user ID from the token.
        jti = payload.get("jti")
        user_id = payload.get("sub")

        if not jti or not user_id:
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Invalid session claims"
            )

        connection = None
        cursor = None
        session_exists = False

        try:
            # Connects to MySQL to verify the active session.
            connection = get_connection()
            cursor = connection.cursor()

            cursor.execute(
                """
                SELECT jti
                FROM active_sessions
                WHERE jti = %s
                AND user_id = %s
                AND expires_at > UTC_TIMESTAMP()
                """,
                (jti, int(user_id)),
            )

            session_exists = cursor.fetchone() is not None

        except Exception as error:
            print(
                f"Session verification error: {error}",
                flush=True
            )

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Could not verify session"
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()

        # Rejects requests from users whose sessions are no longer active.
        if not session_exists:
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Session is logged out"
            )

        return payload

    # Enrolls the authenticated student in a selected course.
    def Enroll(self, request, context):

        payload = self._authenticated_payload(context)
        user_id = int(payload["sub"])

        connection = None
        cursor = None

        try:
            connection = get_connection()
            cursor = connection.cursor()

            # Checks whether the student is already enrolled in this course.
            cursor.execute(
                """
                SELECT user_id, enrolled
                FROM user_enrollments
                WHERE user_id = %s
                AND course_id = %s
                AND enrolled = 1
                """,
                (user_id, request.course_id),
            )

            result = cursor.fetchone()

            if result:
                return enrollment_pb2.EnrollResult(
                    success=False,
                    message="Already enrolled in course"
                )

            # Inserts the student's enrollment into the database.
            cursor.execute(
                """
                INSERT INTO user_enrollments
                (user_id, course_id, enrolled)
                VALUES (%s, %s, 1)
                ON DUPLICATE KEY UPDATE enrolled = 1
                """,
                (user_id, request.course_id),
            )

            connection.commit()

            return enrollment_pb2.EnrollResult(
                success=True,
                message="Enrollment successful"
            )

        except Error as error:
            print(
                f"Enrollment database error: {error}",
                flush=True
            )

            if connection is not None and connection.is_connected():
                connection.rollback()

            return enrollment_pb2.EnrollResult(
                success=False,
                message="Enrollment connection error"
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()

    # Retrieves all courses enrolled by the authenticated student.
    def ListMyEnrollments(self, request, context):

        # Verifies the student's JWT and retrieves their user ID.
        payload = self._authenticated_payload(context)
        user_id = int(payload["sub"])

        connection = None
        cursor = None

        try:
            connection = get_connection()

            # Uses dictionary=True so database columns can be accessed by name.
            cursor = connection.cursor(dictionary=True)

            # Retrieves the course ID and course name for the logged-in student.
            cursor.execute(
                """
                SELECT
                    c.course_id,
                    c.course_name
                FROM courses c
                JOIN user_enrollments e
                    ON e.course_id = c.course_id
                WHERE e.user_id = %s
                AND e.enrolled = 1
                ORDER BY c.course_name
                """,
                (user_id,),
            )

            rows = cursor.fetchall()

            # Converts the database records into protobuf EnrolledCourse objects.
            enrollments = [
                enrollment_pb2.EnrolledCourse(
                    course_id=row["course_id"],
                    course_name=row["course_name"]
                )
                for row in rows
            ]

            # Returns the student's enrolled courses through gRPC.
            return enrollment_pb2.ListEnrollmentsResponse(
                enrollments=enrollments
            )

        except Error as error:
            print(
                f"List enrollments database error: {error}",
                flush=True
            )

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Failed to list enrollments"
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()


# Retrieves the Enrollment Node port from the environment or config.ini.
def server_port():
    return os.environ.get("SERVER_PORT") or _config.get(
        "server", "port", fallback="50053"
    )


# Periodically checks the MySQL connection and updates the node health status.
def monitor_database(health_servicer):

    while True:
        try:
            get_connection().close()
            status = health_pb2.HealthCheckResponse.SERVING

        except Exception:
            status = health_pb2.HealthCheckResponse.NOT_SERVING

        health_servicer.set("", status)
        health_servicer.set(SERVICE_NAME, status)

        time.sleep(HEALTH_CHECK_INTERVAL_SECONDS)


# Starts the Enrollment gRPC server.
def serve():

    port = server_port()

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10)
    )

    enrollment_pb2_grpc.add_EnrollmentServiceServicer_to_server(
        EnrollmentServiceImpl(),
        server
    )

    # Registers the gRPC health-check service.
    health_servicer = health.HealthServicer()

    health_pb2_grpc.add_HealthServicer_to_server(
        health_servicer,
        server
    )

    # Starts the database health monitor in a background thread.
    threading.Thread(
        target=monitor_database,
        args=(health_servicer,),
        daemon=True
    ).start()

    server.add_insecure_port(f"[::]:{port}")
    server.start()

    print(f"enrollment node listening on port {port}")

    server.wait_for_termination()


# Runs the Enrollment Node when this file is executed directly.
if __name__ == "__main__":
    serve()
