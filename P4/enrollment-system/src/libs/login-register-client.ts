import * as grpc from '@grpc/grpc-js';
import {
  AuthenticatorClient,
  AuthRequest,
  AuthResult,
  RegisterRequest,
  RegisterResult,
  LogoutRequest,
  LogoutResult,
} from '@/src/generated/login-register'; 

const GRPC_SERVER_URL = process.env.GRPC_AUTH_SERVER_URL ?? '127.0.0.1:50051';

const globalForGrpc = globalThis as unknown as {
  authGrpcClient?: AuthenticatorClient;
};

export const authClient =
  globalForGrpc.authGrpcClient ??
  new AuthenticatorClient(GRPC_SERVER_URL, grpc.credentials.createInsecure());

if (process.env.NODE_ENV !== 'production') {
  globalForGrpc.authGrpcClient = authClient;
}

const getDeadline = (timeoutMs = 5000) => new Date(Date.now() + timeoutMs);

export function authenticateUser(request: AuthRequest): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    authClient.authenticate(
      request,
      new grpc.Metadata(),
      { deadline: getDeadline() },
      (err, response) => {
        if (err || !response) {
          return reject(err ?? new Error('Empty response from gRPC server'));
        }
        resolve(response);
      }
    );
  });
}

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
          return reject(err ?? new Error('Empty response from gRPC server'));
        }
        resolve(response);
      }
    );
  });
}

export function logoutUser(request: LogoutRequest): Promise<LogoutResult> {
  return new Promise((resolve, reject) => {
    authClient.logout(
      request,
      new grpc.Metadata(),
      { deadline: getDeadline() },
      (err, response) => {
        if (err || !response) {
          return reject(err ?? new Error('Empty response from gRPC server'));
        }
        resolve(response);
      }
    );
  });
}