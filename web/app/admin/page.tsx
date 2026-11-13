'use client';
import { Alert, BarList, Card, Loading, Table, td, th } from '@/components/ui';
import { useApi } from '@/lib/client';
 
type Stats = {
  counters: Record<string, number>;
  busiestDoctors: { doctor_id: number; name: string; speciality_name: string; completed: number }[];
  perSpeciality: { speciality_name: string; appointments: number }[];
  demand: { specialityName: string; count: number }[];
  vector: { available: boolean; seedCases?: number; confirmedCases?: number };
};
 
const TILES: [string, string][] = [
  ['total_patients', 'Patients'], ['total_doctors', 'Doctors'], ['total_clinics', 'Clinics'],
  ['scheduled', 'Scheduled'], ['completed', 'Completed'], ['no_show', 'No-shows'], ['total_prescriptions', 'Prescriptions'],
];
 
export default function AdminDashboard() {
  const { data, error, loading } = useApi<Stats>('/api/admin/stats');
  if (loading) return <Loading />;
  if (error || !data) return <Alert>{error ?? 'No data'}</Alert>;
 
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Dashboard</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {TILES.map(([k, label]) => (
          <div key={k} className="rounded-lg border border-line bg-surface p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-display text-3xl tabular-nums">{data.counters[k]}</dd>
          </div>
        ))}
      </dl>
 
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xl">Appointments per speciality, last 30 days</h2>
          <BarList items={data.perSpeciality.map((r) => ({ label: r.speciality_name, value: r.appointments }))} empty="No appointments in the last 30 days." />
        </Card>
        <Card>
          <h2 className="mb-1 text-xl">What patients are searching for</h2>
          <p className="mb-3 text-xs text-muted">Symptom checks per suggested speciality (from the vector database).</p>
          {data.vector.available ? (
            <>
              <BarList items={data.demand.map((r) => ({ label: r.specialityName, value: r.count }))} empty="No symptom checks yet." />
              <p className="mt-3 text-xs text-muted">Search index: {data.vector.seedCases} curated cases + {data.vector.confirmedCases} confirmed by completed visits.</p>
            </>
          ) : <Alert tone="warn">The vector database is not reachable. Start Qdrant to see this chart.</Alert>}
        </Card>
      </div>
 
      <section>
        <h2 className="mb-2 text-xl">Busiest doctors (2+ completed visits)</h2>
        {data.busiestDoctors.length === 0 ? <p className="text-sm text-muted">No doctor has two completed visits yet.</p> : (
          <Table>
            <thead><tr><th className={th}>Doctor</th><th className={th}>Speciality</th><th className={th}>Completed visits</th></tr></thead>
            <tbody>{data.busiestDoctors.map((d) => <tr key={d.doctor_id}><td className={td}>{d.name}</td><td className={td}>{d.speciality_name}</td><td className={td}>{d.completed}</td></tr>)}</tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
