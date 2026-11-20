
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutUser } from "@/src/libs/auth-client";

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  try {
    if (token) {
      const result = await logoutUser({ token });

      if (!result.success) {
        console.error("Logout failed:", result.message);
      }
    }
  } catch (error) {
    console.error("Logout service error:", error);
  } finally {
    cookieStore.delete("auth_token");
  }

  redirect("/");
}
