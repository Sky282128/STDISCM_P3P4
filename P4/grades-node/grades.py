
import configparser
import os
import threading
import time
import math
from concurrent import futures

from mysql.connector import Error
import jwt
import grpc

from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import grades_pb2
import grades_pb2_grpc
from db import get_connection


# --------------------------------------------------
# Configuration
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_config = configparser.ConfigParser()
_config.read(os.path.join(BASE_DIR, "config.ini"))

SERVICE_NAME = grades_pb2.DESCRIPTOR.services_by_name[
    "GradeService"
].full_name

HEALTH_CHECK_INTERVAL_SECONDS = 5


def get_jwt_secret():
    """Read JWT secret from environment or config.ini."""

    secret = os.environ.get("JWT_SECRET")

    if not secret:
        secret = _config.get("jwt", "secret", fallback="")

    return secret.strip()


def server_port():
    """Get Grades Node port."""

    return os.environ.get("SERVER_PORT") or _config.get(
        "server", "port", fallback="50054"
    )


# --------------------------------------------------
# Grade Service
# --------------------------------------------------

class GradeServiceImpl(grades_pb2_grpc.GradeServiceServicer):

    # --------------------------------------------------
    # Authentication and Session Verification
    # --------------------------------------------------

    def _authenticated_payload(self, context):

        metadata = dict(context.invocation_metadata())
        authorization = metadata.get("authorization", "")

        if not authorization.startswith("Bearer "):
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Missing session token"
            )

        token = authorization.removeprefix("Bearer ").strip()
        secret = get_jwt_secret()

        if not secret:
            context.abort(
                grpc.StatusCode.INTERNAL,
                "JWT secret is not configured"
            )

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

        jti = payload.get("jti")
        user_id = payload.get("sub")

        if not jti or not user_id:
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Invalid session claims"
            )

        connection = None
        cursor = None

        try:
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
                (jti, int(user_id))
            )

            session_exists = cursor.fetchone() is not None

        except Exception as e:
            print(f"Session verification error: {e}")

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Could not verify session"
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()

        if not session_exists:
            context.abort(
                grpc.StatusCode.UNAUTHENTICATED,
                "Session is logged out"
            )

        return payload

    # --------------------------------------------------
    # Get Student Grades
    # --------------------------------------------------

    def GetMyGrades(self, request, context):

        payload = self._authenticated_payload(context)
        user_id = int(payload["sub"])

        connection = None
        cursor = None

        try:
            connection = get_connection()
            cursor = connection.cursor()

            cursor.execute(
                """
                SELECT course_id, course_name, grade
                FROM grades
                WHERE user_id = %s
                ORDER BY course_id
                """,
                (user_id,)
            )

            rows = cursor.fetchall()

            grades = [
                grades_pb2.GradeRecord(
                    course_id=course_id,
                    course_name=course_name,
                    grade=float(grade)
                )
                for course_id, course_name, grade in rows
            ]

            print(
                f"Retrieved {len(grades)} grade(s) "
                f"for user ID {user_id}"
            )

            return grades_pb2.GetGradesResponse(
                grades=grades
            )

        except Error as e:
            print(f"Error while retrieving grades: {e}")

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Failed to list grades"
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()

    # --------------------------------------------------
    # Get Enrolled Students (Teacher Only)
    # --------------------------------------------------

    def GetEnrolledStudents(self, request, context):

        payload = self._authenticated_payload(context)
        teacher_id = int(payload["sub"])

        connection = None
        cursor = None

        try:
            connection = get_connection()
            cursor = connection.cursor()

            # 1. Verify that the logged-in user is a teacher.
            cursor.execute(
                """
                SELECT role
                FROM users
                WHERE user_id = %s
                """,
                (teacher_id,)
            )

            teacher = cursor.fetchone()

            if teacher is None or teacher[0] != "TEACHER":
                context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only teachers can view enrolled students."
                )

            # 2. Retrieve students enrolled in the selected course.
            cursor.execute(
                """
                SELECT u.username
                FROM users u
                JOIN user_enrollments e
                    ON u.user_id = e.user_id
                WHERE e.course_id = %s
                  AND e.enrolled = 1
                  AND u.role = 'STUDENT'
                ORDER BY u.username
                """,
                (request.course_id,)
            )

            rows = cursor.fetchall()

            students = [
                grades_pb2.EnrolledStudent(username=username)
                for (username,) in rows
            ]

            print(
                f"Retrieved {len(students)} enrolled student(s) "
                f"for course {request.course_id}"
            )

            return grades_pb2.GetEnrolledStudentsResponse(
                students=students
            )

        except Error as e:
            print(f"Error retrieving enrolled students: {e}")

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Failed to retrieve enrolled students."
            )

        finally:
            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()

    # --------------------------------------------------
    # Upload Grades (Teacher Only)
    # --------------------------------------------------

    def UploadGrades(self, request, context):

        payload = self._authenticated_payload(context)
        teacher_id = int(payload["sub"])

        connection = None
        cursor = None

        try:
            connection = get_connection()
            cursor = connection.cursor()

            # 1. Verify that the logged-in user is a teacher.
            cursor.execute(
                """
                SELECT role
                FROM users
                WHERE user_id = %s
                """,
                (teacher_id,)
            )

            teacher = cursor.fetchone()

            if teacher is None or teacher[0] != "TEACHER":
                return grades_pb2.UploadGradesResult(
                    success=False,
                    message="Only teachers can upload grades.",
                    saved_count=0
                )

            # 2. Verify that the course exists.
            cursor.execute(
                """
                SELECT course_name
                FROM courses
                WHERE course_id = %s
                """,
                (request.course_id,)
            )

            course = cursor.fetchone()

            if course is None:
                return grades_pb2.UploadGradesResult(
                    success=False,
                    message="Course not found.",
                    saved_count=0
                )

            course_name = course[0]

            # 3. Ensure grade entries were provided.
            if not request.entries:
                return grades_pb2.UploadGradesResult(
                    success=False,
                    message="No student grades were provided.",
                    saved_count=0
                )

            processed_usernames = set()
            saved_count = 0

            # 4. Process each student entry.
            for entry in request.entries:

                username = entry.student_username.strip()
                grade = float(entry.grade)

                if not username:
                    connection.rollback()

                    return grades_pb2.UploadGradesResult(
                        success=False,
                        message="Student username cannot be empty.",
                        saved_count=0
                    )

                # Validate grade: 0.0 to 4.0, in 0.5 increments.
                if (
                    not math.isfinite(grade)
                    or grade < 0.0
                    or grade > 4.0
                    or not math.isclose(grade * 2, round(grade * 2))
                ):
                    connection.rollback()

                    return grades_pb2.UploadGradesResult(
                        success=False,
                        message=f"Invalid grade for {username}. "
                                "Grades must be from 0.0 to 4.0 "
                                "in 0.5 increments.",
                        saved_count=0
                    )

                if username in processed_usernames:
                    connection.rollback()

                    return grades_pb2.UploadGradesResult(
                        success=False,
                        message=f"Duplicate student entry: {username}.",
                        saved_count=0
                    )

                processed_usernames.add(username)

                # 5. Verify the student exists and is enrolled
                # in the selected course.
                cursor.execute(
                    """
                    SELECT u.user_id
                    FROM users u
                    JOIN user_enrollments e
                        ON u.user_id = e.user_id
                    WHERE u.username = %s
                      AND u.role = 'STUDENT'
                      AND e.course_id = %s
                      AND e.enrolled = 1
                    """,
                    (username, request.course_id)
                )

                student = cursor.fetchone()

                if student is None:
                    connection.rollback()

                    return grades_pb2.UploadGradesResult(
                        success=False,
                        message=(
                            f"{username} is not enrolled "
                            f"in course {request.course_id}."
                        ),
                        saved_count=0
                    )

                student_id = student[0]

                # 6. Insert the grade or update an existing grade.
                cursor.execute(
                    """
                    INSERT INTO grades (
                        course_id,
                        course_name,
                        user_id,
                        grade
                    )
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        course_name = VALUES(course_name),
                        grade = VALUES(grade)
                    """,
                    (
                        request.course_id,
                        course_name,
                        student_id,
                        grade
                    )
                )

                saved_count += 1

            # 7. Commit all grade entries together.
            connection.commit()

            print(
                f"Teacher ID {teacher_id} uploaded "
                f"{saved_count} grade(s) for course "
                f"{request.course_id}"
            )

            return grades_pb2.UploadGradesResult(
                success=True,
                message=f"Successfully saved {saved_count} grade(s).",
                saved_count=saved_count
            )

        except Error as e:

            if connection is not None:
                connection.rollback()

            print(f"Error while uploading grades: {e}")

            context.abort(
                grpc.StatusCode.INTERNAL,
                "Failed to upload grades."
            )

        except (ValueError, TypeError) as e:

            if connection is not None:
                connection.rollback()

            print(f"Invalid grade data: {e}")

            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "Invalid grade data."
            )

        finally:

            if cursor is not None:
                cursor.close()

            if connection is not None:
                connection.close()


# --------------------------------------------------
# Database Health Monitoring
# --------------------------------------------------

def monitor_database(health_servicer):

    while True:

        connection = None

        try:
            connection = get_connection()

            status = health_pb2.HealthCheckResponse.SERVING

        except Exception as e:
            print(f"Database health check failed: {e}")

            status = health_pb2.HealthCheckResponse.NOT_SERVING

        finally:
            if connection is not None:
                connection.close()

        health_servicer.set("", status)
        health_servicer.set(SERVICE_NAME, status)

        time.sleep(HEALTH_CHECK_INTERVAL_SECONDS)


# --------------------------------------------------
# Start Grades Node
# --------------------------------------------------

def serve():

    port = server_port()

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10)
    )

    grades_pb2_grpc.add_GradeServiceServicer_to_server(
        GradeServiceImpl(),
        server
    )

    health_servicer = health.HealthServicer()

    health_pb2_grpc.add_HealthServicer_to_server(
        health_servicer,
        server
    )

    threading.Thread(
        target=monitor_database,
        args=(health_servicer,),
        daemon=True
    ).start()

    server.add_insecure_port(f"[::]:{port}")

    server.start()

    print(f"Grades Node listening on port {port}")

    server.wait_for_termination()


if __name__ == "__main__":
    serve()
