import { requireRole } from '@/lib/auth';
import { listSpecialities } from '@/lib/data/doctors';
import { api } from '@/lib/errors';

export const GET = api(async () => {
  await requireRole('patient', 'admin');
  return Response.json(await listSpecialities());
});
