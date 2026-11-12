import { requireRole } from '@/lib/auth';
import { findDoctors } from '@/lib/data/doctors';
import { api } from '@/lib/errors';

// GET /api/doctors?q=ravi+cardio&speciality=2  (full-text search; no q -> directory view)
export const GET = api(async (req: Request) => {
  await requireRole('patient', 'admin');
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const spec = url.searchParams.get('speciality');
  const specialityId = spec && /^\d+$/.test(spec) ? Number(spec) : null;
  return Response.json(await findDoctors(q ? q.slice(0, 200) : null, specialityId));
});
