
import { redirect } from "next/navigation";
import { registerAction } from "@/src/app/actions/auth";
import { Role } from '@/src/generated/login-register';

export default function RegisterPage() {
  async function handleRegister(formData: FormData) {
    'use server';

    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');
    const rawRole = formData.get('role');

    const role = rawRole === 'teacher' ? Role.TEACHER : Role.STUDENT;

    const result = await registerAction(username, password, role);

    if (result.success) {
      redirect('/login');
    }
  }

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-green-100">
        <form action={handleRegister} className="space-y-5">
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

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Choose a role:
            </label>

            <select
              id="role"
              name="role"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
            >
              <option value="student">student</option>
              <option value="teacher">teacher</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Register
          </button>
        </form>
      </section>
    </main>
  );
}
