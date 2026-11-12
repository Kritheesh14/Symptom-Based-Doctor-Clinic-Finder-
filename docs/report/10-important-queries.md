# 10. Important queries

Every query below is stored in `db/queries/important_queries.sql` and was executed against the seeded database (PostgreSQL 16). The result tables are real output. Because the seed generates dates relative to the moment it runs, dates and counts are from the run of 2026-11-10.

## Q1. JOIN over 5 tables

Question: what is the full appointment history of patient 1 (doctor, speciality, clinic, prescription)?  

```sql
SELECT a.appointment_id, a.appointment_time, a.status,
       d.name AS doctor, s.speciality_name, c.clinic_name, pr.medicine_details
FROM appointments a
JOIN doctors d       ON d.doctor_id = a.doctor_id
JOIN specialities s  ON s.speciality_id = d.speciality_id
JOIN clinics c       ON c.clinic_id = a.clinic_id
LEFT JOIN prescriptions pr ON pr.appointment_id = a.appointment_id
WHERE a.patient_id = 1
ORDER BY a.appointment_time DESC;
```

Result:

```text
appointment_id |  appointment_time   |  status   |       doctor        | speciality_name  |          clinic_name           |                 medicine_details                 
----------------+---------------------+-----------+---------------------+------------------+--------------------------------+--------------------------------------------------
             70 | 2026-11-19 18:00:00 | scheduled | Dr. Anil Kumar      | Urology          | Greenleaf Medical Centre       | 
             10 | 2026-10-30 14:00:00 | completed | Dr. Ananya Iyer     | Cardiology       | Lotus Care Clinic              | Amlodipine 5 mg, once daily
             20 | 2026-10-20 14:00:00 | completed | Dr. Arjun Nair      | Neurology        | Lotus Care Clinic              | Pantoprazole 40 mg, before breakfast for 14 days
             30 | 2026-10-10 14:00:00 | completed | Dr. Vikram Shetty   | Orthopedics      | Banashankari Family Clinic     | Paracetamol 500 mg, twice daily for 3 days
             40 | 2026-09-30 14:00:00 | completed | Dr. Rohit Banerjee  | Gastroenterology | Lotus Care Clinic              | Amlodipine 5 mg, once daily
             50 | 2026-09-20 14:00:00 | completed | Dr. Farah Siddiqui  | Ophthalmology    | Koramangala Specialists Clinic | Pantoprazole 40 mg, before breakfast for 14 days
             60 | 2026-09-10 14:00:00 | completed | Dr. Lakshmi Narayan | Gynecology       | Banashankari Family Clinic     | Paracetamol 500 mg, twice daily for 3 days
(7 rows)
```

## Q2. GROUP BY + aggregate

Question: which specialities were busiest in the last 30 days?  

```sql
SELECT s.speciality_name, count(*) AS appointments
FROM appointments a
JOIN doctors d      ON d.doctor_id = a.doctor_id
JOIN specialities s ON s.speciality_id = d.speciality_id
WHERE a.appointment_time >= now() - interval '30 days' AND a.appointment_time < now()
GROUP BY s.speciality_name
ORDER BY appointments DESC, s.speciality_name;
```

Result:

```text
speciality_name  | appointments 
------------------+--------------
 Cardiology       |           16
 Dermatology      |            2
 General Medicine |            2
 Neurology        |            2
 ENT              |            1
 Gastroenterology |            1
 Gynecology       |            1
 Ophthalmology    |            1
 Psychiatry       |            1
 Pulmonology      |            1
 Urology          |            1
(11 rows)
```

## Q3. GROUP BY + HAVING + ORDER BY

Question: which doctors have completed more than 5 appointments?  

```sql
SELECT d.doctor_id, d.name, count(*) AS completed_appointments
FROM appointments a
JOIN doctors d ON d.doctor_id = a.doctor_id
WHERE a.status = 'completed'
GROUP BY d.doctor_id, d.name
HAVING count(*) > 5
ORDER BY completed_appointments DESC, d.name;
```

Result:

```text
doctor_id |      name       | completed_appointments 
-----------+-----------------+------------------------
         1 | Dr. Ravi Menon  |                     11
         2 | Dr. Ananya Iyer |                      6
(2 rows)
```

## Q4. Subquery with NOT EXISTS

Question: which patients have never missed an appointment (no no-show)?  

```sql
SELECT p.patient_id, p.name
FROM patients p
WHERE NOT EXISTS (SELECT 1 FROM appointments a
                  WHERE a.patient_id = p.patient_id AND a.status = 'no_show')
ORDER BY p.name;
```

Result:

```text
patient_id |     name     
------------+--------------
          1 | Aarav Sharma
          4 | Ishita Nair
         15 | QA One
          3 | Rohan Mehta
(4 rows)
```

## Q5. Correlated subquery

Question: when was each doctor's most recent appointment?  

```sql
SELECT d.doctor_id, d.name,
       (SELECT max(a.appointment_time) FROM appointments a WHERE a.doctor_id = d.doctor_id) AS last_appointment
FROM doctors d
ORDER BY last_appointment DESC NULLS LAST, d.name;
```

Result:

```text
doctor_id |          name           |  last_appointment   
-----------+-------------------------+---------------------
         3 | Dr. Kavita Rao          | 2027-02-13 11:30:00
        16 | Dr. Deepa Reddy         | 2026-11-24 18:00:00
         9 | Dr. Rohit Banerjee      | 2026-11-23 18:00:00
         2 | Dr. Ananya Iyer         | 2026-11-22 18:00:00
        12 | Dr. Karthik Subramanian | 2026-11-21 18:00:00
         5 | Dr. Arjun Nair          | 2026-11-20 18:00:00
        15 | Dr. Anil Kumar          | 2026-11-19 18:00:00
         8 | Dr. Priya Desai         | 2026-11-18 18:00:00
         1 | Dr. Ravi Menon          | 2026-11-17 18:00:00
        11 | Dr. Farah Siddiqui      | 2026-11-16 18:00:00
         4 | Dr. Sameer Khan         | 2026-11-15 18:00:00
        14 | Dr. Neha Gupta          | 2026-11-14 18:00:00
         7 | Dr. Vikram Shetty       | 2026-11-13 18:00:00
        17 | Dr. Mohan Das           | 2026-11-12 18:00:00
        10 | Dr. Sunita Patil        | 2026-11-11 18:00:00
         6 | Dr. Meera Krishnan      | 2026-10-15 14:00:00
        13 | Dr. Lakshmi Narayan     | 2026-10-14 14:00:00
        19 | Dr. Imran Pasha         | 
        18 | Dr. Shreya Joshi        | 
        20 | Dr. Tara Fernandes      | 
(20 rows)
```

## Q6. Aggregate + CASE

Question: what is each doctor's no-show rate (past appointments only)?  

```sql
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
```

Result:

```text
name           | attended_or_missed | no_shows | no_show_pct |  band  
-------------------------+--------------------+----------+-------------+--------
 Dr. Kavita Rao          |                  3 |        2 |        66.7 | high
 Dr. Sunita Patil        |                  2 |        1 |        50.0 | high
 Dr. Anil Kumar          |                  3 |        1 |        33.3 | high
 Dr. Arjun Nair          |                  3 |        1 |        33.3 | high
 Dr. Priya Desai         |                  3 |        1 |        33.3 | high
 Dr. Ananya Iyer         |                  7 |        1 |        14.3 | normal
 Dr. Deepa Reddy         |                  3 |        0 |         0.0 | none
 Dr. Farah Siddiqui      |                  2 |        0 |         0.0 | none
 Dr. Karthik Subramanian |                  2 |        0 |         0.0 | none
 Dr. Lakshmi Narayan     |                  3 |        0 |         0.0 | none
 Dr. Meera Krishnan      |                  3 |        0 |         0.0 | none
 Dr. Mohan Das           |                  2 |        0 |         0.0 | none
 Dr. Neha Gupta          |                  2 |        0 |         0.0 | none
 Dr. Ravi Menon          |                 11 |        0 |         0.0 | none
 Dr. Rohit Banerjee      |                  3 |        0 |         0.0 | none
 Dr. Sameer Khan         |                  3 |        0 |         0.0 | none
 Dr. Vikram Shetty       |                  2 |        0 |         0.0 | none
(17 rows)
```

## Q7. Many-to-many join + COUNT DISTINCT

Question: which clinics offer the widest range of specialities?  

```sql
SELECT c.clinic_name, count(DISTINCT d.speciality_id) AS specialities, count(DISTINCT d.doctor_id) AS doctors
FROM clinics c
JOIN works_at w ON w.clinic_id = c.clinic_id
JOIN doctors d  ON d.doctor_id = w.doctor_id
GROUP BY c.clinic_id, c.clinic_name
ORDER BY specialities DESC, c.clinic_name;
```

Result:

```text
clinic_name           | specialities | doctors 
--------------------------------+--------------+---------
 Greenleaf Medical Centre       |            4 |       5
 Lotus Care Clinic              |            4 |       5
 Whitefield Wellness Centre     |            4 |       5
 Banashankari Family Clinic     |            3 |       4
 Sunrise Health Hub             |            3 |       4
 Koramangala Specialists Clinic |            2 |       3
(6 rows)
```

## Q8. Views in use

Question: what is coming up next, and what do the dashboard counters say?  

```sql
SELECT * FROM v_upcoming_appointments ORDER BY appointment_time LIMIT 5;
SELECT * FROM v_admin_stats;
```

Result:

```text
appointment_id |  appointment_time   |  status   | patient_id |  patient_name  | doctor_id |    doctor_name    | speciality_name  | clinic_id |        clinic_name         
----------------+---------------------+-----------+------------+----------------+-----------+-------------------+------------------+-----------+----------------------------
             62 | 2026-11-11 18:00:00 | scheduled |          3 | Rohan Mehta    |        10 | Dr. Sunita Patil  | ENT              |         3 | Sunrise Health Hub
             63 | 2026-11-12 18:00:00 | scheduled |          4 | Ishita Nair    |        17 | Dr. Mohan Das     | General Medicine |         3 | Sunrise Health Hub
             64 | 2026-11-13 18:00:00 | scheduled |          5 | Kabir Singh    |         7 | Dr. Vikram Shetty | Orthopedics      |         4 | Banashankari Family Clinic
             65 | 2026-11-14 18:00:00 | scheduled |          6 | Meghna Rao     |        14 | Dr. Neha Gupta    | Pediatrics       |         5 | Whitefield Wellness Centre
             66 | 2026-11-15 18:00:00 | scheduled |          7 | Siddharth Jain |         4 | Dr. Sameer Khan   | Dermatology      |         3 | Sunrise Health Hub
(5 rows)

 total_patients | total_doctors | total_clinics | total_appointments | scheduled | completed | cancelled | no_show | total_prescriptions 
----------------+---------------+---------------+--------------------+-----------+-----------+-----------+---------+---------------------
             11 |            20 |             6 |                 77 |        14 |        50 |         6 |       7 |                  26
(1 row)
```

## Q9. Full-text search

Question: find doctors by a free-text query (name, speciality or clinic address).  

```sql
SELECT doctor_id, name, speciality_name, clinics, round(rank::numeric, 3) AS rank
FROM search_doctors('cardio');
SELECT doctor_id, name, speciality_name, clinics, round(rank::numeric, 3) AS rank
FROM search_doctors('ravi koramangala');
```

Result:

```text
doctor_id |      name       | speciality_name |                   clinics                   | rank  
-----------+-----------------+-----------------+---------------------------------------------+-------
         2 | Dr. Ananya Iyer | Cardiology      | Lotus Care Clinic                           | 0.061
         1 | Dr. Ravi Menon  | Cardiology      | Greenleaf Medical Centre, Lotus Care Clinic | 0.061
(2 rows)

 doctor_id |        name        | speciality_name |                      clinics                      | rank  
-----------+--------------------+-----------------+---------------------------------------------------+-------
         1 | Dr. Ravi Menon     | Cardiology      | Greenleaf Medical Centre, Lotus Care Clinic       | 0.061
         5 | Dr. Arjun Nair     | Neurology       | Koramangala Specialists Clinic, Lotus Care Clinic | 0.038
        11 | Dr. Farah Siddiqui | Ophthalmology   | Koramangala Specialists Clinic                    | 0.038
         6 | Dr. Meera Krishnan | Neurology       | Koramangala Specialists Clinic                    | 0.038
(4 rows)
```

## D1. INSERT: add a new clinic


```sql
BEGIN;
INSERT INTO clinics (clinic_name, address, phone)
VALUES ('Hebbal Health Point', '5 Bellary Road, Hebbal, Bengaluru 560024', '+91 80 4123 4507')
RETURNING clinic_id, clinic_name;
ROLLBACK;
```

Result:

```text
clinic_id |     clinic_name     
-----------+---------------------
        34 | Hebbal Health Point
(1 row)
```

## D2. UPDATE: a doctor goes on leave


```sql
BEGIN;
UPDATE doctors SET availability_status = 'on_leave' WHERE name = 'Dr. Ravi Menon'
RETURNING doctor_id, name, availability_status;
ROLLBACK;
```

Result:

```text
doctor_id |      name      | availability_status 
-----------+----------------+---------------------
         1 | Dr. Ravi Menon | on_leave
(1 row)
```

## D3. DELETE: remove a works_at link (blocked if appointments reference it -> FK RESTRICT)


```sql
BEGIN;
DELETE FROM works_at WHERE doctor_id = 13 AND clinic_id = 5
RETURNING doctor_id, clinic_id;
ROLLBACK;
```

Result:

```text
doctor_id | clinic_id 
-----------+-----------
        13 |         5
(1 row)
```

## Full-text search plan (GIN index in use)

The tables are tiny, so PostgreSQL would normally choose a sequential scan. `SET enable_seqscan = off` shows that the GIN indexes `idx_doctors_search` and `idx_clinics_search` are usable; with thousands of rows the planner chooses them by itself.

```sql
SET enable_seqscan = off;
EXPLAIN ANALYZE SELECT d.doctor_id, d.name FROM doctors d WHERE d.search_vector @@ to_tsquery('simple', 'ravi:*');
```

```text
QUERY PLAN                                                         
----------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on doctors d  (cost=21.20..29.67 rows=5 width=222) (actual time=0.230..0.231 rows=1 loops=1)
   Recheck Cond: (search_vector @@ '''ravi'':*'::tsquery)
   Heap Blocks: exact=1
   ->  Bitmap Index Scan on idx_doctors_search  (cost=0.00..21.20 rows=5 width=0) (actual time=0.121..0.121 rows=1 loops=1)
         Index Cond: (search_vector @@ '''ravi'':*'::tsquery)
 Planning Time: 4.053 ms
 Execution Time: 0.403 ms
(7 rows)
```
