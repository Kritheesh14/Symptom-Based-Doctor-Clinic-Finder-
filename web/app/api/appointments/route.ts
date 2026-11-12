import { requireRole } from '@/lib/auth';
import { bookAppointment, listPatientHistory } from '@/lib/data/appointments';
import { api, readJson } from '@/lib/errors';
import { bookSchema } from '@/lib/validation';
import { linkQueryToAppointment } from '@/lib/vector/queries';

export const GET = api(async () => {
  const s = await requireRole('patient');
  return Response.json(await listPatientHistory(s.id));
});

export const POST = api(async (req: Request) => {
  const s = await requireRole('patient');
  const b = bookSchema.parse(await readJson(req));
  const appointmentId = await bookAppointment(s.id, b.doctorId, b.clinicId, b.slot);

  // Feedback loop wiring: remember which appointment this symptom check led to. Never fail the booking over it.
  let linked = false;
  if (b.queryId) {
    try {
      await linkQueryToAppointment(b.queryId, appointmentId);
      linked = true;
    } catch (e) {
      console.error('could not link query to appointment', e);
    }
  }
  return Response.json({ appointmentId, linked }, { status: 201 });
});
