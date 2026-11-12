import { requireRole } from '@/lib/auth';
import { deleteClinic, updateClinic } from '@/lib/admin/master';
import { api, intParam, readJson } from '@/lib/errors';
import { clinicSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = api(async (req: Request, ctx: Ctx) => {
  await requireRole('admin');
  await updateClinic(intParam((await ctx.params).id), clinicSchema.parse(await readJson(req)));
  return Response.json({ ok: true });
});

export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  await requireRole('admin');
  await deleteClinic(intParam((await ctx.params).id));
  return Response.json({ ok: true });
});
