'use server';

import { cookies } from 'next/headers';
import { authenticateUser, logoutUser, registerUser } from '@/src/libs/login-register-client';
import { Role } from '@/src/generated/login-register';

export async function loginAction(username: string, password: string) {
  try {
    const result = await authenticateUser({ username, password });

    if (result.authenticated && result.token) {
      const cookieStore = await cookies();
      cookieStore.set('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour (match expires_minutes in config.ini)
      });
    }

    return {
      authenticated: result.authenticated,
      role: result.role,
    };
  } catch (error) {
    console.error('gRPC Authenticate failed:', error);
    return {
      authenticated: false,
      role: Role.UNSPECIFIED,
      error: 'Authentication service unavailable',
    };
  }
}

export async function registerAction(
  username: string,
  password: string,
  role: Role
) {
  try {
    const result = await registerUser({ username, password, role });
    return { success: result.success };
  } catch (error) {
    console.error('gRPC Register failed:', error);
    return { success: false, error: 'Registration service unavailable' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (token) {
    try {
      await logoutUser({ token });
    } catch (error) {
      console.error('gRPC Logout failed:', error);
    }
  }
  cookieStore.delete('auth_token');
}