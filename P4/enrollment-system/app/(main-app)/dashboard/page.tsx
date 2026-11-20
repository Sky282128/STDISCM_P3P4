
import { getSession } from "@/src/libs/session";
import { redirect } from "next/navigation";
import { Role } from "@/src/generated/login-register";
import {
  StudentDashboard,
  TeacherDashboard,
} from "@/src/components/dashboard/dashboard";
import { Suspense } from "react";

async function DashboardContent() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === Role.TEACHER) {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-green-50 flex items-center justify-center">
          <p className="text-green-800 font-semibold">
            Loading dashboard...
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
