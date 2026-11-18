import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { Role } from '@/src/generated/login-register';

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: Role;
  iat: number;
  exp: number;
}

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getSession(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    return payload as unknown as AuthTokenPayload;
  } catch (error) {
    // Token is expired, malformed, or has an invalid signature
    return null;
  }
}