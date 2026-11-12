import { query, queryOne } from '../db';

export type DoctorRow = {
  doctor_id: number; doctor_name: string; years_experience: number; availability_status: string;
  speciality_id: number; speciality_name: string; clinics: string;
};

export const listSpecialities = () =>
  query<{ speciality_id: number; speciality_name: string }>('SELECT speciality_id, speciality_name FROM specialities ORDER BY speciality_name');

/** Free-text search (PostgreSQL full-text search function) or, with no text, the directory view. */
export async function findDoctors(q: string | null, specialityId: number | null): Promise<(DoctorRow & { rank?: number })[]> {
  if (q && q.trim()) {
    return query(
      `SELECT s.doctor_id, s.name AS doctor_name, s.years_experience, s.availability_status,
              s.speciality_id, s.speciality_name, s.clinics, s.rank
       FROM search_doctors($1, $2) s`,
      [q, specialityId],
    );
  }
  return query(
    `SELECT * FROM v_doctor_directory
     WHERE ($1::int IS NULL OR speciality_id = $1)
     ORDER BY (availability_status = 'available') DESC, years_experience DESC, doctor_name`,
    [specialityId],
  );
}

/** Available doctors of a speciality, most experienced first (used right after the vector recommendation). */
export const recommendDoctors = (specialityId: number, limit = 8) =>
  query<DoctorRow>(
    `SELECT * FROM v_doctor_directory
     WHERE speciality_id = $1 AND availability_status = 'available'
     ORDER BY years_experience DESC, doctor_name
     LIMIT $2`,
    [specialityId, limit],
  );

export async function getDoctor(id: number) {
  const doctor = await queryOne<DoctorRow>('SELECT * FROM v_doctor_directory WHERE doctor_id = $1', [id]);
  if (!doctor) return null;
  const clinics = await query<{ clinic_id: number; clinic_name: string; address: string; phone: string | null }>(
    `SELECT c.clinic_id, c.clinic_name, c.address, c.phone
     FROM works_at w JOIN clinics c ON c.clinic_id = w.clinic_id
     WHERE w.doctor_id = $1 ORDER BY c.clinic_name`,
    [id],
  );
  return { ...doctor, clinicList: clinics };
}

/** Half-hour slots 09:00-16:30 for a date, flagged available when in the future and not already booked. */
export const doctorSlots = (doctorId: number, date: string) =>
  query<{ slot: string; available: boolean }>(
    `SELECT to_char(s, 'YYYY-MM-DD HH24:MI') AS slot,
            (s > now()::timestamp AND NOT EXISTS (
               SELECT 1 FROM appointments a
               WHERE a.doctor_id = $1 AND a.appointment_time = s AND a.status = 'scheduled')) AS available
     FROM generate_series($2::date + time '09:00', $2::date + time '16:30', interval '30 minutes') AS s
     ORDER BY s`,
    [doctorId, date],
  );
