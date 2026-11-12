-- =====================================================================
-- seed.sql -- development / demo data.  Wipes all data and re-inserts it.
-- Demo logins (bcrypt-hashed by pgcrypto, compatible with bcryptjs):
--   patient: aarav.sharma@example.com  / Patient@123
--   admin:   admin@symptomfinder.example / Admin@123
-- These credentials are for local demos only.
-- =====================================================================
TRUNCATE prescriptions, appointments, works_at, doctors, clinics, patients, admins, specialities
    RESTART IDENTITY CASCADE;

INSERT INTO specialities (speciality_name) VALUES
 ('General Medicine'), ('Cardiology'), ('Dermatology'), ('Neurology'), ('Orthopedics'),
 ('Pulmonology'), ('Gastroenterology'), ('ENT'), ('Ophthalmology'), ('Psychiatry'),
 ('Gynecology'), ('Pediatrics'), ('Urology');

INSERT INTO clinics (clinic_name, address, phone) VALUES
 ('Lotus Care Clinic',            '12 MG Road, Bengaluru 560001',                    '+91 80 4123 4501'),
 ('Greenleaf Medical Centre',     '45 Jayanagar 4th Block, Bengaluru 560011',        '+91 80 4123 4502'),
 ('Sunrise Health Hub',           '8 Indiranagar 100 Feet Road, Bengaluru 560038',   '+91 80 4123 4503'),
 ('Banashankari Family Clinic',   '22 Banashankari 2nd Stage, Bengaluru 560070',     '+91 80 4123 4504'),
 ('Whitefield Wellness Centre',   '101 ITPL Main Road, Whitefield, Bengaluru 560066','+91 80 4123 4505'),
 ('Koramangala Specialists Clinic','17 80 Feet Road, Koramangala, Bengaluru 560034', '+91 80 4123 4506');

INSERT INTO doctors (doctor_id, name, years_experience, availability_status, speciality_id)
SELECT v.id, v.name, v.years, v.avail, s.speciality_id
FROM (VALUES
 ( 1, 'Dr. Ravi Menon',          18, 'available',   'Cardiology'),
 ( 2, 'Dr. Ananya Iyer',         12, 'available',   'Cardiology'),
 ( 3, 'Dr. Kavita Rao',          15, 'available',   'Dermatology'),
 ( 4, 'Dr. Sameer Khan',          9, 'available',   'Dermatology'),
 ( 5, 'Dr. Arjun Nair',          20, 'available',   'Neurology'),
 ( 6, 'Dr. Meera Krishnan',      11, 'available',   'Neurology'),
 ( 7, 'Dr. Vikram Shetty',       14, 'available',   'Orthopedics'),
 ( 8, 'Dr. Priya Desai',          8, 'available',   'Pulmonology'),
 ( 9, 'Dr. Rohit Banerjee',      16, 'available',   'Gastroenterology'),
 (10, 'Dr. Sunita Patil',        10, 'available',   'ENT'),
 (11, 'Dr. Farah Siddiqui',      13, 'available',   'Ophthalmology'),
 (12, 'Dr. Karthik Subramanian', 22, 'available',   'Psychiatry'),
 (13, 'Dr. Lakshmi Narayan',     17, 'available',   'Gynecology'),
 (14, 'Dr. Neha Gupta',           7, 'available',   'Pediatrics'),
 (15, 'Dr. Anil Kumar',          19, 'available',   'Urology'),
 (16, 'Dr. Deepa Reddy',          6, 'available',   'General Medicine'),
 (17, 'Dr. Mohan Das',           25, 'available',   'General Medicine'),
 (18, 'Dr. Shreya Joshi',         5, 'on_leave',    'Dermatology'),
 (19, 'Dr. Imran Pasha',         21, 'on_leave',    'Orthopedics'),
 (20, 'Dr. Tara Fernandes',       4, 'unavailable', 'Pediatrics')
) AS v(id, name, years, avail, spec)
JOIN specialities s ON s.speciality_name = v.spec;
SELECT setval(pg_get_serial_sequence('doctors', 'doctor_id'), 20);   -- explicit ids were used above

INSERT INTO works_at (doctor_id, clinic_id, since_date)
SELECT v.d, v.c, CURRENT_DATE - (v.d * 180 + v.c * 30)
FROM (VALUES (1,1),(1,2),(2,1),(3,2),(3,3),(4,3),(5,6),(5,1),(6,6),(7,4),(8,2),(9,1),(10,3),
             (11,6),(12,5),(13,4),(13,5),(14,5),(15,2),(16,1),(16,4),(17,3),(17,5),(18,2),
             (19,4),(20,5)) AS v(d, c);

INSERT INTO patients (name, age, contact_info, email, password_hash) VALUES
 ('Aarav Sharma',   29, '+91 98450 11001', 'aarav.sharma@example.com',  crypt('Patient@123', gen_salt('bf', 10))),
 ('Diya Patel',     34, '+91 98450 11002', 'diya.patel@example.com',    crypt('Patient@123', gen_salt('bf', 10))),
 ('Rohan Mehta',    45, '+91 98450 11003', 'rohan.mehta@example.com',   crypt('Patient@123', gen_salt('bf', 10))),
 ('Ishita Nair',    22, '+91 98450 11004', 'ishita.nair@example.com',   crypt('Patient@123', gen_salt('bf', 10))),
 ('Kabir Singh',    51, '+91 98450 11005', 'kabir.singh@example.com',   crypt('Patient@123', gen_salt('bf', 10))),
 ('Meghna Rao',     38, '+91 98450 11006', 'meghna.rao@example.com',    crypt('Patient@123', gen_salt('bf', 10))),
 ('Siddharth Jain', 27, '+91 98450 11007', 'siddharth.jain@example.com',crypt('Patient@123', gen_salt('bf', 10))),
 ('Tanvi Kulkarni', 61, '+91 98450 11008', 'tanvi.kulkarni@example.com',crypt('Patient@123', gen_salt('bf', 10))),
 ('Vivaan Reddy',   8,  '+91 98450 11009', 'vivaan.reddy@example.com',  crypt('Patient@123', gen_salt('bf', 10))),
 ('Zoya Ahmed',     41, '+91 98450 11010', 'zoya.ahmed@example.com',    crypt('Patient@123', gen_salt('bf', 10)));

INSERT INTO admins (name, email, password_hash) VALUES
 ('Clinic Admin', 'admin@symptomfinder.example', crypt('Admin@123', gen_salt('bf', 10))),
 ('Front Desk',   'staff@symptomfinder.example', crypt('Admin@123', gen_salt('bf', 10)));

-- ---------- Appointments: 60 past (completed / no_show / cancelled) + 15 future ----------
DO $$
DECLARE
    i int; v_doc int; v_pat int; v_clinic int; v_status text; v_time timestamp;
BEGIN
    FOR i IN 1..75 LOOP
        IF i <= 60 THEN
            v_doc := CASE WHEN i <= 8 THEN 1 WHEN i <= 14 THEN 2 ELSE ((i * 7) % 17) + 1 END;
            v_status := CASE WHEN i % 9 = 0 THEN 'no_show' WHEN i % 11 = 0 THEN 'cancelled' ELSE 'completed' END;
            v_time := date_trunc('hour', now()) - make_interval(days => i) - interval '3 hours';
        ELSE
            v_doc := ((i * 7) % 17) + 1;
            v_status := 'scheduled';
            v_time := date_trunc('hour', now()) + make_interval(days => i - 60) + interval '1 hour';
        END IF;
        v_pat := (i % 10) + 1;
        SELECT clinic_id INTO v_clinic FROM works_at WHERE doctor_id = v_doc ORDER BY clinic_id LIMIT 1;

        INSERT INTO appointments (patient_id, doctor_id, clinic_id, appointment_time, status)
        VALUES (v_pat, v_doc, v_clinic, v_time, v_status);
    END LOOP;
END $$;

INSERT INTO prescriptions (appointment_id, medicine_details, notes, issued_at)
SELECT a.appointment_id,
       (ARRAY['Paracetamol 500 mg, twice daily for 3 days',
              'Cetirizine 10 mg, once at night for 5 days',
              'Pantoprazole 40 mg, before breakfast for 14 days',
              'Ibuprofen 400 mg after meals, twice daily for 5 days',
              'Amlodipine 5 mg, once daily',
              'Saline nasal spray, 2 puffs thrice daily'])[1 + (a.appointment_id % 6)],
       'Review if symptoms persist beyond one week.',
       a.appointment_time + interval '45 minutes'
FROM appointments a
WHERE a.status = 'completed' AND a.appointment_id % 2 = 0;
