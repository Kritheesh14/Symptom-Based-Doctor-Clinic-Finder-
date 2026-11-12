import { requireRole } from '@/lib/auth';
import { createSpeciality, listSpecialitiesAdmin } from '@/lib/admin/master';
import { api, readJson } from '@/lib/errors';
import { specialitySchema } from '@/lib/validation';

export const GET = api(async () => {
  await requireRole('admin');
  return Response.json(await listSpecialitiesAdmin());
});

export const POST = api(async (req: Request) => {
  await requireRole('admin');
  const { specialityName } = specialitySchema.parse(await readJson(req));
  return Response.json(await createSpeciality(specialityName), { status: 201 });
});
