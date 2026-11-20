
import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/src/libs/session";
import { logoutAction } from "@/src/app/actions/auth";
import { redirect } from "next/navigation";

async function HomeContent() {
  const session = await getSession();

  async function handleLogout() {
    "use server";
    await logoutAction();
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <section className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-10 border border-green-100 text-center">
        <h1 className="text-3xl font-bold text-green-800 mb-3">
          Student Management System
        </h1>

        <p className="text-gray-600 mb-8">
          Welcome! Please login or register to continue.
        </p>

        {session ? (
          <div className="space-y-5">
            <p className="text-gray-700">
              Signed in as{" "}
              <span className="font-semibold">{session.username}</span>
            </p>

            <Link
              href="/courses"
              className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              View Courses
            </Link>

            <form action={handleLogout}>
              <button
                type="submit"
                className="w-full border border-green-700 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-lg transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="block w-full border-2 border-green-700 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-lg transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="text-center p-8">Loading...</p>}>
      <HomeContent />
    </Suspense>
  );
}
