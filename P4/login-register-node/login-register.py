from concurrent import futures
import grpc
import bcrypt
import mysql.connector
from mysql.connector import Error
import configparser

import login_register_pb2
import login_register_pb2_grpc


config = configparser.ConfigParser()
config.read("config.ini")

class AuthenticatorServicer(login_register_pb2_grpc.AuthenticatorServicer):
    def Authenticate(self, request, context):
        print(f"Received login attempt for user: {request.username}")

    def Register(self, request, context):
        try:
            connection = mysql.connector.connect(
                host=config["database"]["host"],
                port=config.getint("database", "port"),
                user=config["database"]["user"],
                password=config["database"]["password"],
                database=config["database"]["database"]
            )
            cursor = connection.cursor();

            if connection.is_connected():
                #creates the user entry in the users table
                sql = "INSERT INTO users (username, role) VALUES (%s, %s)"
                cursor.execute(sql, (request.username, request.role))

                #creates the login info entry
                userid = cursor.lastrowid
                salt = bcrypt.gensalt()
                hashedPassword = bcrypt.hashpw(request.password.encode('utf-8'), salt)
                sql = "INSERT INTO login_details (user_id, password) VALUES (%s, %s)"
                cursor.execute(sql, (userid, hashedPassword.decode('utf-8')))

                connection.commit()

                return login_register_pb2.Result(authenticated=True)

        except Error as e:
            print(f"Error while connecting to MySQL: {e}")
            if 'connection' in locals() and connection.is_connected():
                connection.rollback()
            return login_register_pb2.Result(authenticated=False)

        finally:
            if 'connection' in locals() and connection.is_connected():
                if 'cursor' in locals():
                    cursor.close()
                connection.close()
                print("MySQL connection is closed")


# gets the server running
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    login_register_pb2_grpc.add_AuthenticatorServicer_to_server(
        AuthenticatorServicer(), server
    )

    port = "50051"
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"gRPC server listening on port {port}...")

    server.wait_for_termination()

if __name__ == "__main__":
    serve()
