import { getGrades } from "@/src/libs/grades-client";
import { todo } from "node:test";

export async function StudentGrades() {
  let grades: Awaited<ReturnType<typeof getGrades>>["grades"] = [];
  let error: string | null = null;

  try {
    const response = await getGrades();
    grades = response.grades;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load grades.";
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Course ID</th>
          <th>Contact</th>
          <th>Country</th>
        </tr>
      </thead>
      <tbody>
        {grades.length === 0 ? (
          <tr>
            <td colSpan={3}>No grades available.</td>
          </tr>
        ) : (
          grades.map((grade) => (
            <tr key={grade.courseId}>
              <td>{grade.courseId}</td>
              <td>{grade.courseName}</td>
              <td>{grade.grade}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export async function TeacherGrades(){
    todo
}