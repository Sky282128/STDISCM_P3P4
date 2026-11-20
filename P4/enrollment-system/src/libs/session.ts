
import "server-only";

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Role } from "@/src/generated/login-register";

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: Role;
  iat: number;
  exp: number;
}

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET
);

function normalizeRole(role: unknown): Role | null {
  if (role === "TEACHER" || role === Role.TEACHER) {
    return Role.TEACHER;
  }

  if (role === "STUDENT" || role === Role.STUDENT) {
    return Role.STUDENT;
  }

  return null;
}

export async function getSession(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const role = normalizeRole(payload.role);

    if (!role || !payload.sub || !payload.username) {
      return null;
    }

    return {
      sub: String(payload.sub),
      username: String(payload.username),
      role,
      iat: Number(payload.iat),
      exp: Number(payload.exp),
    };

  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}
