
import * as grpc from '@grpc/grpc-js';
import {
  EnrollmentServiceClient,
  EnrollRequest,
  EnrollResult,
  ListEnrollmentsRequest,
  ListEnrollmentsResponse,
} from '@/src/generated/enrollment';
import { cookies } from 'next/headers';

// This is the address of the Enrollment Node.
const GRPC_SERVER_URL =
  process.env.GRPC_ENROLLMENT_SERVER_URL ?? '127.0.0.1:50053';

// This keeps one gRPC client instance while the server is running.
const globalForGrpc = globalThis as unknown as {
  enrollmentGrpcClient?: EnrollmentServiceClient;
};

export const enrollmentClient =
  globalForGrpc.enrollmentGrpcClient ??
  new EnrollmentServiceClient(
    GRPC_SERVER_URL,
    grpc.credentials.createInsecure()
  );

if (process.env.NODE_ENV !== 'production') {
  globalForGrpc.enrollmentGrpcClient = enrollmentClient;
}

// This gets the user's enrolled courses.
export async function listMyEnrollments(): Promise<ListEnrollmentsResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    enrollmentClient.listMyEnrollments(
      ListEnrollmentsRequest.create(),
      metadata,
      { deadline: new Date(Date.now() + 5000) },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error('Empty response from Enrollment Node'));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// This enrolls the logged-in student in a course.
export async function enrollInCourse(
  courseId: number
): Promise<EnrollResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    enrollmentClient.enroll(
      EnrollRequest.create({ courseId }),
      metadata,
      { deadline: new Date(Date.now() + 5000) },
      (error, response) => {
        if (error || !response) {
          reject(error ?? new Error('Empty response from Enrollment Node'));
        } else {
          resolve(response);
        }
      }
    );
  });
}
