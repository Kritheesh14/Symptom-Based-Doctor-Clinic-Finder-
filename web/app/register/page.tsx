'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { api } from '@/lib/client';

// Client-side checks mirror the database CHECK constraints; the server and the database re-check everything.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[0-9+\- ]{7,20}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: '', age: '', contactInfo: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function validate() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (f.age && !(Number(f.age) >= 1 && Number(f.age) <= 129)) e.age = 'Age must be between 1 and 129';
    if (f.contactInfo && !PHONE.test(f.contactInfo)) e.contactInfo = 'Use 7-20 digits, spaces, + or -';
    if (!EMAIL.test(f.email)) e.email = 'Enter a valid email address';
    if (f.password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await api('/api/auth/register', { method: 'POST', json: { name: f.name, age: f.age || undefined, contactInfo: f.contactInfo || undefined, email: f.email, password: f.password } });
      router.push('/login');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl">Create a patient account</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="name" error={errors.name}><Input id="name" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age (optional)" htmlFor="age" error={errors.age}><Input id="age" inputMode="numeric" value={f.age} onChange={set('age')} /></Field>
            <Field label="Phone (optional)" htmlFor="contact" error={errors.contactInfo}><Input id="contact" value={f.contactInfo} onChange={set('contactInfo')} autoComplete="tel" /></Field>
          </div>
          <Field label="Email" htmlFor="email" error={errors.email}><Input id="email" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters." error={errors.password}><Input id="password" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
          {serverError && <Alert>{serverError}</Alert>}
          <Button type="submit" loading={busy} className="w-full">Create account</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-muted">Already registered? <Link className="text-brand underline" href="/login">Log in</Link></p>
    </div>
  );
}
