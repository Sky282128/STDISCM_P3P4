
"use server";

import { getSession } from "@/src/libs/session";
import { Role } from "@/src/generated/login-register";
import { uploadGrades } from "@/src/libs/grades-client";
import { revalidatePath } from "next/cache";

interface GradeEntryInput {
  studentUsername: string;
  grade: number;
}

export async function uploadGradesAction(
  courseId: number,
  entries: GradeEntryInput[]
) {
  try {
    // 1. Verify the logged-in user.
    const session = await getSession();

    if (!session) {
      return {
        success: false,
        message: "You must be logged in.",
      };
    }

    // 2. Only teachers can upload grades.
    if (session.role !== Role.TEACHER) {
      return {
        success: false,
        message: "Only teachers can upload grades.",
      };
    }

    // 3. Validate course ID.
    if (!Number.isSafeInteger(courseId) || courseId <= 0) {
      return {
        success: false,
        message: "Invalid course ID.",
      };
    }

    // 4. Validate grade entries.
    if (!Array.isArray(entries) || entries.length === 0) {
      return {
        success: false,
        message: "Please provide at least one student grade.",
      };
    }

    const usernames = new Set<string>();

    for (const entry of entries) {
      const username = entry.studentUsername?.trim();

      if (!username) {
        return {
          success: false,
          message: "Student username cannot be empty.",
        };
      }

      if (
        typeof entry.grade !== "number" ||
        !Number.isFinite(entry.grade)
      ) {
        return {
          success: false,
          message: `Invalid grade for ${username}.`,
        };
      }

      if (usernames.has(username)) {
        return {
          success: false,
          message: `Duplicate student entry: ${username}.`,
        };
      }

      usernames.add(username);
    }

    // 5. Convert frontend entries to protobuf request format.
    const request = {
      courseId,
      entries: entries.map((entry) => ({
        studentUsername: entry.studentUsername.trim(),
        grade: entry.grade,
      })),
    };

    // 6. Call the Grades Node through gRPC.
    const result = await uploadGrades(request);

    // 7. Refresh the relevant pages after successful upload.
    if (result.success) {
      revalidatePath("/grades");
      revalidatePath("/my-grades");
    }

    return {
      success: result.success,
      message: result.message,
      savedCount: result.savedCount,
    };

  } catch (error) {
    console.error("Upload grades action error:", error);

    return {
      success: false,
      message: "Unable to upload grades. Please try again.",
    };
  }
}
