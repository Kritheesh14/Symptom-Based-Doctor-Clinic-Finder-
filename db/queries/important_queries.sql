-- =====================================================================
-- important_queries.sql -- analytical queries used in the report.
-- Each query states the question it answers and the SQL concept shown.
-- =====================================================================
 
-- Q1. JOIN over 5 tables --------------------------------------------------
-- Question: what is the full appointment history of patient 1 (doctor, speciality, clinic, prescription)?
SELECT a.appointment_id, a.appointment_time, a.status,
       d.name AS doctor, s.speciality_name, c.clinic_name, pr.medicine_details
FROM appointments a
JOIN doctors d       ON d.doctor_id = a.doctor_id
JOIN specialities s  ON s.speciality_id = d.speciality_id
JOIN clinics c       ON c.clinic_id = a.clinic_id
LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id
WHERE a.patient_id = 1
ORDER BY a.appointment_time DESC;
 
-- Q2. GROUP BY + aggregate --------------------------------------------------
-- Question: which specialities were busiest in the last 30 days?
SELECT s.speciality_name, count(*) AS appointments
FROM appointments a
JOIN doctors d      ON d.doctor_id = a.doctor_id
JOIN specialities s ON s.speciality_id = d.speciality_id
WHERE a.appointment_time >= now() - interval '30 days' AND a.appointment_time < now()
GROUP BY s.speciality_name
ORDER BY appointments DESC, s.speciality_name;
 
-- Q3. GROUP BY + HAVING + ORDER BY ----------------------------------------
-- Question: which doctors have completed more than 5 appointments?
SELECT d.doctor_id, d.name, count(*) AS completed_appointments
FROM appointments a
JOIN doctors d ON d.doctor_id = a.doctor_id
WHERE a.status = 'completed'
GROUP BY d.doctor_id, d.name
HAVING count(*) > 5
ORDER BY completed_appointments DESC, d.name;
 
-- Q4. Subquery with NOT EXISTS ---------------------------------------------
-- Question: which patients have never missed an appointment (no no-show)?
SELECT p.patient_id, p.name
FROM patients p
WHERE NOT EXISTS (SELECT 1 FROM appointments a
                  WHERE a.patient_id = p.patient_id AND a.status = 'no_show')
ORDER BY p.name;
 
-- Q5. Correlated subquery -----------------------------------------------------
-- Question: when was each doctor's most recent appointment?
SELECT d.doctor_id, d.name,
       (SELECT max(a.appointment_time) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS last_appointment
FROM doctors d
ORDER BY last_appointment DESC NULLS LAST, d.name;
 
-- Q6. Aggregate + CASE -----------------------------------------------------------
-- Question: what is each doctor's no-show rate (past appointments only)?
SELECT d.name,
       count(*) FILTER (WHERE a.status IN ('completed','no_show'))           AS attended_or_missed,
       count(*) FILTER (WHERE a.status = 'no_show')                           AS no_shows,
       round(100.0 * count(*) FILTER (WHERE a.status = 'no_show')
             / NULLIF(count(*) FILTER (WHERE a.status IN ('completed','no_show')), 0), 1) AS no_show_pct,
       CASE WHEN count(*) FILTER (WHERE a.status = 'no_show') = 0 THEN 'none'
            WHEN 100.0 * count(*) FILTER (WHERE a.status = 'no_show')
                 / NULLIF(count(*) FILTER (WHERE a.status IN ('completed','no_show')), 0) >= 20 THEN 'high'
            ELSE 'normal' END AS band
FROM doctors d
JOIN appointments a ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.name
HAVING count(*) FILTER (WHERE a.status IN ('completed','no_show')) > 0
ORDER BY no_show_pct DESC NULLS LAST, d.name;
 
-- Q7. Many-to-many join + COUNT DISTINCT ------------------------------------------
-- Question: which clinics offer the widest range of specialities?
SELECT c.clinic_name, count(DISTINCT d.speciality_id) AS specialities, count(DISTINCT d.doctor_id) AS doctors
FROM clinics c
JOIN works_at w ON w.clinic_id = c.clinic_id
JOIN doctors d  ON d.doctor_id = w.doctor_id
GROUP BY c.clinic_id, c.clinic_name
ORDER BY specialities DESC, c.clinic_name;
 
-- Q8. Views in use ----------------------------------------------------------------
-- Question: what is coming up next, and what do the dashboard counters say?
SELECT * FROM v_upcoming_appointments ORDER BY appointment_time LIMIT 5;
SELECT * FROM v_admin_stats;
 
-- Q9. Full-text search -------------------------------------------------------------
-- Question: find doctors by a free-text query (name, speciality or clinic address).
SELECT doctor_id, name, speciality_name, clinics, round(rank::numeric, 3) AS rank
FROM search_doctors('cardio');
SELECT doctor_id, name, speciality_name, clinics, round(rank::numeric, 3) AS rank
FROM search_doctors('ravi koramangala');
 
-- ---------- DML examples (each rolled back so the data is unchanged) -------------
-- D1. INSERT: add a new clinic
BEGIN;
INSERT INTO clinics (clinic_name, address, phone)
VALUES ('Hebbal Health Point', '5 Bellary Road, Hebbal, Bengaluru 560024', '+91 80 4123 4507')
RETURNING clinic_id, clinic_name;
ROLLBACK;
 
-- D2. UPDATE: a doctor goes on leave
BEGIN;
UPDATE doctors SET availability_status = 'on_leave' WHERE name = 'Dr. Ravi Menon'
RETURNING doctor_id, name, availability_status;
ROLLBACK;
 
-- D3. DELETE: remove a works_at link (blocked if appointments reference it -> FK RESTRICT)
BEGIN;
DELETE FROM works_at WHERE doctor_id = 13 AND clinic_id = 5
RETURNING doctor_id, clinic_id;
ROLLBACK;
