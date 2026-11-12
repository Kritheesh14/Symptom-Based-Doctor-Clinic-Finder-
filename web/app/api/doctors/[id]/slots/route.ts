import { requireRole } from '@/lib/auth';
import { doctorSlots } from '@/lib/data/doctors';
import { api, intParam } from '@/lib/errors';
import { dateParam } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export const GET = api(async (req: Request, ctx: Ctx) => {
  await requireRole('patient', 'admin');
  const id = intParam((await ctx.params).id);
  const date = dateParam.parse(new URL(req.url).searchParams.get('date'));
  return Response.json(await doctorSlots(id, date));
});
