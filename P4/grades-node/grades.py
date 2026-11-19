# grades-node/grades.py
import configparser
import os
import threading
import time
from concurrent import futures
from mysql.connector import Error
import jwt
import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import grades_pb2
import grades_pb2_grpc
from db import get_connection

_config = configparser.ConfigParser()
_config.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))

SERVICE_NAME = grades_pb2.DESCRIPTOR.services_by_name["GradeService"].full_name
HEALTH_CHECK_INTERVAL_SECONDS = 5


class GradeServiceImpl(grades_pb2_grpc.GradeServiceServicer):
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
                SELECT course_id, course_name, grade FROM grades WHERE user_id = %s
                """,
                (user_id),
            )
            rows = cursor.fetchall()
            grades = [
                grades_pb2.GradeRecord(course_id=course_id, course_name=course_name, grade=grade)
                for course_id, course_name, grade in rows
            ]

            return grades_pb2.ListEnrollmentsResponse(
                grades=grades
            )
        
        except Error as e:
            print(f"Error while connecting to MySQL: {e}")
            context.abort(grpc.StatusCode.INTERNAL, "Failed to list grades")
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()

    def UploadGrades(self, request, context):
        context.abort(grpc.StatusCode.UNIMPLEMENTED, "UploadGrades is not implemented yet")


def server_port():
    return os.environ.get("SERVER_PORT") or _config.get("server", "port", fallback="50053")


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
    grades_pb2_grpc.add_GradeServiceServicer_to_server(GradeServiceImpl(), server)

    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    threading.Thread(target=monitor_database, args=(health_servicer,), daemon=True).start()

    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"grades node listening on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()