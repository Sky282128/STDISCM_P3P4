from concurrent import futures
from datetime import datetime, timedelta, timezone
import uuid
import grpc
import bcrypt
import mysql.connector
from mysql.connector import Error
import configparser
import jwt

import login_register_pb2
import login_register_pb2_grpc


config = configparser.ConfigParser()
config.read("config.ini")

class AuthenticatorServicer(login_register_pb2_grpc.AuthenticatorServicer):
    def Logout(self, request, context):
        connection = None
        cursor = None
        try:
            payload = jwt.decode(
                request.token,
                config["jwt"]["secret"],
                algorithms=["HS256"],
            )
            jti = payload.get("jti")
            if not jti:
                return login_register_pb2.LogoutResult(
                    success=False,
                    message="Invalid session token",
                )

            connection = mysql.connector.connect(
                host=config["database"]["host"],
                port=config.getint("database", "port"),
                user=config["database"]["user"],
                password=config["database"]["password"],
                database=config["database"]["database"],
            )
            cursor = connection.cursor()
            cursor.execute(
                "DELETE FROM active_sessions WHERE jti = %s",
                (jti,),
            )
            connection.commit()
            return login_register_pb2.LogoutResult(
                success=True,
                message="Logged out",
            )
        except jwt.InvalidTokenError:
            return login_register_pb2.LogoutResult(
                success=False,
                message="Invalid session token",
            )
        except Error as error:
            print(f"Error while logging out: {error}")
            if connection is not None and connection.is_connected():
                connection.rollback()
            return login_register_pb2.LogoutResult(
                success=False,
                message="Logout service unavailable",
            )
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None and connection.is_connected():
                connection.close()

    def Authenticate(self, request, context):
        print(f"Received login attempt for user: {request.username}")
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
                #joins the users table with the login to find the login detail pair
                sql = """
                    SELECT u.user_id, l.password, u.role
                    FROM users u
                    JOIN login_details l ON u.user_id = l.user_id
                    WHERE u.username = %s
                """
                cursor.execute(sql, (request.username,))
                result = cursor.fetchone()
                if not result:
                    return login_register_pb2.AuthResult(authenticated=False)

                user_id, stored_hash, role = result
                    
                password_bytes = request.password.encode('utf-8')
                stored_hash_bytes = stored_hash.encode('utf-8')

                if bcrypt.checkpw(password_bytes, stored_hash_bytes):
                    now = datetime.now(timezone.utc)
                    expires_minutes = config.getint("jwt", "expires_minutes", fallback=60)
                    payload = {
                        "sub": str(user_id),
                        "username": request.username,
                        "role": role,
                        "jti": str(uuid.uuid4()),
                        "iat": now,
                        "exp": now + timedelta(minutes=expires_minutes),
                    }

                    token = jwt.encode(
                        payload,
                        config["jwt"]["secret"],
                        algorithm="HS256"
                    )

                    expires_at = payload["exp"].replace(tzinfo=None)
                    sql = """
                        INSERT INTO active_sessions (jti, user_id, username, expires_at)
                        VALUES (%s, %s, %s, %s)
                    """
                    cursor.execute(
                        sql,
                        (payload["jti"], user_id, request.username, expires_at),
                    )
                    connection.commit()

                    print(f"Successful login attempt for user: {request.username}")

                    return login_register_pb2.AuthResult(
                        authenticated=True,
                        role=role,
                        token=token
                    )
                else:
                    print(f"Unsuccessful login attempt for user: {request.username}")
                    return login_register_pb2.AuthResult(authenticated=False)
                

        except Error as e:
            print(f"Error while connecting to MySQL: {e}")
            return login_register_pb2.AuthResult(authenticated=False)

        finally:
            if 'connection' in locals() and connection.is_connected():
                if 'cursor' in locals():
                    cursor.close()
                connection.close()
                print("MySQL connection is closed")

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

                return login_register_pb2.RegisterResult(success=True)

        except Error as e:
            print(f"Error while connecting to MySQL: {e}")
            if 'connection' in locals() and connection.is_connected():
                connection.rollback()
            return login_register_pb2.RegisterResult(success=True)

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

    port = config["server"]["port"]
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"gRPC server listening on port {port}...")

    server.wait_for_termination()

if __name__ == "__main__":
    serve()
