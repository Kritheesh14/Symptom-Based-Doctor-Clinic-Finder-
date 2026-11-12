import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, verifySession } from '@/lib/jwt';

// Page-level guard (a convenience). Every API route still calls requireRole() itself.
const PATIENT_PAGES = ['/symptom-check', '/book', '/appointments', '/prescriptions'];
const SHARED_PAGES = ['/doctors'];

const matches = (path: string, bases: string[]) => bases.some((b) => path === b || path.startsWith(`${b}/`));

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdminArea = matches(pathname, ['/admin']);
  if (!isAdminArea && !matches(pathname, PATIENT_PAGES) && !matches(pathname, SHARED_PAGES)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (isAdminArea && session.role !== 'admin') return NextResponse.redirect(new URL('/', req.url));
  if (matches(pathname, PATIENT_PAGES) && session.role !== 'patient') return NextResponse.redirect(new URL('/admin', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/symptom-check/:path*', '/book/:path*', '/appointments/:path*', '/prescriptions/:path*', '/doctors/:path*', '/admin/:path*'],
};
