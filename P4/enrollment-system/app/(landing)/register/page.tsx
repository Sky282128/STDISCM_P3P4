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
      redirect('/');
    }
  }

  return (
    <main className="p-8">
      <section>
        <form action={handleRegister}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            required
          />
          <br />
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
          <br />
          <label htmlFor="role">Choose a role:</label>
          <select id="role" name="role" required>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
          </select>
          <br />
          <button type="submit">Register</button>
        </form>
      </section>
    </main>
  );
}