import { requireRole } from '@/lib/auth';
import { adminStats } from '@/lib/admin/stats';
import { api } from '@/lib/errors';

export const GET = api(async () => {
  await requireRole('admin');
  return Response.json(await adminStats());
});
