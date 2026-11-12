import { requireRole } from '@/lib/auth';
import { adminListAppointments } from '@/lib/data/appointments';
import { api } from '@/lib/errors';
import { dateParam } from '@/lib/validation';
import { z } from 'zod';

const status = z.enum(['scheduled', 'completed', 'cancelled', 'no_show']);

export const GET = api(async (req: Request) => {
  await requireRole('admin');
  const p = new URL(req.url).searchParams;
  const get = <T extends z.ZodTypeAny>(k: string, schema: T): z.infer<T> | null => {
    const v = p.get(k);
    return v ? schema.parse(v) : null;
  };
  return Response.json(await adminListAppointments({ status: get('status', status), from: get('from', dateParam), to: get('to', dateParam) }));
});
