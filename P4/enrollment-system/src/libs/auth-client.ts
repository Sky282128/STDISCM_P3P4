
import "server-only";

import * as grpc from "@grpc/grpc-js";

import {
  AuthenticatorClient,
  type AuthRequest,
  type AuthResult,
  type RegisterRequest,
  type RegisterResult,
  type LogoutRequest,
  type LogoutResult,
} from "@/src/generated/login-register";

// ==========================================
// GRPC CONFIGURATION
// ==========================================

const AUTH_SERVER_URL =
  process.env.GRPC_AUTH_SERVER_URL ?? "127.0.0.1:50051";

const REQUEST_TIMEOUT_MS = 5000;

function getDeadline(): Date {
  return new Date(Date.now() + REQUEST_TIMEOUT_MS);
}

// ==========================================
// GRPC CLIENT
// ==========================================

const globalForAuthGrpc = globalThis as unknown as {
  authGrpcClient?: InstanceType<typeof AuthenticatorClient>;
};

export const authClient =
  globalForAuthGrpc.authGrpcClient ??
  new AuthenticatorClient(
    AUTH_SERVER_URL,
    grpc.credentials.createInsecure()
  );

if (process.env.NODE_ENV !== "production") {
  globalForAuthGrpc.authGrpcClient = authClient;
}

// ==========================================
// AUTHENTICATE USER
// ==========================================

export function authenticateUser(
  request: AuthRequest
): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    authClient.authenticate(
      request,
      new grpc.Metadata(),
      { deadline: getDeadline() },
      (err, response) => {
        if (err || !response) {
          return reject(
            err ?? new Error("Empty response from gRPC server")
          );
        }

        resolve(response);
      }
    );
  });
}

// ==========================================
// REGISTER USER
// ==========================================

export function registerUser(
  request: RegisterRequest
): Promise<RegisterResult> {
  return new Promise((resolve, reject) => {
    authClient.register(
      request,
      new grpc.Metadata(),
      { deadline: getDeadline() },
      (err, response) => {
        if (err || !response) {
          return reject(
            err ?? new Error("Empty response from gRPC server")
          );
        }

        resolve(response);
      }
    );
  });
}

// ==========================================
// LOGOUT USER
// ==========================================

export function logoutUser(
  request: LogoutRequest
): Promise<LogoutResult> {
  return new Promise((resolve, reject) => {
    authClient.logout(
      request,
      new grpc.Metadata(),
      { deadline: getDeadline() },
      (err, response) => {
        if (err || !response) {
          return reject(
            err ?? new Error("Empty response from gRPC server")
          );
        }

        resolve(response);
      }
    );
  });
}
