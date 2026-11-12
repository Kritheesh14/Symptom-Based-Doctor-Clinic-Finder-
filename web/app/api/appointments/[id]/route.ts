import { requireRole } from '@/lib/auth';
import { cancelOwnAppointment } from '@/lib/data/appointments';
import { api, intParam, readJson } from '@/lib/errors';
import { cancelSchema } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

// Patients may only cancel their own scheduled appointments.
export const PATCH = api(async (req: Request, ctx: Ctx) => {
  const s = await requireRole('patient');
  cancelSchema.parse(await readJson(req));
  await cancelOwnAppointment(s.id, intParam((await ctx.params).id));
  return Response.json({ ok: true });
});
