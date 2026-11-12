'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { api } from '@/lib/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'patient' | 'admin'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', { method: 'POST', json: { email, password, role } });
      const next = params.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : role === 'admin' ? '/admin' : '/symptom-check');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl">Log in</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">I am a</legend>
            <div className="inline-flex overflow-hidden rounded-md border border-line">
              {(['patient', 'admin'] as const).map((r) => (
                <label key={r} className={`cursor-pointer px-4 py-1.5 text-sm ${role === r ? 'bg-brand text-white' : 'bg-surface'}`}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                  {r === 'patient' ? 'Patient' : 'Admin'}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Email" htmlFor="email"><Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password" htmlFor="password"><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={busy} className="w-full">Log in</Button>
        </form>
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Demo accounts (seed data):{' '}
            <button type="button" className="underline" onClick={() => { setRole('patient'); setEmail('aarav.sharma@example.com'); setPassword('Patient@123'); }}>fill patient</button>
            {' · '}
            <button type="button" className="underline" onClick={() => { setRole('admin'); setEmail('admin@symptomfinder.example'); setPassword('Admin@123'); }}>fill admin</button>
          </div>
        )}
      </Card>
      <p className="mt-4 text-sm text-muted">New here? <Link className="text-brand underline" href="/register">Create a patient account</Link></p>
    </div>
  );
}
