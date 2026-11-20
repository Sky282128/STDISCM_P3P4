
"use client";

import { useState, useTransition } from "react";
import { enrollAction } from "@/src/app/actions/enroll";

interface EnrollButtonProps {
  courseId: number;
}

// Client component responsible for handling the student's enrollment interaction.
export default function EnrollButton({ courseId }: EnrollButtonProps) {
  // Stores the success or error message returned by the server action.
  const [message, setMessage] = useState("");

  // Tracks whether the enrollment request is currently processing.
  const [isPending, startTransition] = useTransition();

  // Calls the server action to enroll the student in the selected course.
  function handleEnroll() {
    setMessage("");

    startTransition(async () => {
      // Sends the selected course ID to the server action.
      const result = await enrollAction(courseId);

      // Displays the result returned by the Enrollment Node.
      setMessage(result.message);
    });
  }

  return (
    <div className="mt-4">
      {/* Enrollment button is disabled while the request is processing. */}
      <button
        type="button"
        onClick={handleEnroll}
        disabled={isPending}
        className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Enrolling..." : "Enroll Now"}
      </button>

      {/* Displays the enrollment result to the student. */}
      {message && (
        <p className="mt-3 text-sm text-gray-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
