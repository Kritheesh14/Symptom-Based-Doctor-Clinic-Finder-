'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, EmptyState, Field, StatusBadge, Textarea } from '@/components/ui';
import { api } from '@/lib/client';

type Doctor = { doctor_id: number; doctor_name: string; years_experience: number; availability_status: string; clinics: string };
type Result = {
  queryId: string;
  disclaimer: string;
  recommendation: {
    specialityId: number; specialityName: string; confidence: number; lowConfidence: boolean;
    alternatives: { specialityId: number; specialityName: string; share: number }[];
    similarCases: { text: string; specialityName: string; score: number }[];
  };
  doctors: Doctor[];
};

export function SymptomCheck() {
  const params = useSearchParams();
  const [text, setText] = useState(params.get('text') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api<Result>('/api/symptom-check', { method: 'POST', json: { text } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const rec = result?.recommendation;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">What are you feeling?</h1>
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Describe your symptoms in your own words" htmlFor="text" hint={`${text.trim().length}/1000 characters, at least 10`}>
            <Textarea id="text" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={busy} disabled={text.trim().length < 10}>Find my specialist</Button>
        </form>
      </Card>

      {result && rec && (
        <>
          <Card className="border-l-4 border-l-brand">
            <p className="text-sm text-muted">Suggested speciality</p>
            <h2 className="text-3xl text-brand">{rec.specialityName}</h2>
            <div className="mt-3 max-w-sm">
              <div className="flex justify-between text-xs text-muted"><span>Match strength</span><span>{Math.round(rec.confidence * 100)}%</span></div>
              <div className="mt-1 h-2 rounded bg-brand-soft" role="img" aria-label={`Match strength ${Math.round(rec.confidence * 100)} percent`}>
                <div className="h-2 rounded bg-brand" style={{ width: `${rec.confidence * 100}%` }} />
              </div>
            </div>
            {rec.lowConfidence && (
              <div className="mt-4">
                <Alert tone="warn">
                  We are not very sure about this one. Consider these other specialities, or start with General Medicine:{' '}
                  {rec.alternatives.map((a, i) => (
                    <span key={a.specialityId}>{i > 0 && ', '}<Link className="underline" href={`/doctors?speciality=${a.specialityId}`}>{a.specialityName}</Link></span>
                  ))}
                </Alert>
              </div>
            )}
            <p className="mt-4 text-xs text-muted">{result.disclaimer}</p>
          </Card>

          <section>
            <h2 className="mb-3 text-2xl">Doctors you can book</h2>
            {result.doctors.length === 0 ? (
              <EmptyState title="No available doctors for this speciality right now">Try one of the alternatives above or search all doctors.</EmptyState>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {result.doctors.map((d) => (
                  <li key={d.doctor_id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{d.doctor_name}</p>
                        <p className="text-sm text-muted">{d.years_experience} years of experience</p>
                      </div>
                      <StatusBadge status={d.availability_status} />
                    </div>
                    <p className="mt-2 text-sm text-muted">{d.clinics}</p>
                    <Link href={`/book?doctorId=${d.doctor_id}&queryId=${result.queryId}`} className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">Book an appointment</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {rec.similarCases.length > 0 && (
            <section>
              <h2 className="mb-2 text-xl">Descriptions that looked similar</h2>
              <ul className="space-y-1 text-sm text-muted">
                {rec.similarCases.map((c, i) => (
                  <li key={i}>&ldquo;{c.text}&rdquo; <span className="text-ink">({c.specialityName}, similarity {c.score.toFixed(2)})</span></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
