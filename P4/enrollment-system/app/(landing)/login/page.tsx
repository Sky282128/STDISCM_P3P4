
import { redirect } from "next/navigation";
import { loginAction } from "@/src/app/actions/auth";

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server';

    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

    const result = await loginAction(username, password);

    if (result.authenticated) {
      redirect('/dashboard');
    }
  }

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-green-100">
        <form action={handleLogin} className="space-y-5">
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />

          <input
            type="password"
            name="password"
            placeholder="••••••••"
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
          />

          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
