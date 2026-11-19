import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/src/app/actions/auth';
import { listCourses } from '@/src/libs/courses-client';
import { getSession } from '@/src/libs/session';
import { CourseStatus, courseStatusToJSON } from '@/src/generated/courses';

export const instant = false;

export default async function CoursesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  async function handleLogout() {
    'use server';
    await logoutAction();
    redirect('/login');
  }

  let courses: Awaited<ReturnType<typeof listCourses>>["courses"] = [];
  let error: string | null = null;

  try {
    const result = await listCourses(true);
    courses = result.courses;
  } catch (cause) {
    console.error('gRPC ListOpenCourses failed:', cause);
    error = 'Courses service unavailable';
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Available Courses</h1>
      <p>Signed in as {session.username}</p>

      {error ? (
        <p role="alert">{error}</p>
      ) : courses?.length ? (
        <ul>
          {courses.map((course) => (
            <li key={course.courseId}>
              {course.courseName}
              {' — '}
              {course.status === CourseStatus.OPEN
                ? 'OPEN'
                : courseStatusToJSON(course.status)}
              {<Link href=''></Link>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No open courses are available.</p>
      )}

      <Link href="/dashboard">Home</Link>
      <br />
      <form action={handleLogout}>
        <button type="submit">Logout</button>
      </form>
    </main>
  );
}
