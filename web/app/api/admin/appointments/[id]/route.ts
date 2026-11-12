import { requireRole } from '@/lib/auth';
import { adminSetStatus } from '@/lib/data/appointments';
import { api, intParam, readJson } from '@/lib/errors';
import { adminStatusSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  await requireRole('admin');
  const { status } = adminStatusSchema.parse(await readJson(req));
  await adminSetStatus(intParam((await ctx.params).id), status);
  return Response.json({ ok: true });
});
