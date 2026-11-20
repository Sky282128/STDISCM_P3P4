
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";

import { redirect } from "next/navigation";
import { getSession } from "@/src/libs/session";
import Sidebar from "@/src/components/side-bar/sidebar";

// Allows this authenticated layout to wait for request-time session data.
export const instant = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student Enrollment Portal",
  description: "Online Student Enrollment System",
};

// Protects the main application routes by checking the user's session.
export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  // Retrieves and verifies the authentication cookie.
  const session = await getSession();

  // Redirects users who are not authenticated to the login page.
  if (!session) {
    redirect("/login");
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1">
          {/* Displays navigation based on the authenticated user's role. */}
          <Sidebar role={session.role} />

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
