
import { Suspense } from "react";
import { connection } from "next/server";
import { StudentGrades } from "@/src/components/grades/grades";

async function DynamicGrades() {
  // Wait for an actual request before calling gRPC.
  await connection();

  return <StudentGrades />;
}

export default function MyGradesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-green-50 p-10 text-center">
          <p className="font-semibold text-green-800">
            Loading your grades...
          </p>
        </div>
      }
    >
      <DynamicGrades />
    </Suspense>
  );
}
