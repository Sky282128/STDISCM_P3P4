import { getSession } from "@/src/libs/session";
import { redirect } from "next/navigation";
import { Role } from '@/src/generated/login-register';
import { todo } from "node:test";

export default async function DashboardPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }
    const isTeacher = session.role === Role.TEACHER

    if (isTeacher) {
        return(
            // Teacher view here
            todo
        );
    } else {
        return (
            // Student view here
            todo
        );
    }
}