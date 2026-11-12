-- =====================================================================
-- functions_triggers.sql -- Triggers, stored functions, transactions
-- (advanced features: triggers, functions, transactions)
-- =====================================================================

-- ---------- Trigger 1: no new *scheduled* appointment in the past ----------
CREATE OR REPLACE FUNCTION trg_appointment_not_in_past() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'scheduled' AND NEW.appointment_time < now() THEN
        RAISE EXCEPTION 'Appointment time % is in the past', NEW.appointment_time
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointment_not_in_past ON appointments;
CREATE TRIGGER appointment_not_in_past
    BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION trg_appointment_not_in_past();

-- ---------- Trigger 2: a prescription needs a completed appointment ----------
CREATE OR REPLACE FUNCTION trg_prescription_requires_completed() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM appointments WHERE appointment_id = NEW.appointment_id;
    IF v_status IS DISTINCT FROM 'completed' THEN
        RAISE EXCEPTION 'Prescription requires a completed appointment (appointment % is %)',
                        NEW.appointment_id, coalesce(v_status, 'missing')
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prescription_requires_completed ON prescriptions;
CREATE TRIGGER prescription_requires_completed
    BEFORE INSERT ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION trg_prescription_requires_completed();

-- ---------- Function: book_appointment (atomic booking) ----------
-- Checks the doctor is available, then inserts. The works_at FK, the unique
-- slot index and the past-time trigger enforce the remaining rules.
CREATE OR REPLACE FUNCTION book_appointment(
    p_patient_id int, p_doctor_id int, p_clinic_id int, p_time timestamp)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    v_avail text;
    v_id    int;
BEGIN
    SELECT availability_status INTO v_avail FROM doctors WHERE doctor_id = p_doctor_id FOR SHARE;
    IF v_avail IS NULL THEN
        RAISE EXCEPTION 'Doctor % does not exist', p_doctor_id USING ERRCODE = 'P0001';
    ELSIF v_avail <> 'available' THEN
        RAISE EXCEPTION 'Doctor % is currently %', p_doctor_id, v_avail USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO appointments (patient_id, doctor_id, clinic_id, appointment_time)
    VALUES (p_patient_id, p_doctor_id, p_clinic_id, p_time)
    RETURNING appointment_id INTO v_id;

    RETURN v_id;
END $$;

COMMENT ON FUNCTION book_appointment(int,int,int,timestamp) IS
 'Atomic booking: checks doctor availability, then inserts; FK, unique-slot index and triggers enforce the rest.';

-- ---------- Function: complete_with_prescription ----------
-- Completes a scheduled appointment and writes its prescription in one
-- transaction. The row lock prevents two admins completing it at once.
CREATE OR REPLACE FUNCTION complete_with_prescription(
    p_appointment_id int, p_medicine text, p_notes text)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
    v_status text;
    v_id     int;
BEGIN
    SELECT status INTO v_status FROM appointments WHERE appointment_id = p_appointment_id FOR UPDATE;
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Appointment % not found', p_appointment_id USING ERRCODE = 'P0001';
    ELSIF v_status <> 'scheduled' THEN
        RAISE EXCEPTION 'Only scheduled appointments can be completed (status is %)', v_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE appointments SET status = 'completed' WHERE appointment_id = p_appointment_id;

    INSERT INTO prescriptions (appointment_id, medicine_details, notes)
    VALUES (p_appointment_id, p_medicine, p_notes)
    RETURNING prescription_id INTO v_id;

    RETURN v_id;
END $$;

COMMENT ON FUNCTION complete_with_prescription(int,text,text) IS
 'Marks a scheduled appointment completed and writes its prescription in one transaction.';
