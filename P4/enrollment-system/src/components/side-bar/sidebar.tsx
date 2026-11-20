
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/src/app/actions/logout";

// Defines the properties received by the Sidebar component.
interface SidebarProps {
  role: number;
}

// Numeric role values from login-register.proto.
// STUDENT = 1 and TEACHER = 2.
const STUDENT_ROLE = 1;
const TEACHER_ROLE = 2;

// Navigation links for student accounts.
const studentNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Courses", href: "/courses", icon: "📚" },
  { name: "My Enrollments", href: "/my-enrollments", icon: "📝" },
  { name: "My Grades", href: "/my-grades", icon: "📊" },
];

// Navigation links for teacher accounts.
const teacherNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Grade Management", href: "/grades", icon: "📋" },
];

// Displays navigation links based on the logged-in user's role.
export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // Controls whether the mobile sidebar is open or closed.
  const [isOpen, setIsOpen] = useState(false);

  // Select navigation links based on the user's role.
  const navItems =
    role === TEACHER_ROLE ? teacherNavItems : studentNavItems;

  // Displays the appropriate portal title.
  const portalTitle =
    role === TEACHER_ROLE ? "Faculty Portal" : "Student Portal";

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-green-700 p-3 text-white shadow-md hover:bg-green-800 md:hidden"
        aria-label="Open sidebar"
      >
        ☰
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-green-100 bg-white shadow-sm transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo / Branding */}
        <div className="flex h-20 items-center justify-between border-b border-green-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-xl text-white">
              🎓
            </div>

            <div>
              <h1 className="text-lg font-bold text-green-800">
                MyApp
              </h1>
              <p className="text-xs text-gray-500">
                {portalTitle}
              </p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-green-50 hover:text-green-700 md:hidden"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Main Menu
          </p>

          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-green-100 text-green-800 shadow-sm"
                    : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>

                {/* Active Page Indicator */}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="space-y-3 border-t border-green-100 p-4">
          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              {portalTitle}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Manage your academic journey.
            </p>
          </div>

          {/* Logout Button */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
