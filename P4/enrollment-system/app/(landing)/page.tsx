import Link from "next/link";
import { getSession } from "@/src/libs/session";
import { logoutAction } from "@/src/app/actions/auth";
import { redirect } from "next/navigation";

export const instant = false;

export default async function HomePage() {
  const session = await getSession();

  async function handleLogout() {
    "use server";
    await logoutAction();
    redirect("/login");
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Student Management</h1>
      {session ? (
        <>
          <p>Signed in as {session.username}</p>
          <Link href="/courses">View Courses</Link>
          <br />
          <form action={handleLogout}>
            <button type="submit">Logout</button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <br />
          <Link href="/register">Register</Link>
        </>
      )}
    </main>
  );
}