
"use server";

import { getSession } from "@/src/libs/session";
import { Role } from "@/src/generated/login-register";
import { getEnrolledStudents } from "@/src/libs/grades-client";

export async function getEnrolledStudentsAction(courseId: number) {
  try {
    // Verify the logged-in user.
    const session = await getSession();

    if (!session) {
      return {
        success: false,
        message: "You must be logged in.",
        students: [],
      };
    }

    // Only teachers can retrieve enrolled students.
    if (session.role !== Role.TEACHER) {
      return {
        success: false,
        message: "Only teachers can view enrolled students.",
        students: [],
      };
    }

    // Validate the course ID.
    if (!Number.isSafeInteger(courseId) || courseId <= 0) {
      return {
        success: false,
        message: "Invalid course ID.",
        students: [],
      };
    }

    // Retrieve students from the Grades Node.
    const students = await getEnrolledStudents(courseId);

    return {
      success: true,
      message: "Students retrieved successfully.",
      students: students.map((student) => ({
        username: student.username,
      })),
    };
  } catch (error) {
    console.error("Get enrolled students action error:", error);

    return {
      success: false,
      message: "Unable to retrieve enrolled students.",
      students: [],
    };
  }
}
