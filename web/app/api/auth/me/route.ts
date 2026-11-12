import { getSession } from '@/lib/auth';
import { api } from '@/lib/errors';
 
export const GET = api(async () => {
  const s = await getSession();
  return s ? Response.json(s) : Response.json({ error: 'Please log in.' }, { status: 401 });
});
