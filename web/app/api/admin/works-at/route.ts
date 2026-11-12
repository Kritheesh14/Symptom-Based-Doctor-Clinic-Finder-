import { requireRole } from '@/lib/auth';
import { addWorksAt, removeWorksAt } from '@/lib/admin/master';
import { api, readJson } from '@/lib/errors';
import { worksAtSchema } from '@/lib/validation';

export const POST = api(async (req: Request) => {
  await requireRole('admin');
  const b = worksAtSchema.parse(await readJson(req));
  await addWorksAt(b.doctorId, b.clinicId, b.sinceDate);
  return Response.json({ ok: true }, { status: 201 });
});

export const DELETE = api(async (req: Request) => {
  await requireRole('admin');
  const b = worksAtSchema.parse(await readJson(req));
  await removeWorksAt(b.doctorId, b.clinicId);
  return Response.json({ ok: true });
});
