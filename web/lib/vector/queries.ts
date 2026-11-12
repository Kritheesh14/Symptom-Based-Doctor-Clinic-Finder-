import { randomUUID } from 'node:crypto';
import { CASES, QUERIES, qdrant } from './client';
import type { Recommendation } from './recommend';
 
/** Store what the patient typed (re-using the vector computed for the recommendation). Returns the point id. */
export async function logPatientQuery(args: { patientId: number; text: string; rec: Recommendation }): Promise<string> {
  const id = randomUUID();
  await qdrant().upsert(QUERIES, {
    wait: true,
    points: [{
      id,
      vector: args.rec.vector,
      payload: {
        patient_id: args.patientId,
        text: args.text,
        speciality_id: args.rec.specialityId,
        speciality_name: args.rec.specialityName,
        confidence: args.rec.confidence,
        low_confidence: args.rec.lowConfidence,
        created_at: new Date().toISOString(),
      },
    }],
  });
  return id;
}
 
/** Remember which appointment a logged query led to. */
export async function linkQueryToAppointment(queryId: string, appointmentId: number): Promise<void> {
  await qdrant().setPayload(QUERIES, { payload: { appointment_id: appointmentId }, points: [queryId], wait: true });
}
 
/**
 * Feedback loop: when an appointment is completed, the symptom text the patient typed becomes a new
 * labelled case in `symptom_cases`, labelled with the speciality of the doctor who actually saw them.
 * Does nothing (returns false) if no logged query is linked to that appointment.
 */
export async function promoteToConfirmedCase(
  appointmentId: number,
  actual: { specialityId: number; specialityName: string },
): Promise<boolean> {
  const found = await qdrant().scroll(QUERIES, {
    filter: { must: [{ key: 'appointment_id', match: { value: appointmentId } }] },
    limit: 1,
    with_payload: true,
    with_vector: true,
  });
  const point = found.points[0];
  if (!point) return false;
  const vector = point.vector as number[] | undefined;
  if (!Array.isArray(vector)) return false;
  const payload = (point.payload ?? {}) as Record<string, unknown>;
 
  await qdrant().upsert(CASES, {
    wait: true,
    points: [{
      id: String(point.id), // same id => re-running is idempotent
      vector,
      payload: {
        text: String(payload.text ?? ''),
        speciality_id: actual.specialityId,
        speciality_name: actual.specialityName,
        source: 'confirmed',
        appointment_id: appointmentId,
        created_at: new Date().toISOString(),
      },
    }],
  });
  return true;
}
 
/** Number of patient queries per predicted speciality (admin "symptom demand" chart). */
export async function specialityDemand(
  specialities: { speciality_id: number; speciality_name: string }[],
): Promise<{ specialityId: number; specialityName: string; count: number }[]> {
  const rows = await Promise.all(
    specialities.map(async (s) => {
      const r = await qdrant().count(QUERIES, {
        filter: { must: [{ key: 'speciality_id', match: { value: s.speciality_id } }] },
        exact: true,
      });
      return { specialityId: s.speciality_id, specialityName: s.speciality_name, count: r.count };
    }),
  );
  return rows.sort((a, b) => b.count - a.count);
}
 
export async function countCases(source?: 'seed' | 'confirmed'): Promise<number> {
  const r = await qdrant().count(CASES, {
    filter: source ? { must: [{ key: 'source', match: { value: source } }] } : undefined,
    exact: true,
  });
  return r.count;
}
 
