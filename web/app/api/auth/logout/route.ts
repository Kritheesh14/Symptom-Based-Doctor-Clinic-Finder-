import { clearSession } from '@/lib/auth';
import { api } from '@/lib/errors';
 
export const POST = api(async () => {
  await clearSession();
  return Response.json({ ok: true });
});
 
