import { redirect } from "next/navigation";

export default function RegisterPage() {
  return (
    <main className="p-8">
            <section>
                <form
                    action = {async (FormData) => {
                        'use server';
                        // A register function will go here eventually
                        redirect('/');
                    }}
                >
                    <input type="username" placeholder="Username" /><br/>
                    <input type="password" placeholder="••••••••" /><br/>
                    <label htmlFor="role">Choose a role:</label>

                    <select id="role" name="role" required>
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                    </select>

                    <br/>

                    <button type="submit">Register</button>
                </form>
            </section>
    </main>
  );
}