
import { redirect } from "next/navigation";
import { listCourses } from "@/src/libs/courses-client";
import { getSession } from "@/src/libs/session";
import {
  CourseStatus,
  courseStatusToJSON,
} from "@/src/generated/courses";

// Client component responsible for handling course enrollment.
import EnrollButton from "@/src/components/courses/enroll-button";

// Server Component responsible for displaying available courses.
export const instant = false;

export default async function CoursesPage() {
  // Retrieves the currently logged-in user's session.
  const session = await getSession();

  // Redirects unauthenticated users to the login page.
  if (!session) {
    redirect("/login");
  }

  // Stores the courses retrieved from the Courses Node.
  let courses: Awaited<ReturnType<typeof listCourses>>["courses"] = [];

  // Stores an error message if the Courses Node is unavailable.
  let error: string | null = null;

  try {
    // Requests only courses that are currently open for enrollment.
    const result = await listCourses(true);
    courses = result.courses;
  } catch (cause) {
    // Logs the error on the server for debugging.
    console.error("gRPC ListOpenCourses failed:", cause);

    // Displays a friendly message if the Courses Node cannot be reached.
    error = "Courses service unavailable. Please try again later.";
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
            Available Courses
          </h1>

          <p className="mt-3 text-green-100">
            Explore available courses and find classes to enroll in.
          </p>
        </section>

        {/* Course Information */}
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Course Catalog
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Welcome, {session.username}. Here are the open courses.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-600" />
            Open Courses
          </span>
        </section>

        {/* Error Message */}
        {error ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
              ⚠️
            </div>

            <h2 className="mt-4 text-lg font-bold text-gray-800">
              Unable to Load Courses
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>
          </section>
        ) : courses.length > 0 ? (
          <>
            {/* Displays the total number of available courses. */}
            <p className="text-sm text-gray-500">
              {courses.length} course(s) found
            </p>

            {/* Displays the available courses as individual cards. */}
            <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                // Checks whether the course is open for enrollment.
                const isOpen = course.status === CourseStatus.OPEN;

                return (
                  <article
                    key={course.courseId}
                    className="group rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
                        📚
                      </div>

                      {/* Displays the current status of the course. */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isOpen
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {course.status === CourseStatus.OPEN
                          ? "OPEN"
                          : courseStatusToJSON(course.status)}
                      </span>
                    </div>

                    {/* Displays the course name. */}
                    <h3 className="mt-5 text-lg font-bold text-gray-800 group-hover:text-green-700">
                      {course.courseName}
                    </h3>

                    {/* Displays the unique course ID. */}
                    <p className="mt-2 text-sm text-gray-500">
                      Course ID: {course.courseId}
                    </p>

                    <div className="mt-6 border-t border-gray-100 pt-4">
                      {/* Displays whether the course is available for enrollment. */}
                      <p className="text-sm font-medium text-green-700">
                        {isOpen
                          ? "Available for enrollment"
                          : "Not currently open"}
                      </p>

                      {/* Displays the Enroll button only when the course is open. */}
                      {isOpen && (
                        <EnrollButton courseId={Number(course.courseId)} />
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : (
          /* Empty State */
          <section className="rounded-2xl border border-green-100 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              📚
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-800">
              No Open Courses Yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no available courses for enrollment.
              Please check again later.
            </p>
          </section>
        )}

      </div>
    </main>
  );
}
