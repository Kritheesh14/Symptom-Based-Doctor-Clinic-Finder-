import { requireRole } from '@/lib/auth';
import { DISCLAIMER } from '@/lib/constants';
import { recommendDoctors } from '@/lib/data/doctors';
import { api, readJson } from '@/lib/errors';
import { symptomSchema } from '@/lib/validation';
import { logPatientQuery } from '@/lib/vector/queries';
import { recommendSpeciality } from '@/lib/vector/recommend';
 
// Where the vector side (Qdrant) and the SQL side (PostgreSQL) meet.
export const POST = api(async (req: Request) => {
  const session = await requireRole('patient');
  const { text } = symptomSchema.parse(await readJson(req));
 
  const { vector, ...rec } = await recommendSpeciality(text);          // 1. semantic search in Qdrant
  const queryId = await logPatientQuery({ patientId: session.id, text, rec: { ...rec, vector } }); // 2. remember the query
  const doctors = await recommendDoctors(rec.specialityId);           // 3. structured lookup in PostgreSQL
 
  // Privacy: "confirmed" cases are earlier patients' own words, so only curated seed cases are shown back.
  const recommendation = { ...rec, similarCases: rec.similarCases.filter((c) => c.source === 'seed') };
  return Response.json({ queryId, recommendation, doctors, disclaimer: DISCLAIMER });
});
