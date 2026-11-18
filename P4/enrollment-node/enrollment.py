# enrollment-node/enrollment.py
import configparser
import os
import threading
import time
from concurrent import futures

import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

import enrollment_pb2
import enrollment_pb2_grpc
from db import get_connection

_config = configparser.ConfigParser()
_config.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))

SERVICE_NAME = enrollment_pb2.DESCRIPTOR.services_by_name["EnrollmentService"].full_name
HEALTH_CHECK_INTERVAL_SECONDS = 5


class EnrollmentServiceImpl(enrollment_pb2_grpc.EnrollmentServiceServicer):
    def Enroll(self, request, context):
        context.abort(grpc.StatusCode.UNIMPLEMENTED, "Enroll is not implemented yet")

    def ListMyEnrollments(self, request, context):
        context.abort(grpc.StatusCode.UNIMPLEMENTED, "ListMyEnrollments is not implemented yet")


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
    enrollment_pb2_grpc.add_EnrollmentServiceServicer_to_server(EnrollmentServiceImpl(), server)

    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    threading.Thread(target=monitor_database, args=(health_servicer,), daemon=True).start()

    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"enrollment node listening on port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()