'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, EmptyState, Field, Input, Loading, Select, StatusBadge } from '@/components/ui';
import { api, formatDateTime, todayLocal, useApi } from '@/lib/client';

type Doctor = {
  doctor_id: number; doctor_name: string; years_experience: number; availability_status: string; speciality_name: string;
  clinicList: { clinic_id: number; clinic_name: string; address: string; phone: string | null }[];
};
type Slot = { slot: string; available: boolean };

export function BookForm() {
  const params = useSearchParams();
  const doctorId = params.get('doctorId');
  const queryId = params.get('queryId') ?? undefined;

  const doc = useApi<Doctor>(doctorId && /^\d+$/.test(doctorId) ? `/api/doctors/${doctorId}` : null);
  const [clinicId, setClinicId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [slot, setSlot] = useState<string | null>(null);
  const slots = useApi<Slot[]>(doctorId && date ? `/api/doctors/${doctorId}/slots?date=${date}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);

  if (!doctorId) return <EmptyState title="Choose a doctor first">Start from <Link className="underline" href="/symptom-check">symptom check</Link> or <Link className="underline" href="/doctors">the doctor search</Link>.</EmptyState>;
  if (doc.loading) return <Loading />;
  if (doc.error || !doc.data) return <Alert>{doc.error ?? 'Doctor not found'}</Alert>;
  const d = doc.data;
  const effectiveClinic = clinicId || String(d.clinicList[0]?.clinic_id ?? '');

  async function confirm() {
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/appointments', { method: 'POST', json: { doctorId: d.doctor_id, clinicId: Number(effectiveClinic), slot, queryId } });
      setBooked(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
      slots.reload();
      setSlot(null);
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <Card className="mx-auto max-w-lg border-l-4 border-l-ok">
        <h1 className="text-2xl">Appointment booked</h1>
        <p className="mt-2">{d.doctor_name}, {formatDateTime(booked)}</p>
        <Link href="/appointments" className="mt-4 inline-block text-brand underline">See my appointments</Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl">Book an appointment</h1>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-display">{d.doctor_name}</p>
            <p className="text-sm text-muted">{d.speciality_name}, {d.years_experience} years of experience</p>
          </div>
          <StatusBadge status={d.availability_status} />
        </div>
      </Card>
      {d.availability_status !== 'available' ? <Alert tone="warn">This doctor is currently {d.availability_status.replace('_', ' ')} and cannot be booked.</Alert> : d.clinicList.length === 0 ? <Alert tone="warn">This doctor is not assigned to a clinic yet.</Alert> : (
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Clinic" htmlFor="clinic">
              <Select id="clinic" value={effectiveClinic} onChange={(e) => setClinicId(e.target.value)}>
                {d.clinicList.map((c) => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
              </Select>
            </Field>
            <Field label="Date" htmlFor="date"><Input id="date" type="date" min={todayLocal()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(null); }} /></Field>
          </div>
          <p className="text-xs text-muted">{d.clinicList.find((c) => String(c.clinic_id) === effectiveClinic)?.address}</p>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Time</legend>
            {slots.loading ? <Loading /> : slots.error ? <Alert>{slots.error}</Alert> : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.data?.map((s) => (
                  <button key={s.slot} type="button" disabled={!s.available} onClick={() => setSlot(s.slot)} aria-pressed={slot === s.slot}
                    className={`rounded-md border px-2 py-1.5 text-sm ${slot === s.slot ? 'border-brand bg-brand text-white' : 'border-line bg-surface'} disabled:cursor-not-allowed disabled:text-muted/50 disabled:line-through`}>
                    {s.slot.slice(11)}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
          {error && <Alert>{error}</Alert>}
          <Button onClick={confirm} loading={busy} disabled={!slot}>{slot ? `Book ${slot.slice(11)} on ${date}` : 'Pick a time'}</Button>
        </Card>
      )}
    </div>
  );
}
