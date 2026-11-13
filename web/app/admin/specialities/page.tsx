'use client';
import { useState } from 'react';
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Input, Loading, Table, td, th } from '@/components/ui';
import { api, useApi } from '@/lib/client';

type Spec = { speciality_id: number; speciality_name: string; doctors: number };

export default function AdminSpecialities() {
  const { data, error, loading, reload } = useApi<Spec[]>('/api/admin/specialities');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [name, setName] = useState('');
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
    const ok = editing === 'new'
      ? await run(() => api('/api/admin/specialities', { method: 'POST', json: { specialityName: name } }), 'Speciality created.')
      : await run(() => api(`/api/admin/specialities/${editing}`, { method: 'PUT', json: { specialityName: name } }), 'Speciality renamed.');
    if (ok) setEditing(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Specialities</h1><Button onClick={() => { setMsg(null); setName(''); setEditing('new'); }}>Add speciality</Button></div>
      <Alert tone="brand">Symptom suggestions are labelled with these names. Renaming one keeps its id, so the search index stays valid.</Alert>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {error && <Alert>{error}</Alert>}
      {editing !== null && (
        <Card className="border-l-4 border-l-brand">
          <form onSubmit={save} className="flex flex-wrap items-end gap-3">
            <Field label="Speciality name" htmlFor="sn"><Input id="sn" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Button type="submit" loading={busy}>Save</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          </form>
        </Card>
      )}
      {loading ? <Loading /> : data && data.length === 0 ? <EmptyState title="No specialities yet" /> : data && (
        <Table>
          <thead><tr><th className={th}>Name</th><th className={th}>Doctors</th><th className={th}></th></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.speciality_id}>
                <td className={td}>{s.speciality_name}</td><td className={td}>{s.doctors}</td>
                <td className={td}><div className="flex gap-1">
                  <Button variant="secondary" onClick={() => { setMsg(null); setName(s.speciality_name); setEditing(s.speciality_id); }}>Rename</Button>
                  <Button variant="ghost" onClick={() => setDeleteId(s.speciality_id)}>Delete</Button></div></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ConfirmDialog open={deleteId !== null} title="Delete this speciality?" message="A speciality that still has doctors cannot be deleted." confirmLabel="Delete speciality" danger loading={busy}
        onConfirm={async () => { await run(() => api(`/api/admin/specialities/${deleteId}`, { method: 'DELETE' }), 'Speciality deleted.'); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
