import { requireRole } from '@/lib/auth';
import { createDoctor, listDoctorsAdmin } from '@/lib/admin/master';
import { api, readJson } from '@/lib/errors';
import { doctorSchema } from '@/lib/validation';

export const GET = api(async () => {
  await requireRole('admin');
  return Response.json(await listDoctorsAdmin());
});

export const POST = api(async (req: Request) => {
  await requireRole('admin');
  const row = await createDoctor(doctorSchema.parse(await readJson(req)));
  return Response.json(row, { status: 201 });
});
