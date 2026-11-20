import "server-only";
import * as grpc from '@grpc/grpc-js';
import {
  CourseCatalogClient,
  ListCoursesRequest,
  ListCoursesResponse,
} from '@/src/generated/courses';
import { cookies } from 'next/headers';

const GRPC_SERVER_URL =
  process.env.GRPC_COURSES_SERVER_URL ?? '127.0.0.1:50052';

const globalForGrpc = globalThis as unknown as {
  coursesGrpcClient?: CourseCatalogClient;
};

export const coursesClient =
  globalForGrpc.coursesGrpcClient ??
  new CourseCatalogClient(GRPC_SERVER_URL, grpc.credentials.createInsecure());

if (process.env.NODE_ENV !== 'production') {
  globalForGrpc.coursesGrpcClient = coursesClient;
}

export async function listCourses(openOnly = false): Promise<ListCoursesResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    const method = openOnly
      ? coursesClient.listOpenCourses.bind(coursesClient)
      : coursesClient.listCourses.bind(coursesClient);

    method(
      ListCoursesRequest.create(),
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
