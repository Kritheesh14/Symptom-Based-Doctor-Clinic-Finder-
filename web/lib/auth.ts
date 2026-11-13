import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AppError } from './errors';
import { COOKIE_NAME, SESSION_SECONDS, signSession, verifySession, type Role, type SessionUser } from './jwt';

export type { Role, SessionUser } from './jwt';

const COST = 10;
// Compared against when the e-mail is unknown so both failure paths take similar time.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', COST));

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(plain, hash ?? getDummyHash());
  return hash !== null && ok;
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}

/** 401 when not logged in, 403 when logged in with the wrong role. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AppError(401, 'Please log in.');
  if (!roles.includes(session.role)) throw new AppError(403, 'You do not have access to this resource.');
  return session;
}
