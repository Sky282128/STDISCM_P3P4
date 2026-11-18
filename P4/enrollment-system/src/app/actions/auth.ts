'use server';

import { authenticateUser, registerUser } from '@/src/libs/login-register-client';
import { Role } from '@/src/generated/login-register';

export async function loginAction(username: string, password: string) {
  try {
    const result = await authenticateUser({ username, password });
    return {
      authenticated: result.authenticated,
      role: result.role, // Numeric Role enum (Role.STUDENT = 1, Role.TEACHER = 2)
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