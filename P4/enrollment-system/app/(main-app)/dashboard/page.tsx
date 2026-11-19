import { getSession } from "@/src/libs/session";
import { redirect } from "next/navigation";
import { Role } from '@/src/generated/login-register';
import  { StudentDashboard, TeacherDashboard }  from '@/src/components/dashboard/dashboard'

export default async function DashboardPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }
    const isTeacher = session.role === Role.TEACHER

    if (isTeacher) {
        return(
            <TeacherDashboard />
        );
    } else {
        return (
            <StudentDashboard />
        );
    }
}