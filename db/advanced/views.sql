-- =====================================================================
-- views.sql  --  Four reporting views (advanced feature: views)
-- =====================================================================

CREATE OR REPLACE VIEW v_doctor_directory AS
SELECT d.doctor_id,
       d.name                AS doctor_name,
       d.years_experience,
       d.availability_status,
       s.speciality_id,
       s.speciality_name,
       COALESCE(string_agg(DISTINCT c.clinic_name, ', ' ORDER BY c.clinic_name), '') AS clinics
FROM doctors d
JOIN specialities s   ON s.speciality_id = d.speciality_id
LEFT JOIN works_at w  ON w.doctor_id = d.doctor_id
LEFT JOIN clinics c   ON c.clinic_id = w.clinic_id
GROUP BY d.doctor_id, d.name, d.years_experience, d.availability_status,
         s.speciality_id, s.speciality_name;

CREATE OR REPLACE VIEW v_upcoming_appointments AS
SELECT a.appointment_id,
       a.appointment_time,
       a.status,
       p.patient_id,
       p.name            AS patient_name,
       d.doctor_id,
       d.name            AS doctor_name,
       s.speciality_name,
       c.clinic_id,
       c.clinic_name
FROM appointments a
JOIN patients p      ON p.patient_id = a.patient_id
JOIN doctors d       ON d.doctor_id  = a.doctor_id
JOIN specialities s  ON s.speciality_id = d.speciality_id
JOIN clinics c       ON c.clinic_id  = a.clinic_id
WHERE a.status = 'scheduled' AND a.appointment_time >= now();

CREATE OR REPLACE VIEW v_patient_history AS
SELECT a.appointment_id,
       a.patient_id,
       a.appointment_time,
       a.status,
       d.doctor_id,
       d.name            AS doctor_name,
       s.speciality_name,
       c.clinic_id,
       c.clinic_name,
       c.address         AS clinic_address,
       pr.prescription_id,
       pr.medicine_details,
       pr.notes          AS prescription_notes,
       pr.issued_at
FROM appointments a
JOIN doctors d       ON d.doctor_id  = a.doctor_id
JOIN specialities s  ON s.speciality_id = d.speciality_id
JOIN clinics c       ON c.clinic_id  = a.clinic_id
LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id;

-- DROP / recreate demo.  CREATE OR REPLACE cannot change a view's column list, so
-- a view whose shape changes is dropped and re-created, as done here.
DROP VIEW IF EXISTS v_admin_stats;
CREATE VIEW v_admin_stats AS
SELECT (SELECT count(*) FROM patients)                                AS total_patients,
       (SELECT count(*) FROM doctors)                                 AS total_doctors,
       (SELECT count(*) FROM clinics)                                 AS total_clinics,
       (SELECT count(*) FROM appointments)                            AS total_appointments,
       (SELECT count(*) FROM appointments WHERE status = 'scheduled') AS scheduled,
       (SELECT count(*) FROM appointments WHERE status = 'completed') AS completed,
       (SELECT count(*) FROM appointments WHERE status = 'cancelled') AS cancelled,
       (SELECT count(*) FROM appointments WHERE status = 'no_show')   AS no_show,
       (SELECT count(*) FROM prescriptions)                           AS total_prescriptions;

COMMENT ON VIEW v_doctor_directory      IS 'Doctors with speciality and the clinics they work at (one row per doctor).';
COMMENT ON VIEW v_upcoming_appointments IS 'Scheduled appointments in the future, with patient, doctor, speciality and clinic names.';
COMMENT ON VIEW v_patient_history       IS 'Every appointment with doctor, clinic and optional prescription. Filter by patient_id.';
COMMENT ON VIEW v_admin_stats           IS 'Single-row dashboard counters for the admin home page.';
