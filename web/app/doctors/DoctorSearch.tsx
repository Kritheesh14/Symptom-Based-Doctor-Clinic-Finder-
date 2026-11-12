'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, EmptyState, Field, Input, Loading, Select, StatusBadge, Table, td, th } from '@/components/ui';
import { useApi } from '@/lib/client';

type Doctor = { doctor_id: number; doctor_name: string; years_experience: number; availability_status: string; speciality_name: string; clinics: string };

export function DoctorSearch() {
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState(params.get('speciality') ?? '');
  const [applied, setApplied] = useState({ q: '', spec: params.get('speciality') ?? '' });

  const specs = useApi<{ speciality_id: number; speciality_name: string }[]>('/api/specialities');
  const url = `/api/doctors?q=${encodeURIComponent(applied.q)}&speciality=${applied.spec}`;
  const { data, error, loading } = useApi<Doctor[]>(url);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Find a doctor or clinic</h1>
      <form onSubmit={(e) => { e.preventDefault(); setApplied({ q, spec }); }} className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
        <Field label="Name, speciality or clinic area" htmlFor="q" hint="Try “ravi”, “cardio” or “koramangala”"><Input id="q" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Speciality" htmlFor="spec">
          <Select id="spec" value={spec} onChange={(e) => setSpec(e.target.value)}>
            <option value="">All specialities</option>
            {specs.data?.map((s) => <option key={s.speciality_id} value={s.speciality_id}>{s.speciality_name}</option>)}
          </Select>
        </Field>
        <Button type="submit">Search</Button>
      </form>

      {error && <Alert>{error}</Alert>}
      {loading ? <Loading /> : data && data.length === 0 ? (
        <EmptyState title="No doctors matched">Try a shorter search, or describe your symptoms and let us suggest a speciality: <Link className="underline" href="/symptom-check">check symptoms</Link>.</EmptyState>
      ) : data && (
        <Table>
          <thead><tr><th className={th}>Doctor</th><th className={th}>Speciality</th><th className={th}>Experience</th><th className={th}>Clinics</th><th className={th}>Status</th><th className={th}></th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.doctor_id}>
                <td className={td}>{d.doctor_name}</td>
                <td className={td}>{d.speciality_name}</td>
                <td className={td}>{d.years_experience} yrs</td>
                <td className={td}>{d.clinics}</td>
                <td className={td}><StatusBadge status={d.availability_status} /></td>
                <td className={td}>{d.availability_status === 'available' && <Link className="text-brand underline" href={`/book?doctorId=${d.doctor_id}`}>Book</Link>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
