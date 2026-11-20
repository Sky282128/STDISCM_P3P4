
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/src/libs/session";
import { listMyEnrollments } from "@/src/libs/enrollment-client";

// Server Component responsible for displaying the student's enrolled courses.
export const instant = false;

export default async function MyEnrollmentsPage() {
  // Retrieves the currently logged-in user's session.
  const session = await getSession();

  // Redirects unauthenticated users to the login page.
  if (!session) {
    redirect("/login");
  }

  // Stores the student's enrolled courses.
  let enrollments: Awaited<
    ReturnType<typeof listMyEnrollments>
  >["enrollments"] = [];

  // Stores an error message if the Enrollment Node is unavailable.
  let error: string | null = null;

  try {
    // Requests the logged-in student's enrollments through gRPC.
    const result = await listMyEnrollments();
    enrollments = result.enrollments;
  } catch (cause) {
    // Logs the error on the server for debugging.
    console.error("gRPC ListMyEnrollments failed:", cause);

    // Displays a friendly error message.
    error = "Unable to load your enrollments. Please try again later.";
  }

  return (
    <main className="min-h-screen bg-green-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Page Header */}
        <section className="rounded-2xl bg-green-800 p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-200">
            Student Portal
          </p>

          <h1 className="mt-3 text-3xl font-bold text-white">
            My Enrollments
          </h1>

          <p className="mt-3 text-green-100">
            View the courses you have successfully enrolled in.
          </p>
        </section>

        {/* Student Information */}
        <section>
          <h2 className="text-xl font-bold text-gray-800">
            Enrolled Courses
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Welcome, {session.username}. Here are your enrollments.
          </p>
        </section>

        {/* Error Message */}
        {error ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-800">
              Unable to Load Enrollments
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>
          </section>
        ) : enrollments.length > 0 ? (
          <>
            {/* Displays the total number of enrolled courses. */}
            <p className="text-sm text-gray-500">
              {enrollments.length} enrolled course(s)
            </p>

            {/* Displays each enrolled course as a card. */}
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <article
                  key={enrollment.courseId}
                  className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
                      📚
                    </div>

                    {/* Indicates that the student is enrolled. */}
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      ENROLLED
                    </span>
                  </div>

                  {/* Displays the enrolled course name. */}
                  <h3 className="mt-5 text-lg font-bold text-gray-800">
                    {enrollment.courseName}
                  </h3>

                  {/* Displays the course ID. */}
                  <p className="mt-2 text-sm text-gray-500">
                    Course ID: {enrollment.courseId}
                  </p>
                </article>
              ))}
            </section>
          </>
        ) : (
          /* Empty State when the student has no enrollments. */
          <section className="rounded-2xl border border-green-100 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              📚
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-800">
              No Enrollments Yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              You have not enrolled in any courses yet.
            </p>

            <Link
              href="/courses"
              className="mt-5 inline-block rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
            >
              Browse Courses
            </Link>
          </section>
        )}

      </div>
    </main>
  );
}
