import { redirect } from "next/navigation";
import { loginAction } from "@/src/app/actions/auth";
import { Role } from '@/src/generated/login-register';

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    'use server';

    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

    const result = await loginAction(username, password);

    if (result.authenticated) {
      // Optional: redirect based on the returned Role enum
      if (result.role === Role.TEACHER) {
        redirect('/teacher');
      }
      redirect('/');
    }
  }

  return (
    <main className="p-8">
      <section>
        <form action={handleLogin}>
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
          <button type="submit">Login</button>
        </form>
      </section>
    </main>
  );
}