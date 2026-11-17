import { redirect } from "next/navigation";

export default async function LoginPage() {
  return (
    <section>
        <form
            action = {async (FormData) => {
                'use server';
                // A login function will go here eventually
                redirect('/');
            }}
        >
            <input type="username" placeholder="Username" /><br/>
            <input type="password" placeholder="••••••••" /><br/>
            <button type="submit">Login</button>
        </form>
    </section>
  );
}