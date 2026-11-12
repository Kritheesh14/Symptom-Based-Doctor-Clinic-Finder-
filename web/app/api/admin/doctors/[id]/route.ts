import { requireRole } from '@/lib/auth';
import { deleteDoctor, updateDoctor } from '@/lib/admin/master';
import { api, intParam, readJson } from '@/lib/errors';
import { doctorSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = api(async (req: Request, ctx: Ctx) => {
  await requireRole('admin');
  await updateDoctor(intParam((await ctx.params).id), doctorSchema.parse(await readJson(req)));
  return Response.json({ ok: true });
});

export const DELETE = api(async (_req: Request, ctx: Ctx) => {
  await requireRole('admin');
  await deleteDoctor(intParam((await ctx.params).id));
  return Response.json({ ok: true });
});
