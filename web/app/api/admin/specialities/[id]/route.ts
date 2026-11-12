import { requireRole } from '@/lib/auth';
import { deleteSpeciality, updateSpeciality } from '@/lib/admin/master';
import { api, intParam, readJson } from '@/lib/errors';
import { specialitySchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = api(async (req: Request, ctx: Ctx) => {
  await requireRole('admin');
  const { specialityName } = specialitySchema.parse(await readJson(req));
  await updateSpeciality(intParam((await ctx.params).id), specialityName);
  return Response.json({ ok: true });
});

export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  await requireRole('admin');
  await deleteSpeciality(intParam((await ctx.params).id));
  return Response.json({ ok: true });
});
