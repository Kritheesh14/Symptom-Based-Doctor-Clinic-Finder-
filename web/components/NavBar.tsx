import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';
 
const PATIENT_LINKS = [
  { href: '/symptom-check', label: 'Check symptoms' },
  { href: '/doctors', label: 'Find a doctor' },
  { href: '/appointments', label: 'My appointments' },
  { href: '/prescriptions', label: 'Prescriptions' },
];
const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/doctors', label: 'Doctors' },
  { href: '/admin/clinics', label: 'Clinics' },
  { href: '/admin/specialities', label: 'Specialities' },
];
 
export async function NavBar() {
  const session = await getSession();
  const links = session?.role === 'admin' ? ADMIN_LINKS : session ? PATIENT_LINKS : [];
  return (
    <header className="border-b border-line bg-surface">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={session?.role === 'admin' ? '/admin' : '/'} className="font-display text-lg font-semibold text-brand">
          Symptom Finder
        </Link>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <li key={l.href}><Link className="text-muted hover:text-ink" href={l.href}>{l.label}</Link></li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {session ? (
            <>
              <span className="text-muted">{session.name} <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs text-brand-dark">{session.role}</span></span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="text-muted hover:text-ink" href="/login">Log in</Link>
              <Link className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark" href="/register">Create account</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
