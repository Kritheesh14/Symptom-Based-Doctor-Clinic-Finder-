import { requireRole } from '@/lib/auth';
import { createClinic, listClinics } from '@/lib/admin/master';
import { api, readJson } from '@/lib/errors';
import { clinicSchema } from '@/lib/validation';

export const GET = api(async () => {
  await requireRole('admin');
  return Response.json(await listClinics());
});

export const POST = api(async (req: Request) => {
  await requireRole('admin');
  return Response.json(await createClinic(clinicSchema.parse(await readJson(req))), { status: 201 });
});
