# courses-node/courses.py
import configparser
import os
import threading
import time
from concurrent import futures

import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import courses_pb2
import courses_pb2_grpc
from db import get_connection

_config = configparser.ConfigParser()
_config.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))

SERVICE_NAME = courses_pb2.DESCRIPTOR.services_by_name["CourseCatalog"].full_name
HEALTH_CHECK_INTERVAL_SECONDS = 5


class CourseCatalogService(courses_pb2_grpc.CourseCatalogServicer):
    def ListCourses(self, request, context):
        context.abort(grpc.StatusCode.UNIMPLEMENTED, "ListCourses is not implemented yet")

    def ListOpenCourses(self, request, context):
        context.abort(grpc.StatusCode.UNIMPLEMENTED, "ListOpenCourses is not implemented yet")


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