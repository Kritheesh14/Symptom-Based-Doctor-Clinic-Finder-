import { query, queryOne } from '../db';
import { AppError } from '../errors';

export async function bookAppointment(patientId: number, doctorId: number, clinicId: number, slot: string): Promise<number> {
  // book_appointment() is a stored function: availability check + insert run atomically.
  const row = await queryOne<{ id: number }>('SELECT book_appointment($1, $2, $3, $4::timestamp) AS id', [patientId, doctorId, clinicId, slot.replace('T', ' ')]);
  return row!.id;
}

export const listPatientHistory = (patientId: number) =>
  query(
    `SELECT * FROM v_patient_history WHERE patient_id = $1 ORDER BY appointment_time DESC`,
    [patientId],
  );

export const listPatientPrescriptions = (patientId: number) =>
  query(
    `SELECT prescription_id, appointment_id, appointment_time, doctor_name, speciality_name, clinic_name,
            medicine_details, prescription_notes AS notes, issued_at
     FROM v_patient_history WHERE patient_id = $1 AND prescription_id IS NOT NULL
     ORDER BY issued_at DESC`,
    [patientId],
  );

/** A patient can only cancel their own scheduled appointment; anything else is reported as 404. */
export async function cancelOwnAppointment(patientId: number, appointmentId: number): Promise<void> {
  const row = await queryOne(
    `UPDATE appointments SET status = 'cancelled'
     WHERE appointment_id = $1 AND patient_id = $2 AND status = 'scheduled'
     RETURNING appointment_id`,
    [appointmentId, patientId],
  );
  if (!row) throw new AppError(404, 'Appointment not found, or it can no longer be cancelled.');
}

export async function adminSetStatus(appointmentId: number, status: 'no_show' | 'cancelled'): Promise<void> {
  const row = await queryOne(
    `UPDATE appointments SET status = $2 WHERE appointment_id = $1 AND status = 'scheduled' RETURNING appointment_id`,
    [appointmentId, status],
  );
  if (!row) throw new AppError(404, 'Appointment not found, or it is not scheduled.');
}

export function adminListAppointments(filters: { status: string | null; from: string | null; to: string | null }) {
  return query(
    `SELECT a.appointment_id, a.appointment_time, a.status,
            p.patient_id, p.name AS patient_name, d.doctor_id, d.name AS doctor_name,
            s.speciality_name, c.clinic_name, pr.prescription_id
     FROM appointments a
     JOIN patients p     ON p.patient_id = a.patient_id
     JOIN doctors d      ON d.doctor_id = a.doctor_id
     JOIN specialities s ON s.speciality_id = d.speciality_id
     JOIN clinics c      ON c.clinic_id = a.clinic_id
     LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id
     WHERE ($1::text IS NULL OR a.status = $1)
       AND ($2::date IS NULL OR a.appointment_time >= $2::date)
       AND ($3::date IS NULL OR a.appointment_time < $3::date + 1)
     ORDER BY a.appointment_time DESC
     LIMIT 200`,
    [filters.status, filters.from, filters.to],
  );
}

/** Complete an appointment and write the prescription in one DB transaction (stored function). */
export async function completeWithPrescription(appointmentId: number, medicine: string, notes: string | null) {
  const row = await queryOne<{ id: number }>('SELECT complete_with_prescription($1, $2, $3) AS id', [appointmentId, medicine, notes]);
  const spec = await queryOne<{ speciality_id: number; speciality_name: string }>(
    `SELECT s.speciality_id, s.speciality_name
     FROM appointments a JOIN doctors d ON d.doctor_id = a.doctor_id JOIN specialities s ON s.speciality_id = d.speciality_id
     WHERE a.appointment_id = $1`,
    [appointmentId],
  );
  return { prescriptionId: row!.id, speciality: spec! };
}
