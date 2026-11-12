import { query, queryOne } from '../db';
import { AppError } from '../errors';

// ---------- doctors ----------
export const listDoctorsAdmin = () =>
  query(
    `SELECT d.doctor_id, d.name, d.years_experience, d.availability_status, d.speciality_id, s.speciality_name,
            COALESCE(json_agg(json_build_object('clinic_id', c.clinic_id, 'clinic_name', c.clinic_name, 'since_date', w.since_date)
                              ORDER BY c.clinic_name) FILTER (WHERE c.clinic_id IS NOT NULL), '[]') AS clinics
     FROM doctors d
     JOIN specialities s ON s.speciality_id = d.speciality_id
     LEFT JOIN works_at w ON w.doctor_id = d.doctor_id
     LEFT JOIN clinics c ON c.clinic_id = w.clinic_id
     GROUP BY d.doctor_id, s.speciality_name
     ORDER BY d.name`,
  );

type DoctorInput = { name: string; yearsExperience: number; availabilityStatus: string; specialityId: number };

export const createDoctor = (d: DoctorInput) =>
  queryOne(
    `INSERT INTO doctors (name, years_experience, availability_status, speciality_id)
     VALUES ($1, $2, $3, $4) RETURNING doctor_id`,
    [d.name, d.yearsExperience, d.availabilityStatus, d.specialityId],
  );

export async function updateDoctor(id: number, d: DoctorInput) {
  const row = await queryOne(
    `UPDATE doctors SET name = $2, years_experience = $3, availability_status = $4, speciality_id = $5
     WHERE doctor_id = $1 RETURNING doctor_id`,
    [id, d.name, d.yearsExperience, d.availabilityStatus, d.specialityId],
  );
  if (!row) throw new AppError(404, 'Doctor not found.');
}

export async function deleteDoctor(id: number) {
  // appointments reference works_at with RESTRICT, so a doctor with appointments cannot be deleted
  const row = await queryOne('DELETE FROM doctors WHERE doctor_id = $1 RETURNING doctor_id', [id]);
  if (!row) throw new AppError(404, 'Doctor not found.');
}

// ---------- clinics ----------
export const listClinics = () => query('SELECT clinic_id, clinic_name, address, phone FROM clinics ORDER BY clinic_name');

export const createClinic = (c: { clinicName: string; address: string; phone?: string }) =>
  queryOne('INSERT INTO clinics (clinic_name, address, phone) VALUES ($1, $2, $3) RETURNING clinic_id', [c.clinicName, c.address, c.phone ?? null]);

export async function updateClinic(id: number, c: { clinicName: string; address: string; phone?: string }) {
  const row = await queryOne(
    'UPDATE clinics SET clinic_name = $2, address = $3, phone = $4 WHERE clinic_id = $1 RETURNING clinic_id',
    [id, c.clinicName, c.address, c.phone ?? null],
  );
  if (!row) throw new AppError(404, 'Clinic not found.');
}

export async function deleteClinic(id: number) {
  const row = await queryOne('DELETE FROM clinics WHERE clinic_id = $1 RETURNING clinic_id', [id]);
  if (!row) throw new AppError(404, 'Clinic not found.');
}

// ---------- specialities ----------
export const listSpecialitiesAdmin = () =>
  query(
    `SELECT s.speciality_id, s.speciality_name, count(d.doctor_id) AS doctors
     FROM specialities s LEFT JOIN doctors d ON d.speciality_id = s.speciality_id
     GROUP BY s.speciality_id ORDER BY s.speciality_name`,
  );

export const createSpeciality = (name: string) =>
  queryOne('INSERT INTO specialities (speciality_name) VALUES ($1) RETURNING speciality_id', [name]);

export async function updateSpeciality(id: number, name: string) {
  const row = await queryOne('UPDATE specialities SET speciality_name = $2 WHERE speciality_id = $1 RETURNING speciality_id', [id, name]);
  if (!row) throw new AppError(404, 'Speciality not found.');
}

export async function deleteSpeciality(id: number) {
  const row = await queryOne('DELETE FROM specialities WHERE speciality_id = $1 RETURNING speciality_id', [id]);
  if (!row) throw new AppError(404, 'Speciality not found.');
}

// ---------- works_at ----------
export const addWorksAt = (doctorId: number, clinicId: number, sinceDate?: string) =>
  queryOne(
    'INSERT INTO works_at (doctor_id, clinic_id, since_date) VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE)) RETURNING doctor_id',
    [doctorId, clinicId, sinceDate ?? null],
  );

export async function removeWorksAt(doctorId: number, clinicId: number) {
  const row = await queryOne('DELETE FROM works_at WHERE doctor_id = $1 AND clinic_id = $2 RETURNING doctor_id', [doctorId, clinicId]);
  if (!row) throw new AppError(404, 'That doctor/clinic link does not exist.');
}
