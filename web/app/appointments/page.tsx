'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, Loading, StatusBadge, Table, td, th } from '@/components/ui';
import { api, formatDateTime, useApi } from '@/lib/client';
 
type Row = {
  appointment_id: number; appointment_time: string; status: string; doctor_name: string; speciality_name: string;
  clinic_name: string; clinic_address: string; medicine_details: string | null; prescription_notes: string | null;
};
 
export default function AppointmentsPage() {
  const { data, error, loading, reload } = useApi<Row[]>('/api/appointments');
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
 
  async function cancel() {
    if (cancelId === null) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/appointments/${cancelId}`, { method: 'PATCH', json: { status: 'cancelled' } });
      setCancelId(null);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not cancel');
      setCancelId(null);
    } finally {
      setBusy(false);
    }
  }
 
  return (
    <div className="space-y-5">
      <h1 className="text-3xl">My appointments</h1>
      {error && <Alert>{error}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}
      {loading ? <Loading /> : data && data.length === 0 ? (
        <EmptyState title="No appointments yet">Describe your symptoms to get a suggestion and book: <Link className="underline" href="/symptom-check">check symptoms</Link>.</EmptyState>
      ) : data && (
        <Table>
          <thead><tr><th className={th}>When</th><th className={th}>Doctor</th><th className={th}>Clinic</th><th className={th}>Status</th><th className={th}>Prescription</th><th className={th}></th></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.appointment_id}>
                <td className={td}>{formatDateTime(a.appointment_time)}</td>
                <td className={td}>{a.doctor_name}<div className="text-xs text-muted">{a.speciality_name}</div></td>
                <td className={td}>{a.clinic_name}<div className="text-xs text-muted">{a.clinic_address}</div></td>
                <td className={td}><StatusBadge status={a.status} /></td>
                <td className={td}>{a.medicine_details ?? <span className="text-muted">None</span>}</td>
                <td className={td}>{a.status === 'scheduled' && <Button variant="ghost" onClick={() => setCancelId(a.appointment_id)}>Cancel</Button>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog open={cancelId !== null} title="Cancel this appointment?" message="The time slot becomes available to other patients." confirmLabel="Cancel appointment" danger loading={busy} onConfirm={cancel} onCancel={() => setCancelId(null)} />
    </div>
  );
}
