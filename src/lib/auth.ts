import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'tendio_session';
export const AI_LIMIT = 3;

type DemoCredential = { username: string; password: string };

const parseUsers = (): DemoCredential[] =>
  (process.env.DEMO_USERS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(':');
      if (separator === -1) return null;
      return {
        username: entry.slice(0, separator).trim(),
        password: entry.slice(separator + 1),
      };
    })
    .filter((user): user is DemoCredential => Boolean(user?.username && user.password));

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Brak zmiennej AUTH_SECRET.');
  return secret;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sign = async (value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toHex(signature);
};

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const verifyCredentials = (username: string, password: string) =>
  parseUsers().some((user) => safeEqual(user.username, username) && safeEqual(user.password, password));

export const createSessionToken = async (username: string) => `${username}.${await sign(username)}`;

const verifySessionToken = async (token: string | undefined): Promise<string | null> => {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator === -1) return null;

  const username = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!parseUsers().some((user) => user.username === username)) return null;

  const expected = await sign(username);
  return safeEqual(signature, expected) ? username : null;
};

export const getCurrentUser = async (): Promise<string | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
};

export const getRemainingAiUses = async (username: string) => {
  const user = await prisma.demoUser.findUnique({ where: { username } });
  return Math.max(0, AI_LIMIT - (user?.aiUses ?? 0));
};

export const consumeAiUse = async (username: string) => {
  await prisma.demoUser.upsert({
    where: { username },
    create: { username, aiUses: 0 },
    update: {},
  });

  const reserved = await prisma.demoUser.updateMany({
    where: { username, aiUses: { lt: AI_LIMIT } },
    data: { aiUses: { increment: 1 } },
  });

  return reserved.count > 0;
};

export const releaseAiUse = async (username: string) => {
  await prisma.demoUser.updateMany({
    where: { username, aiUses: { gt: 0 } },
    data: { aiUses: { decrement: 1 } },
  });
};
