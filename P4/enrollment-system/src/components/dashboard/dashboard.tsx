
import Link from "next/link";

export function StudentDashboard() {
  return (
    <main className="min-h-screen bg-green-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Welcome Banner */}
        <section className="rounded-2xl bg-green-800 p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-200">
            Student Portal
          </p>

          <h1 className="mt-3 text-3xl font-bold text-white">
            Welcome back, Student!
          </h1>

          <p className="mt-3 text-green-100">
            Manage your courses, enrollment, and academic records.
          </p>
        </section>

        {/* Dashboard Heading */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800">
            Your Dashboard
          </h2>
          <p className="mt-1 text-gray-500">
            Everything you need for your academic journey.
          </p>
        </section>

        {/* Dashboard Cards */}
        <section className="grid gap-6 md:grid-cols-2">

          {/* Available Courses */}
          <Link
            href="/courses"
            className="group rounded-2xl border border-green-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-3xl">
              📚
            </div>

            <h3 className="mt-5 text-xl font-bold text-gray-800 group-hover:text-green-700">
              Available Courses
            </h3>

            <p className="mt-2 leading-relaxed text-gray-500">
              Browse available courses and enroll in open classes.
            </p>

            <div className="mt-6 flex items-center justify-between">
              <span className="font-semibold text-green-700">
                Explore Courses
              </span>
              <span className="text-green-700 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>

          {/* My Grades */}
          <Link
            href="/my-grades"
            className="group rounded-2xl border border-green-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-3xl">
              🎓
            </div>

            <h3 className="mt-5 text-xl font-bold text-gray-800 group-hover:text-green-700">
              My Grades
            </h3>

            <p className="mt-2 leading-relaxed text-gray-500">
              View your previous grades and academic performance.
            </p>

            <div className="mt-6 flex items-center justify-between">
              <span className="font-semibold text-green-700">
                View Grades
              </span>
              <span className="text-green-700 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>

        </section>

        {/* Information Section */}
        <section className="rounded-2xl border border-green-100 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <span className="text-xl">ℹ️</span>
            </div>

            <h2 className="text-lg font-bold text-gray-800">
              Academic Portal
            </h2>
          </div>

          <p className="mt-3 leading-relaxed text-gray-500">
            Use this dashboard to access your courses, manage your
            enrollment, and review your academic records.
          </p>
        </section>

      </div>
    </main>
  );
}

export function TeacherDashboard() {
  return (
    <main className="min-h-screen bg-green-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Welcome Banner */}
        <section className="rounded-2xl bg-green-800 p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-200">
            Faculty Portal
          </p>

          <h1 className="mt-3 text-3xl font-bold text-white">
            Welcome back, Teacher!
          </h1>

          <p className="mt-3 text-green-100">
            Manage courses and student academic records.
          </p>
        </section>

        {/* Dashboard Heading */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800">
            Faculty Dashboard
          </h2>

          <p className="mt-1 text-gray-500">
            Access your teaching and academic management tools.
          </p>
        </section>

        {/* Faculty Cards */}
        <section className="grid gap-6 md:grid-cols-2">

          {/* Grade Management */}
          <Link
            href="/grades"
            className="group rounded-2xl border border-green-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-3xl">
              📝
            </div>

            <h3 className="mt-5 text-xl font-bold text-gray-800 group-hover:text-green-700">
              Grade Management
            </h3>

            <p className="mt-2 leading-relaxed text-gray-500">
              Access student grade management.
            </p>

            <p className="mt-6 font-semibold text-green-700">
              Manage Grades →
            </p>
          </Link>

        </section>

        {/* Information Section */}
        <section className="rounded-2xl border border-green-100 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">
            Faculty Information
          </h2>

          <p className="mt-3 leading-relaxed text-gray-500">
            Use the faculty portal to manage student academic records.
          </p>
        </section>

      </div>
    </main>
  );
}
