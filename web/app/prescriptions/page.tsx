'use client';
import { Alert, Card, EmptyState, Loading } from '@/components/ui';
import { formatDateTime, useApi } from '@/lib/client';

type Rx = { prescription_id: number; appointment_time: string; doctor_name: string; speciality_name: string; clinic_name: string; medicine_details: string; notes: string | null; issued_at: string };

export default function PrescriptionsPage() {
  const { data, error, loading } = useApi<Rx[]>('/api/prescriptions');
  return (
    <div className="space-y-5">
      <h1 className="text-3xl">My prescriptions</h1>
      {error && <Alert>{error}</Alert>}
      {loading ? <Loading /> : data && data.length === 0 ? (
        <EmptyState title="No prescriptions yet">A prescription appears here after your doctor completes a visit.</EmptyState>
      ) : (
        <div className="space-y-3">
          {data?.map((r) => (
            <Card key={r.prescription_id}>
              <p className="text-sm text-muted">{formatDateTime(r.issued_at)} · {r.doctor_name} ({r.speciality_name}) · {r.clinic_name}</p>
              <p className="mt-2 whitespace-pre-wrap">{r.medicine_details}</p>
              {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">Note: {r.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
