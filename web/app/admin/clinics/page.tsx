'use client';
import { useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Input, Loading, Table, td, th } from '@/components/ui';
import { api, useApi } from '@/lib/client';

type Clinic = { clinic_id: number; clinic_name: string; address: string; phone: string | null };
const EMPTY = { clinicName: '', address: '', phone: '' };

export default function AdminClinics() {
  const { data, error, loading, reload } = useApi<Clinic[]>('/api/admin/clinics');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); setMsg({ tone: 'ok', text: ok }); reload(); return true; }
    catch (e) { setMsg({ tone: 'danger', text: e instanceof Error ? e.message : 'Failed' }); return false; }
    finally { setBusy(false); }
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { clinicName: form.clinicName, address: form.address, phone: form.phone || undefined };
    const ok = editing === 'new'
      ? await run(() => api('/api/admin/clinics', { method: 'POST', json: body }), 'Clinic created.')
      : await run(() => api(`/api/admin/clinics/${editing}`, { method: 'PUT', json: body }), 'Clinic updated.');
    if (ok) setEditing(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Clinics</h1><Button onClick={() => { setMsg(null); setForm(EMPTY); setEditing('new'); }}>Add clinic</Button></div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {error && <Alert>{error}</Alert>}
      {editing !== null && (
        <Card className="border-l-4 border-l-brand">
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Clinic name" htmlFor="cn"><Input id="cn" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} required /></Field>
            <Field label="Phone" htmlFor="cp" hint="7-20 digits, spaces, + or -"><Input id="cp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Address" htmlFor="ca"><Input id="ca" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></Field></div>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></div>
          </form>
        </Card>
      )}
      {loading ? <Loading /> : data && data.length === 0 ? <EmptyState title="No clinics yet" /> : data && (
        <Table>
          <thead><tr><th className={th}>Name</th><th className={th}>Address</th><th className={th}>Phone</th><th className={th}></th></tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.clinic_id}>
                <td className={td}>{c.clinic_name}</td><td className={td}>{c.address}</td><td className={td}>{c.phone}</td>
                <td className={td}><div className="flex gap-1">
                  <Button variant="secondary" onClick={() => { setMsg(null); setForm({ clinicName: c.clinic_name, address: c.address, phone: c.phone ?? '' }); setEditing(c.clinic_id); }}>Edit</Button>
                  <Button variant="ghost" onClick={() => setDeleteId(c.clinic_id)}>Delete</Button></div></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog open={deleteId !== null} title="Delete this clinic?" message="A clinic that still has doctors or appointments cannot be deleted." confirmLabel="Delete clinic" danger loading={busy}
        onConfirm={async () => { await run(() => api(`/api/admin/clinics/${deleteId}`, { method: 'DELETE' }), 'Clinic deleted.'); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
