-- =====================================================================
-- test_constraints_triggers.sql -- integrity: CHECKs, FKs, triggers, transactions.
-- Rolled back at the end.  Prints PASS/FAIL notices; exits non-zero on first FAIL.
-- =====================================================================
\set ON_ERROR_STOP on
BEGIN;
 
DO $$
DECLARE
    v_id int; v_state text; v_ok boolean;
BEGIN
    -- C1: invalid e-mail rejected with 23514 (check violation)
    BEGIN
        INSERT INTO patients (name, age, email, password_hash) VALUES ('X', 30, 'not-an-email', 'x');
        RAISE EXCEPTION 'FAIL C1: invalid email accepted';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS C1: invalid email -> 23514'; END;
 
    -- C2: age out of range
    BEGIN
        INSERT INTO patients (name, age, email, password_hash) VALUES ('X', 200, 'x@example.com', 'x');
        RAISE EXCEPTION 'FAIL C2: age 200 accepted';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS C2: age 200 -> 23514'; END;
 
    -- C3: bad phone format
    BEGIN
        INSERT INTO patients (name, age, contact_info, email, password_hash) VALUES ('X', 30, 'call me', 'y@example.com', 'x');
        RAISE EXCEPTION 'FAIL C3: bad contact accepted';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS C3: bad contact_info -> 23514'; END;
 
    -- C4: duplicate e-mail -> 23505
    BEGIN
        INSERT INTO patients (name, age, email, password_hash) VALUES ('Dup', 30, 'aarav.sharma@example.com', 'x');
        RAISE EXCEPTION 'FAIL C4: duplicate email accepted';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS C4: duplicate email -> 23505'; END;
 
    -- C5: years_experience > 60 rejected
    BEGIN
        INSERT INTO doctors (name, years_experience, speciality_id) VALUES ('Old', 61, 1);
        RAISE EXCEPTION 'FAIL C5: 61 years accepted';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS C5: years_experience 61 -> 23514'; END;
 
    -- C6: deleting a speciality that still has doctors is blocked (RESTRICT) -> 23503
    BEGIN
        DELETE FROM specialities WHERE speciality_name = 'Cardiology';
        RAISE EXCEPTION 'FAIL C6: speciality with doctors deleted';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS C6: FK RESTRICT on specialities -> 23503'; END;
 
    -- C7: booking at a clinic where the doctor does not work -> 23503 (composite FK to works_at)
    BEGIN
        PERFORM book_appointment(1, 1, 6, (now() + interval '10 days')::timestamp);   -- doctor 1 works at clinics 1,2
        RAISE EXCEPTION 'FAIL C7: booked at wrong clinic';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'PASS C7: doctor/clinic pair must exist in works_at'; END;
 
    -- T1: booking in the past blocked by trigger
    BEGIN
        PERFORM book_appointment(1, 1, 1, (now() - interval '1 day')::timestamp);
        RAISE EXCEPTION 'FAIL T1: past booking accepted';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN RAISE NOTICE 'PASS T1: past booking rejected by trigger'; END;
 
    -- T2: double-booking the same slot -> unique violation
    v_id := book_appointment(2, 1, 1, (date_trunc('hour', now()) + interval '50 days')::timestamp);
    BEGIN
        PERFORM book_appointment(3, 1, 1, (date_trunc('hour', now()) + interval '50 days')::timestamp);
        RAISE EXCEPTION 'FAIL T2: double booking accepted';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS T2: same doctor+time cannot be booked twice'; END;
 
    -- T3: a cancelled slot can be re-booked (partial unique index only covers scheduled rows)
    UPDATE appointments SET status = 'cancelled' WHERE appointment_id = v_id;
    PERFORM book_appointment(3, 1, 1, (date_trunc('hour', now()) + interval '50 days')::timestamp);
    RAISE NOTICE 'PASS T3: cancelled slot can be booked again';
 
    -- T4: booking a doctor who is on leave is refused
    BEGIN
        PERFORM book_appointment(1, 18, 2, (now() + interval '10 days')::timestamp);
        RAISE EXCEPTION 'FAIL T4: on_leave doctor booked';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN RAISE NOTICE 'PASS T4: on-leave doctor cannot be booked'; END;
 
    -- T5: prescription for a non-completed appointment is refused by trigger
    v_id := book_appointment(4, 3, 2, (date_trunc('hour', now()) + interval '60 days')::timestamp);
    BEGIN
        INSERT INTO prescriptions (appointment_id, medicine_details) VALUES (v_id, 'x');
        RAISE EXCEPTION 'FAIL T5: prescription for scheduled appointment accepted';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN RAISE NOTICE 'PASS T5: prescription needs a completed appointment'; END;
 
    -- X1: complete_with_prescription completes + prescribes atomically, then refuses a second run
    PERFORM complete_with_prescription(v_id, 'Test medicine 10 mg', 'test');
    SELECT status INTO v_state FROM appointments WHERE appointment_id = v_id;
    IF v_state <> 'completed' OR NOT EXISTS (SELECT 1 FROM prescriptions WHERE appointment_id = v_id) THEN
        RAISE EXCEPTION 'FAIL X1: completion did not apply both changes';
    END IF;
    BEGIN
        PERFORM complete_with_prescription(v_id, 'again', NULL);
        RAISE EXCEPTION 'FAIL X1b: second completion accepted';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN RAISE NOTICE 'PASS X1: complete_with_prescription is atomic and not repeatable'; END;
 
    -- X2: a prescription is unique per appointment
    BEGIN
        INSERT INTO prescriptions (appointment_id, medicine_details) VALUES (v_id, 'second');
        RAISE EXCEPTION 'FAIL X2: second prescription accepted';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS X2: one prescription per appointment'; END;
END $$;
 
ROLLBACK;
 
