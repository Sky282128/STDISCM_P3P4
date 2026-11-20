
import { Suspense } from "react";
import { connection } from "next/server";

import { getMyGrades } from "@/src/libs/grades-client";
import { listCourses } from "@/src/libs/courses-client";

import TeacherGradeManager from "./teacher-grade-manager";

interface CourseOption {
  courseId: number;
  courseName: string;
  status: number;
}

// ==========================================
// STUDENT GRADES CONTENT
// ==========================================

async function StudentGradesContent() {
  let grades: Awaited<ReturnType<typeof getMyGrades>> = [];
  let error: string | null = null;

  try {
    grades = await getMyGrades();
  } catch (err) {
    console.error("Failed to load student grades:", err);

    error =
      err instanceof Error
        ? err.message
        : "Failed to load grades.";
  }

  return (
    <main className="min-h-screen bg-green-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-green-800 p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-200">
            Student Portal
          </p>

          <h1 className="mt-3 text-3xl font-bold text-white">
            My Grades
          </h1>

          <p className="mt-3 text-green-100">
            View your academic performance and previous grades.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
          <div className="border-b border-green-100 p-6">
            <h2 className="text-xl font-bold text-gray-800">
              Academic Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your recorded course grades.
            </p>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-red-600">
                Unable to Load Grades
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {error}
              </p>
            </div>
          ) : grades.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl">🎓</div>

              <h3 className="mt-4 font-bold text-gray-800">
                No Grades Available
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Your grades will appear here once they are uploaded.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-green-50 text-sm text-green-900">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Course ID
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Course Name
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Grade
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {grades.map((grade) => (
                    <tr
                      key={grade.courseId}
                      className="transition hover:bg-green-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {grade.courseId}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {grade.courseName}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                          {grade.grade.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ==========================================
// STUDENT GRADES PAGE
// ==========================================

export function StudentGrades() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-green-50 p-6 md:p-10">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">🎓</div>

            <p className="mt-4 font-semibold text-green-800">
              Loading your grades...
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Please wait while we retrieve your academic records.
            </p>
          </div>
        </main>
      }
    >
      <StudentGradesContent />
    </Suspense>
  );
}

// ==========================================
// TEACHER GRADES CONTENT
// ==========================================

async function TeacherGradesContent() {
  let courses: CourseOption[] = [];
  let error: string | null = null;

  await connection();

  try {
    const response = await listCourses(false);

    courses = response.courses.map((course) => ({
      courseId: course.courseId,
      courseName: course.courseName,
      status: course.status,
    }));
  } catch (err) {
    console.error("Failed to load courses:", err);

    error =
      err instanceof Error
        ? err.message
        : "Unable to load courses.";
  }

  if (error) {
    return (
      <main className="min-h-screen bg-green-50 p-6 md:p-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-2xl bg-green-800 p-8 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-widest text-green-200">
              Faculty Portal
            </p>

            <h1 className="mt-3 text-3xl font-bold text-white">
              Grade Management
            </h1>

            <p className="mt-3 text-green-100">
              Manage and upload student academic grades.
            </p>
          </section>

          <section className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <h2 className="font-bold text-red-600">
              Unable to Load Courses
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return <TeacherGradeManager courses={courses} />;
}

// ==========================================
// TEACHER GRADE MANAGEMENT PAGE
// ==========================================

export function TeacherGrades() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-green-50 p-6 md:p-10">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">📝</div>

            <p className="mt-4 font-semibold text-green-800">
              Loading Grade Management...
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Retrieving available courses.
            </p>
          </div>
        </main>
      }
    >
      <TeacherGradesContent />
    </Suspense>
  );
}
