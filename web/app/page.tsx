import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { Button, Textarea } from '@/components/ui';

export default async function Home() {
  const session = await getSession();
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div>
        <h1 className="text-4xl leading-tight sm:text-5xl">Not sure which doctor to see?</h1>
        <p className="mt-4 max-w-prose text-lg text-muted">
          Describe how you feel in your own words. We compare it with thousands of similar descriptions by meaning, not keywords,
          and point you to the right kind of specialist.
        </p>
        <ol className="mt-8 max-w-prose list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Write what you are feeling, for example &ldquo;my chest feels tight when I climb stairs&rdquo;.</li>
          <li>See the suggested speciality and the doctors who can see you.</li>
          <li>Pick a clinic and a time slot. Your prescription appears in your account afterwards.</li>
        </ol>
        <p className="mt-8 text-sm">
          Already know the speciality?{' '}
          <Link className="font-medium text-brand underline underline-offset-2" href="/doctors">Search doctors and clinics</Link>
        </p>
      </div>

      <form action="/symptom-check" method="get" className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <label htmlFor="text" className="font-display text-xl">What are you feeling?</label>
        <Textarea id="text" name="text" required minLength={10} maxLength={1000} rows={6} className="mt-3"
          placeholder="e.g. itchy red patches on my elbows that flake" />
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-muted">{session ? 'Signed in as ' + session.name : 'You will be asked to log in first.'}</p>
          <Button type="submit">Find my specialist</Button>
        </div>
      </form>
    </div>
  );
}
