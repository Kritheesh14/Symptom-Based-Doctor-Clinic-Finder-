import { createSession, verifyPassword } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { AppError, api, readJson } from '@/lib/errors';
import { loginSchema } from '@/lib/validation';
 
type Account = { id: number; name: string; password_hash: string };
 
export const POST = api(async (req: Request) => {
  const { email, password, role } = loginSchema.parse(await readJson(req));
 
  const account =
    role === 'admin'
      ? await queryOne<Account>('SELECT admin_id AS id, name, password_hash FROM admins WHERE email = $1', [email])
      : await queryOne<Account>('SELECT patient_id AS id, name, password_hash FROM patients WHERE email = $1', [email]);
 
  // Same message and same work for "unknown email" and "wrong password".
  const ok = await verifyPassword(password, account?.password_hash ?? null);
  if (!account || !ok) throw new AppError(401, 'Incorrect email or password.');
 
  await createSession({ id: account.id, role, name: account.name });
  return Response.json({ id: account.id, name: account.name, role });
});
