import { requireRole } from '@/lib/auth';
import { getDoctor } from '@/lib/data/doctors';
import { AppError, api, intParam } from '@/lib/errors';

type Ctx = { params: Promise<{ id: string }> };

export const GET = api(async (_req: Request, ctx: Ctx) => {
  await requireRole('patient', 'admin');
  const doctor = await getDoctor(intParam((await ctx.params).id));
  if (!doctor) throw new AppError(404, 'Doctor not found.');
  return Response.json(doctor);
});
