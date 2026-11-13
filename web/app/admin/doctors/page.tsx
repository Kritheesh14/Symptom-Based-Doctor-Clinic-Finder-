'use client';
import { useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Input, Loading, Select, StatusBadge, Table, td, th } from '@/components/ui';
import { api, formatDate, todayLocal, useApi } from '@/lib/client';
 
type Doctor = { doctor_id: number; name: string; years_experience: number; availability_status: string; speciality_id: number; speciality_name: string; clinics: { clinic_id: number; clinic_name: string; since_date: string }[] };
type Spec = { speciality_id: number; speciality_name: string };
type Clinic = { clinic_id: number; clinic_name: string };
 
const EMPTY = { name: '', yearsExperience: '0', availabilityStatus: 'available', specialityId: '' };
 
export default function AdminDoctors() {
  const docs = useApi<Doctor[]>('/api/admin/doctors');
  const specs = useApi<Spec[]>('/api/specialities');
  const clinics = useApi<Clinic[]>('/api/admin/clinics');
 
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [linkDoctor, setLinkDoctor] = useState<number | null>(null);
  const [linkClinic, setLinkClinic] = useState('');
  const [linkDate, setLinkDate] = useState(todayLocal());
 
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); setMsg({ tone: 'ok', text: ok }); docs.reload(); return true; }
    catch (e) { setMsg({ tone: 'danger', text: e instanceof Error ? e.message : 'Failed' }); return false; }
    finally { setBusy(false); }
  };
 
  function startEdit(d: Doctor | null) {
    setMsg(null);
    setEditing(d ? d.doctor_id : 'new');
    setForm(d ? { name: d.name, yearsExperience: String(d.years_experience), availabilityStatus: d.availability_status, specialityId: String(d.speciality_id) } : { ...EMPTY, specialityId: String(specs.data?.[0]?.speciality_id ?? '') });
  }
 
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: form.name, yearsExperience: Number(form.yearsExperience), availabilityStatus: form.availabilityStatus, specialityId: Number(form.specialityId) };
    const ok = editing === 'new'
      ? await run(() => api('/api/admin/doctors', { method: 'POST', json: body }), 'Doctor created.')
      : await run(() => api(`/api/admin/doctors/${editing}`, { method: 'PUT', json: body }), 'Doctor updated.');
    if (ok) setEditing(null);
  }
 
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Doctors</h1><Button onClick={() => startEdit(null)}>Add doctor</Button></div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {docs.error && <Alert>{docs.error}</Alert>}
 
      {editing !== null && (
        <Card className="border-l-4 border-l-brand">
          <h2 className="mb-3 text-xl">{editing === 'new' ? 'New doctor' : 'Edit doctor'}</h2>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="dn"><Input id="dn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Years of experience" htmlFor="dy" hint="0 to 60"><Input id="dy" type="number" min={0} max={60} value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} required /></Field>
            <Field label="Speciality" htmlFor="ds">
              <Select id="ds" value={form.specialityId} onChange={(e) => setForm({ ...form, specialityId: e.target.value })} required>
                {specs.data?.map((s) => <option key={s.speciality_id} value={s.speciality_id}>{s.speciality_name}</option>)}
              </Select>
            </Field>
            <Field label="Availability" htmlFor="da">
              <Select id="da" value={form.availabilityStatus} onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })}>
                <option value="available">Available</option><option value="on_leave">On leave</option><option value="unavailable">Unavailable</option>
              </Select>
            </Field>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></div>
          </form>
        </Card>
      )}
 
      {docs.loading ? <Loading /> : docs.data && docs.data.length === 0 ? <EmptyState title="No doctors yet" /> : docs.data && (
        <Table>
          <thead><tr><th className={th}>Name</th><th className={th}>Speciality</th><th className={th}>Exp.</th><th className={th}>Status</th><th className={th}>Works at</th><th className={th}></th></tr></thead>
          <tbody>
            {docs.data.map((d) => (
              <tr key={d.doctor_id}>
                <td className={td}>{d.name}</td>
                <td className={td}>{d.speciality_name}</td>
                <td className={td}>{d.years_experience}</td>
                <td className={td}><StatusBadge status={d.availability_status} /></td>
                <td className={td}>
                  <ul className="space-y-1">
                    {d.clinics.map((c) => (
                      <li key={c.clinic_id} className="flex items-center gap-2">
                        <span>{c.clinic_name} <span className="text-xs text-muted">since {formatDate(c.since_date)}</span></span>
                        <button className="text-xs text-danger underline" onClick={() => run(() => api('/api/admin/works-at', { method: 'DELETE', json: { doctorId: d.doctor_id, clinicId: c.clinic_id } }), 'Clinic link removed.')}>remove</button>
                      </li>
                    ))}
                  </ul>
                  {linkDoctor === d.doctor_id ? (
                    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api('/api/admin/works-at', { method: 'POST', json: { doctorId: d.doctor_id, clinicId: Number(linkClinic), sinceDate: linkDate } }), 'Clinic linked.')) setLinkDoctor(null); }}>
                      <Select aria-label="Clinic" value={linkClinic} onChange={(e) => setLinkClinic(e.target.value)} required className="w-44"><option value="">Choose clinic</option>{clinics.data?.map((c) => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}</Select>
                      <Input aria-label="Since date" type="date" value={linkDate} onChange={(e) => setLinkDate(e.target.value)} className="w-40" />
                      <Button type="submit" loading={busy}>Add</Button>
                    </form>
                  ) : <button className="mt-1 text-xs text-brand underline" onClick={() => { setLinkDoctor(d.doctor_id); setLinkClinic(''); }}>add clinic</button>}
                </td>
                <td className={td}><div className="flex gap-1"><Button variant="secondary" onClick={() => startEdit(d)}>Edit</Button><Button variant="ghost" onClick={() => setDeleteId(d.doctor_id)}>Delete</Button></div></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog open={deleteId !== null} title="Delete this doctor?" message="Doctors who already have appointments cannot be deleted; set them to unavailable instead." confirmLabel="Delete doctor" danger loading={busy}
        onConfirm={async () => { await run(() => api(`/api/admin/doctors/${deleteId}`, { method: 'DELETE' }), 'Doctor deleted.'); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
