// Edge-safe JWT helpers (jose only) -- imported by proxy.ts and by auth.ts.
import { SignJWT, jwtVerify } from 'jose';
import { required } from './config';

export type Role = 'patient' | 'admin';
export type SessionUser = { id: number; role: Role; name: string };

export const COOKIE_NAME = 'session';
export const SESSION_SECONDS = 8 * 60 * 60;

function secret(): Uint8Array {
  const s = required('JWT_SECRET');
  if (s.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret());
}

/** Returns the session user, or null for any invalid / expired / tampered / wrongly signed token. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    const role = payload.role;
    if (!Number.isInteger(id) || (role !== 'patient' && role !== 'admin')) return null;
    return { id, role, name: String(payload.name ?? '') };
  } catch {
    return null;
  }
}
