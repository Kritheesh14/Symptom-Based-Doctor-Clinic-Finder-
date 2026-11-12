'use client';
import { useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Input, Loading, Select, StatusBadge, Table, Textarea, td, th } from '@/components/ui';
import { api, formatDateTime, useApi } from '@/lib/client';

type Row = { appointment_id: number; appointment_time: string; status: string; patient_name: string; doctor_name: string; speciality_name: string; clinic_name: string; prescription_id: number | null };

export default function AdminAppointments() {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const qs = new URLSearchParams({ ...(status && { status }), ...(from && { from }), ...(to && { to }) }).toString();
  const { data, error, loading, reload } = useApi<Row[]>(`/api/admin/appointments?${qs}`);

  const [noShowId, setNoShowId] = useState<number | null>(null);
  const [rx, setRx] = useState<Row | null>(null);
  const [medicine, setMedicine] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  async function markNoShow() {
    if (noShowId === null) return;
    setBusy(true);
    try {
      await api(`/api/admin/appointments/${noShowId}`, { method: 'PATCH', json: { status: 'no_show' } });
      setMsg({ tone: 'ok', text: 'Marked as no-show.' });
      reload();
    } catch (e) {
      setMsg({ tone: 'danger', text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setBusy(false);
      setNoShowId(null);
    }
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    if (!rx) return;
    setBusy(true);
    try {
      const r = await api<{ promotedToCorpus: boolean }>('/api/prescriptions', { method: 'POST', json: { appointmentId: rx.appointment_id, medicineDetails: medicine, notes: notes || undefined } });
      setMsg({ tone: 'ok', text: `Appointment completed and prescription saved.${r.promotedToCorpus ? ' The patient’s symptom description was added to the search index.' : ''}` });
      setRx(null); setMedicine(''); setNotes('');
      reload();
    } catch (err) {
      setMsg({ tone: 'danger', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl">Appointments</h1>
      <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3">
        <Field label="Status" htmlFor="status">
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option>
          </Select>
        </Field>
        <Field label="From" htmlFor="from"><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To" htmlFor="to"><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {error && <Alert>{error}</Alert>}

      {rx && (
        <Card className="border-l-4 border-l-brand">
          <h2 className="text-xl">Complete and prescribe</h2>
          <p className="text-sm text-muted">{rx.patient_name} with {rx.doctor_name}, {formatDateTime(rx.appointment_time)}</p>
          <form onSubmit={complete} className="mt-3 space-y-3">
            <Field label="Medicine details" htmlFor="med"><Textarea id="med" rows={3} value={medicine} onChange={(e) => setMedicine(e.target.value)} required /></Field>
            <Field label="Notes (optional)" htmlFor="notes"><Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="flex gap-2"><Button type="submit" loading={busy}>Complete and save prescription</Button><Button type="button" variant="secondary" onClick={() => setRx(null)}>Close</Button></div>
          </form>
        </Card>
      )}

      {loading ? <Loading /> : data && data.length === 0 ? <EmptyState title="No appointments match these filters" /> : data && (
        <Table>
          <thead><tr><th className={th}>When</th><th className={th}>Patient</th><th className={th}>Doctor</th><th className={th}>Clinic</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.appointment_id}>
                <td className={td}>{formatDateTime(a.appointment_time)}</td>
                <td className={td}>{a.patient_name}</td>
                <td className={td}>{a.doctor_name}<div className="text-xs text-muted">{a.speciality_name}</div></td>
                <td className={td}>{a.clinic_name}</td>
                <td className={td}><StatusBadge status={a.status} />{a.prescription_id && <div className="text-xs text-muted">prescribed</div>}</td>
                <td className={td}>
                  {a.status === 'scheduled' && (
                    <div className="flex flex-wrap gap-1">
                      <Button variant="secondary" onClick={() => { setRx(a); setMsg(null); }}>Complete + prescribe</Button>
                      <Button variant="ghost" onClick={() => setNoShowId(a.appointment_id)}>No-show</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog open={noShowId !== null} title="Mark as no-show?" message="The patient did not attend. This cannot be undone." confirmLabel="Mark no-show" danger loading={busy} onConfirm={markNoShow} onCancel={() => setNoShowId(null)} />
    </div>
  );
}
