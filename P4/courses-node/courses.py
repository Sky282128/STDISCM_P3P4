# courses-node/courses.py
import configparser
import os
import threading
import time
from concurrent import futures

import grpc
import jwt
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import courses_pb2
import courses_pb2_grpc
from db import get_connection

_config = configparser.ConfigParser()
_config.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))

SERVICE_NAME = courses_pb2.DESCRIPTOR.services_by_name["CourseCatalog"].full_name
HEALTH_CHECK_INTERVAL_SECONDS = 5


class CourseCatalogService(courses_pb2_grpc.CourseCatalogServicer):
    def _authenticated_payload(self, context):
        metadata = dict(context.invocation_metadata())
        authorization = metadata.get("authorization", "")
        if not authorization.startswith("Bearer "):
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing session token")

        token = authorization.removeprefix("Bearer ").strip()
        secret = os.environ.get("JWT_SECRET") or _config.get(
            "jwt", "secret", fallback=""
        )
        if not secret:
            context.abort(grpc.StatusCode.INTERNAL, "JWT secret is not configured")

        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid or expired session")

        jti = payload.get("jti")
        user_id = payload.get("sub")
        if not jti or not user_id:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid session claims")

        connection = None
        cursor = None
        session_exists = False
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute(
                "SELECT jti FROM active_sessions "
                "WHERE jti = %s AND user_id = %s AND expires_at > UTC_TIMESTAMP()",
                (jti, int(user_id)),
            )
            session_exists = cursor.fetchone() is not None
        except Exception:
            context.abort(grpc.StatusCode.INTERNAL, "Could not verify session")
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()

        if not session_exists:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Session is logged out")

        return payload

    def ListCourses(self, request, context):
        self._authenticated_payload(context)
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT course_id, course_name, status FROM courses ORDER BY course_name"
            )

            courses = []
            for row in cursor.fetchall():
                status = (
                    courses_pb2.OPEN
                    if row["status"] == "OPEN"
                    else courses_pb2.CLOSED
                )
                courses.append(
                    courses_pb2.Course(
                        course_id=row["course_id"],
                        course_name=row["course_name"],
                        status=status,
                    )
                )
            return courses_pb2.ListCoursesResponse(courses=courses)
        except Exception as error:
            context.abort(grpc.StatusCode.INTERNAL, f"Failed to list courses: {error}")
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()

    def ListOpenCourses(self, request, context):
        self._authenticated_payload(context)
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT course_id, course_name, status "
                "FROM courses WHERE status = 'OPEN' ORDER BY course_name"
            )

            courses = []
            for row in cursor.fetchall():
                courses.append(
                    courses_pb2.Course(
                        course_id=row["course_id"],
                        course_name=row["course_name"],
                        status=courses_pb2.OPEN,
                    )
                )
            return courses_pb2.ListCoursesResponse(courses=courses)
        except Exception as error:
            context.abort(grpc.StatusCode.INTERNAL, f"Failed to list open courses: {error}")
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()


def server_port():
    return os.environ.get("SERVER_PORT") or _config.get("server", "port", fallback="50052")


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


def serve():
    port = server_port()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    courses_pb2_grpc.add_CourseCatalogServicer_to_server(CourseCatalogService(), server)

    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    threading.Thread(target=monitor_database, args=(health_servicer,), daemon=True).start()

    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"courses node listening on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()