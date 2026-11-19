import * as grpc from '@grpc/grpc-js';
import {
  GradeServiceClient,
  GetGradesRequest,
  GetGradesResponse
} from '@/src/generated/grades';
import { cookies } from 'next/headers';

const GRPC_SERVER_URL =
  process.env.GRPC_GRADES_SERVER_URL ?? '127.0.0.1:50054';

const globalForGrpc = globalThis as unknown as {
  gradesGrpcClient?: GradeServiceClient;
};

export const gradesClient =
  globalForGrpc.gradesGrpcClient ??
  new GradeServiceClient(GRPC_SERVER_URL, grpc.credentials.createInsecure());

if (process.env.NODE_ENV !== 'production') {
  globalForGrpc.gradesGrpcClient = gradesClient;
}

export async function getGrades(openOnly = false): Promise<GetGradesResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    const method = gradesClient.getMyGrades.bind(gradesClient);

    method(
      GetGradesRequest.create(),
      metadata,
      { deadline: new Date(Date.now() + 5000) },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error('Empty response from gRPC courses server'));
          return;
        }
        resolve(response);
      }
    );
  });
}
