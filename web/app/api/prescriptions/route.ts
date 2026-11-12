import { requireRole } from '@/lib/auth';
import { completeWithPrescription, listPatientPrescriptions } from '@/lib/data/appointments';
import { api, readJson } from '@/lib/errors';
import { prescriptionSchema } from '@/lib/validation';
import { promoteToConfirmedCase } from '@/lib/vector/queries';

export const GET = api(async () => {
  const s = await requireRole('patient');
  return Response.json(await listPatientPrescriptions(s.id));
});

// Admin: complete the appointment + write the prescription (one DB transaction), then feed the vector index.
export const POST = api(async (req: Request) => {
  await requireRole('admin');
  const b = prescriptionSchema.parse(await readJson(req));
  const { prescriptionId, speciality } = await completeWithPrescription(b.appointmentId, b.medicineDetails, b.notes ?? null);

  let promoted = false;
  try {
    promoted = await promoteToConfirmedCase(b.appointmentId, { specialityId: speciality.speciality_id, specialityName: speciality.speciality_name });
  } catch (e) {
    console.error('feedback loop failed (appointment is still completed)', e);
  }
  return Response.json({ prescriptionId, promotedToCorpus: promoted }, { status: 201 });
});
