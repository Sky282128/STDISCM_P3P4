
import "server-only";

import { credentials, Metadata } from "@grpc/grpc-js";
import { cookies } from "next/headers";

import {
  GradeServiceClient,
  type GradeRecord,
  type UploadGradesRequest,
  type UploadGradesResult,
  type GetEnrolledStudentsRequest,
  type EnrolledStudent,
} from "@/src/generated/grades";

const GRADES_SERVER_URL =
  process.env.GRPC_GRADES_SERVER_URL ?? "127.0.0.1:50054";

// Reuse the gRPC client during development.
const globalForGrpc = globalThis as typeof globalThis & {
  gradesGrpcClient?: GradeServiceClient;
};

const gradesClient =
  globalForGrpc.gradesGrpcClient ??
  new GradeServiceClient(
    GRADES_SERVER_URL,
    credentials.createInsecure()
  );

if (process.env.NODE_ENV !== "production") {
  globalForGrpc.gradesGrpcClient = gradesClient;
}

// --------------------------------------------------
// Get Student Grades
// --------------------------------------------------

export async function getMyGrades(): Promise<GradeRecord[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    throw new Error("You are not authenticated.");
  }

  const metadata = new Metadata();
  metadata.set("authorization", `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    gradesClient.getMyGrades(
      {},
      metadata,
      (error, response) => {
        if (error) {
          console.error("GetMyGrades gRPC error:", error);
          reject(error);
          return;
        }

        resolve(response.grades ?? []);
      }
    );
  });
}

// --------------------------------------------------
// Get Enrolled Students (Teacher Only)
// --------------------------------------------------

export async function getEnrolledStudents(
  courseId: number
): Promise<EnrolledStudent[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    throw new Error("You are not authenticated.");
  }

  const metadata = new Metadata();
  metadata.set("authorization", `Bearer ${token}`);

  const request: GetEnrolledStudentsRequest = {
    courseId,
  };

  return new Promise((resolve, reject) => {
    gradesClient.getEnrolledStudents(
      request,
      metadata,
      (error, response) => {
        if (error) {
          console.error("GetEnrolledStudents gRPC error:", error);
          reject(error);
          return;
        }

        resolve(response.students ?? []);
      }
    );
  });
}

// --------------------------------------------------
// Upload Grades (Teacher Only)
// --------------------------------------------------

export async function uploadGrades(
  request: UploadGradesRequest
): Promise<UploadGradesResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    throw new Error("You are not authenticated.");
  }

  const metadata = new Metadata();
  metadata.set("authorization", `Bearer ${token}`);

  return new Promise((resolve, reject) => {
    gradesClient.uploadGrades(
      request,
      metadata,
      (error, response) => {
        if (error) {
          console.error("UploadGrades gRPC error:", error);
          reject(error);
          return;
        }

        resolve(response);
      }
    );
  });
}
