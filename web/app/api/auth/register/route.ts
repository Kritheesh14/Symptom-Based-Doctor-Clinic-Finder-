Create this exact path in the repository. Paste the complete content below. (16 lines; 794 characters.)
import { hashPassword } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { api, readJson } from '@/lib/errors';
import { registerSchema } from '@/lib/validation';
 
// Patients only. Admin accounts are created by the database seed / an existing admin, never self-service.
export const POST = api(async (req: Request) => {
  const input = registerSchema.parse(await readJson(req));
  const hash = await hashPassword(input.password);
  const row = await queryOne<{ patient_id: number }>(
    `INSERT INTO patients (name, age, contact_info, email, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING patient_id`,
    [input.name, input.age ?? null, input.contactInfo ?? null, input.email, hash],
  );
  return Response.json({ patientId: row!.patient_id }, { status: 201 });
});
 
