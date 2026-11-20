
"use client";

import { useState, type FormEvent } from "react";
import { uploadGradesAction } from "@/src/app/actions/upload-grades";
import { getEnrolledStudentsAction } from "@/src/app/actions/get-enrolled-students";

interface CourseOption {
  courseId: number;
  courseName: string;
  status: number;
}

interface StudentOption {
  username: string;
}

interface GradeEntry {
  id: number;
  studentUsername: string;
  grade: string;
}

interface TeacherGradeManagerProps {
  courses: CourseOption[];
}

const GRADE_OPTIONS = [
  "4.0",
  "3.5",
  "3.0",
  "2.5",
  "2.0",
  "1.5",
  "1.0",
  "0.5",
  "0.0",
];

export default function TeacherGradeManager({
  courses,
}: TeacherGradeManagerProps) {
  const [courseId, setCourseId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedCourse = courses.find(
    (course) => String(course.courseId) === courseId
  );

  // --------------------------------------------------
  // Load Enrolled Students When Course Changes
  // --------------------------------------------------

  async function handleCourseChange(value: string) {
    setCourseId(value);

    // Reset previous selections and entries.
    setStudents([]);
    setEntries([]);
    setSelectedStudent("");
    setSelectedGrade("");
    setMessage("");
    setSuccess(false);

    if (!value) {
      return;
    }

    setLoadingStudents(true);

    try {
      const result = await getEnrolledStudentsAction(Number(value));

      if (!result.success) {
        setMessage(result.message);
        setSuccess(false);
        return;
      }

      setStudents(result.students);
    } catch (error) {
      console.error("Error loading enrolled students:", error);
      setMessage("Unable to load enrolled students.");
      setSuccess(false);
    } finally {
      setLoadingStudents(false);
    }
  }

  // --------------------------------------------------
  // Add Student Grade to the List
  // --------------------------------------------------

  function addStudentGrade() {
    setMessage("");
    setSuccess(false);

    if (!courseId) {
      setMessage("Please select a course.");
      return;
    }

    if (!selectedStudent) {
      setMessage("Please select a student.");
      return;
    }

    if (!selectedGrade) {
      setMessage("Please select a grade.");
      return;
    }

    const alreadyAdded = entries.some(
      (entry) => entry.studentUsername === selectedStudent
    );

    if (alreadyAdded) {
      setMessage("This student has already been added.");
      return;
    }

    setEntries((current) => [
      ...current,
      {
        id: Date.now(),
        studentUsername: selectedStudent,
        grade: selectedGrade,
      },
    ]);

    setSelectedStudent("");
    setSelectedGrade("");
  }

  // --------------------------------------------------
  // Remove Student Grade
  // --------------------------------------------------

  function removeStudentGrade(id: number) {
    setEntries((current) =>
      current.filter((entry) => entry.id !== id)
    );
  }

  // --------------------------------------------------
  // Upload Grades
  // --------------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!courseId) {
      setMessage("Please select a course.");
      return;
    }

    if (entries.length === 0) {
      setMessage("Please add at least one student grade.");
      return;
    }

    setLoading(true);

    try {
      const result = await uploadGradesAction(
        Number(courseId),
        entries.map((entry) => ({
          studentUsername: entry.studentUsername,
          grade: Number(entry.grade),
        }))
      );

      setSuccess(result.success);
      setMessage(result.message);

      if (result.success) {
        setEntries([]);
        setSelectedStudent("");
        setSelectedGrade("");
      }
    } catch (error) {
      console.error("Grade upload error:", error);
      setSuccess(false);
      setMessage("Something went wrong while uploading grades.");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // User Interface
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-green-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
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

        {/* Grade Management Form */}
        <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">

          <div className="border-b border-green-100 p-6">
            <h2 className="text-xl font-bold text-gray-800">
              Upload Student Grades
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select a course, choose an enrolled student, and assign a grade.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">

            {/* Course Selection */}
            <div>
              <label
                htmlFor="course"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Select Course
              </label>

              <select
                id="course"
                value={courseId}
                onChange={(event) => handleCourseChange(event.target.value)}
                disabled={loading || loadingStudents}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              >
                <option value="">Choose a course...</option>

                {courses.map((course) => (
                  <option
                    key={course.courseId}
                    value={course.courseId}
                  >
                    {course.courseName} (ID: {course.courseId}) -{" "}
                    {course.status === 1 ? "OPEN" : "CLOSED"}
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <p className="mt-2 text-sm text-green-700">
                  Selected: {selectedCourse.courseName}
                </p>
              )}
            </div>

            {/* Student and Grade Selection */}
            <section className="rounded-xl border border-green-100 p-5 space-y-5">

              <div>
                <h3 className="font-bold text-green-900">
                  Add Student Grade
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Select a student enrolled in the selected course.
                </p>
              </div>

              {/* Student Dropdown */}
              <div>
                <label
                  htmlFor="student"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Select Student
                </label>

                <select
                  id="student"
                  value={selectedStudent}
                  onChange={(event) =>
                    setSelectedStudent(event.target.value)
                  }
                  disabled={
                    !courseId ||
                    loadingStudents ||
                    loading ||
                    students.length === 0
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingStudents
                      ? "Loading students..."
                      : !courseId
                        ? "Select a course first"
                        : students.length === 0
                          ? "No enrolled students found"
                          : "Choose a student..."}
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.username}
                      value={student.username}
                    >
                      {student.username}
                    </option>
                  ))}
                </select>

                {courseId && !loadingStudents && (
                  <p className="mt-2 text-xs text-gray-500">
                    {students.length} enrolled student(s) found
                  </p>
                )}
              </div>

              {/* Grade Dropdown */}
              <div>
                <label
                  htmlFor="grade"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Select Grade
                </label>

                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(event) =>
                    setSelectedGrade(event.target.value)
                  }
                  disabled={!selectedStudent || loading}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                >
                  <option value="">Choose a grade...</option>

                  {GRADE_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  Allowed grades: 0.0 to 4.0 in 0.5 increments.
                </p>
              </div>

              {/* Add Student Grade Button */}
              <button
                type="button"
                onClick={addStudentGrade}
                disabled={loading || loadingStudents}
                className="w-full rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Student Grade
              </button>
            </section>

            {/* Student Grade List */}
            <section className="overflow-hidden rounded-xl border border-green-100">

              <div className="flex items-center justify-between bg-green-50 p-4">
                <div>
                  <h3 className="font-bold text-green-900">
                    Students to Receive Grades
                  </h3>

                  <p className="mt-1 text-xs text-gray-600">
                    Review the grades before uploading.
                  </p>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  {entries.length} student(s)
                </span>
              </div>

              {entries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No students added yet.
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Select a student and grade above, then click Add Student Grade.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">

                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-400">
                          STUDENT {index + 1}
                        </p>

                        <p className="mt-1 font-semibold text-gray-800">
                          {entry.studentUsername}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">

                        <span className="rounded-lg bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                          Grade: {entry.grade}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeStudentGrade(entry.id)}
                          disabled={loading}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                </div>
              )}
            </section>

            {/* Feedback Message */}
            {message && (
              <div
                className={`rounded-xl border p-4 text-sm font-medium ${
                  success
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
                role="status"
              >
                {message}
              </div>
            )}

            {/* Upload Grades */}
            <div className="flex justify-end border-t border-gray-100 pt-6">
              <button
                type="submit"
                disabled={loading || entries.length === 0}
                className="flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Upload Grades
                  </>
                )}
              </button>
            </div>

          </form>
        </section>
      </div>
    </main>
  );
}
