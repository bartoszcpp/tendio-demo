'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, verifyCredentials, SESSION_COOKIE } from '@/lib/auth';

export type LoginState = { error: string | null };

export const login = async (_prev: LoginState, formData: FormData): Promise<LoginState> => {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) return { error: 'Podaj login i hasło.' };
  if (!verifyCredentials(username, password)) return { error: 'Nieprawidłowy login lub hasło.' };

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(username), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect('/');
};

export const logout = async () => {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
};
