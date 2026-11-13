-- =====================================================================
-- test_views_fts.sql -- views + full-text search checks. Rolled back at the end.
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/test_views_fts.sql
-- Each check prints "PASS: ..." (NOTICE) or aborts with an exception.
-- =====================================================================
set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_id int; n int; v_total bigint; v_direct bigint;
BEGIN
    -- V1/V2: a known appointment shows up in v_upcoming_appointments and v_patient_history
    v_id := book_appointment(1, 3, 2, (date_trunc('hour', now()) + interval '40 days')::timestamp);
    SELECT count(*) INTO n FROM v_upcoming_appointments WHERE appointment_id = v_id AND patient_id = 1 AND doctor_id = 3;
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL V1: appointment % missing from v_upcoming_appointments', v_id; END IF;
    RAISE NOTICE 'PASS V1: new appointment % appears in v_upcoming_appointments', v_id;

    SELECT count(*) INTO n FROM v_patient_history WHERE appointment_id = v_id AND patient_id = 1 AND status = 'scheduled';
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL V2: appointment % missing from v_patient_history', v_id; END IF;
    RAISE NOTICE 'PASS V2: new appointment appears in v_patient_history';

    -- V3: v_admin_stats equals direct counts
    SELECT total_appointments INTO v_total FROM v_admin_stats;
    SELECT count(*) INTO v_direct FROM appointments;
    IF v_total <> v_direct THEN RAISE EXCEPTION 'FAIL V3: stats % vs count %', v_total, v_direct; END IF;
    SELECT scheduled INTO v_total FROM v_admin_stats;
    SELECT count(*) INTO v_direct FROM appointments WHERE status = 'scheduled';
    IF v_total <> v_direct THEN RAISE EXCEPTION 'FAIL V3b: scheduled % vs %', v_total, v_direct; END IF;
    IF (SELECT total_patients FROM v_admin_stats) <> (SELECT count(*) FROM patients)
       OR (SELECT total_doctors FROM v_admin_stats) <> (SELECT count(*) FROM doctors)
       OR (SELECT total_clinics FROM v_admin_stats) <> (SELECT count(*) FROM clinics)
       OR (SELECT total_prescriptions FROM v_admin_stats) <> (SELECT count(*) FROM prescriptions) THEN
        RAISE EXCEPTION 'FAIL V3c: v_admin_stats counters differ from count(*)';
    END IF;
    RAISE NOTICE 'PASS V3: v_admin_stats matches direct count(*) queries';

    -- V4: UPDATE inside the transaction: cancelled leaves upcoming but stays in history
    UPDATE appointments SET status = 'cancelled' WHERE appointment_id = v_id;
    SELECT count(*) INTO n FROM v_upcoming_appointments WHERE appointment_id = v_id;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL V4a: cancelled appointment still upcoming'; END IF;
    SELECT count(*) INTO n FROM v_patient_history WHERE appointment_id = v_id AND status = 'cancelled';
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL V4b: cancelled appointment missing from history'; END IF;
    RAISE NOTICE 'PASS V4: UPDATE reflected in views';

    -- V5: DELETE inside the transaction: gone from both views
    DELETE FROM appointments WHERE appointment_id = v_id;
    SELECT count(*) INTO n FROM v_patient_history WHERE appointment_id = v_id;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL V5: deleted appointment still in history'; END IF;
    RAISE NOTICE 'PASS V5: DELETE reflected in views';

    -- V6: v_doctor_directory has one row per doctor
    IF (SELECT count(*) FROM v_doctor_directory) <> (SELECT count(*) FROM doctors) THEN
        RAISE EXCEPTION 'FAIL V6: directory row count differs from doctors';
    END IF;
    RAISE NOTICE 'PASS V6: v_doctor_directory has one row per doctor';

    -- F1: doctor name match
    SELECT count(*) INTO n FROM search_doctors('ravi') WHERE name = 'Dr. Ravi Menon';
    IF n <> 1 THEN RAISE EXCEPTION 'FAIL F1: name search for ravi'; END IF;
    RAISE NOTICE 'PASS F1: search_doctors(''ravi'') finds Dr. Ravi Menon';

    -- F2: clinic address match (Koramangala clinic is clinic 6: doctors 5, 6, 11)
    SELECT count(*) INTO n FROM search_doctors('koramangala') WHERE doctor_id IN (5, 6, 11);
    IF n <> 3 THEN RAISE EXCEPTION 'FAIL F2: clinic address search returned % of 3 expected doctors', n; END IF;
    RAISE NOTICE 'PASS F2: clinic address match finds the 3 doctors working in Koramangala';

    -- F3: speciality filter
    SELECT count(*) INTO n FROM search_doctors('cardio', (SELECT speciality_id FROM specialities WHERE speciality_name = 'Cardiology'));
    IF n <> 2 THEN RAISE EXCEPTION 'FAIL F3: Cardiology filter returned % rows (expected 2)', n; END IF;
    SELECT count(*) INTO n FROM search_doctors('cardio', (SELECT speciality_id FROM specialities WHERE speciality_name = 'Dermatology'));
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL F3b: filter leaked another speciality (% rows)', n; END IF;
    RAISE NOTICE 'PASS F3: speciality filter restricts results';

    -- F4: speciality-name search with prefix
    SELECT count(*) INTO n FROM search_doctors('cardio');
    IF n <> 2 THEN RAISE EXCEPTION 'FAIL F4: cardio returned % rows (expected 2)', n; END IF;
    RAISE NOTICE 'PASS F4: prefix search ''cardio'' returns the 2 cardiologists';

    -- F5: nonsense / empty / punctuation / injection-looking input -> no rows, no error
    SELECT count(*) INTO n FROM search_doctors('zzzqxv');
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL F5a: nonsense returned rows'; END IF;
    SELECT count(*) INTO n FROM search_doctors('');
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL F5b: empty returned rows'; END IF;
    SELECT count(*) INTO n FROM search_doctors('''; DROP TABLE doctors; --');
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL F5c: injection string returned rows'; END IF;
    IF to_regclass('public.doctors') IS NULL THEN RAISE EXCEPTION 'FAIL F5d: doctors table gone'; END IF;
    RAISE NOTICE 'PASS F5: nonsense, empty and injection-like input return no rows safely';

    -- F6: FTS finds nothing for a symptom phrase (motivation for the vector database)
    SELECT count(*) INTO n FROM search_doctors('chest tightness when climbing stairs');
    RAISE NOTICE 'INFO F6: FTS for "chest tightness when climbing stairs" returns % rows (no keyword overlap with any doctor/speciality/clinic)', n;
END $$;

ROLLBACK;
