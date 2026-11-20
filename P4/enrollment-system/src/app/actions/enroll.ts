
"use server";

// Imports the function that communicates with the Enrollment Node through gRPC.
import { enrollInCourse } from "@/src/libs/enrollment-client";

// Imports revalidatePath to refresh the page after a successful enrollment.
import { revalidatePath } from "next/cache";

// Server action responsible for enrolling a student in a selected course.
export async function enrollAction(courseId: number) {
  try {
    // Sends the selected course ID to the Enrollment Node.
    const result = await enrollInCourse(courseId);

    // Checks whether the Enrollment Node successfully processed the enrollment.
    if (!result.success) {
      return {
        success: false,
        message: result.message || "Enrollment failed.",
      };
    }

    // Refreshes the Courses page so the latest enrollment information can be displayed.
    revalidatePath("/courses");

    // Returns a success response to the frontend.
    return {
      success: true,
      message: result.message || "Successfully enrolled!",
    };
  } catch (error) {
    // Logs the error on the server for debugging.
    console.error("Enrollment failed:", error);

    // Returns an error message if the Enrollment Node is unavailable or the request fails.
    return {
      success: false,
      message: "Unable to enroll. Please check if the Enrollment Node is running.",
    };
  }
}
