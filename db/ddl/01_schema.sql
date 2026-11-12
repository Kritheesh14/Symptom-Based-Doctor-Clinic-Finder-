-- =====================================================================
-- 01_schema.sql  --  CREATE the eight tables, keys, constraints, indexes
-- Run first (db/run_all.sh).  Re-runnable: every object uses IF NOT EXISTS.
-- On a database left over from the earlier design iteration, run
-- db/run_all.sh --reset so these tables are created with the current shape.
-- Extra validation (e-mail / phone formats, years <= 60) and the generated
-- search_vector columns are added afterwards by 02_alter_drop.sql.
-- =====================================================================

-- bcrypt hashing for seed passwords: crypt(pw, gen_salt('bf')) is verifiable by bcryptjs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- specialities ----------
CREATE TABLE IF NOT EXISTS specialities (
    speciality_id   SERIAL       PRIMARY KEY,
    speciality_name VARCHAR(100) NOT NULL UNIQUE
);

-- ---------- clinics ----------
CREATE TABLE IF NOT EXISTS clinics (
    clinic_id   SERIAL       PRIMARY KEY,
    clinic_name VARCHAR(150) NOT NULL,
    address     VARCHAR(255) NOT NULL,
    phone       VARCHAR(20)
);

-- ---------- doctors  (N : 1 specialities -- SPECIALIZES_IN) ----------
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id           SERIAL       PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    years_experience    INT          NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
    availability_status VARCHAR(20)  NOT NULL DEFAULT 'available'
                        CHECK (availability_status IN ('available', 'on_leave', 'unavailable')),
    speciality_id       INT          NOT NULL
                        REFERENCES specialities (speciality_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------- works_at  (M : N doctors <-> clinics, attribute since_date) ----------
CREATE TABLE IF NOT EXISTS works_at (
    doctor_id  INT  NOT NULL REFERENCES doctors (doctor_id) ON UPDATE CASCADE ON DELETE CASCADE,
    clinic_id  INT  NOT NULL REFERENCES clinics (clinic_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    since_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (doctor_id, clinic_id)
);

-- ---------- patients ----------
CREATE TABLE IF NOT EXISTS patients (
    patient_id    SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    age           INT          CHECK (age > 0 AND age < 130),
    contact_info  VARCHAR(20),
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- admins  (second role; not in the hand-drawn ER diagram) ----------
CREATE TABLE IF NOT EXISTS admins (
    admin_id      SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL
);

-- ---------- appointments  (patient BOOKS; doctor ATTENDS at a clinic) ----------
-- The composite FK to works_at means a doctor can only be booked at a clinic they work at.
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id   SERIAL      PRIMARY KEY,
    patient_id       INT         NOT NULL
                     REFERENCES patients (patient_id) ON UPDATE CASCADE ON DELETE CASCADE,
    doctor_id        INT         NOT NULL,
    clinic_id        INT         NOT NULL,
    appointment_time TIMESTAMP   NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_works_at FOREIGN KEY (doctor_id, clinic_id)
        REFERENCES works_at (doctor_id, clinic_id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------- prescriptions  (appointment GENERATES at most one prescription) ----------
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id  SERIAL    PRIMARY KEY,
    appointment_id   INT       NOT NULL UNIQUE
                     REFERENCES appointments (appointment_id) ON UPDATE CASCADE ON DELETE CASCADE,
    medicine_details TEXT      NOT NULL,
    notes            TEXT,
    issued_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- indexes ----------
-- No double booking: one *scheduled* appointment per doctor per slot.  The index is
-- partial, so a cancelled / completed / no_show row frees the slot for re-booking.
CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_slot_scheduled
    ON appointments (doctor_id, appointment_time) WHERE status = 'scheduled';

-- Foreign-key / lookup indexes (PostgreSQL does not index FK columns automatically)
CREATE INDEX IF NOT EXISTS idx_doctors_speciality   ON doctors (speciality_id);
CREATE INDEX IF NOT EXISTS idx_works_at_clinic      ON works_at (clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time    ON appointments (appointment_time);

-- ---------- comments ----------
COMMENT ON TABLE specialities  IS 'Medical specialities (Cardiology, Dermatology, ...). Qdrant cases are labelled with these ids.';
COMMENT ON TABLE clinics       IS 'Physical clinic locations.';
COMMENT ON TABLE doctors       IS 'Doctors; each has exactly one speciality and may work at several clinics.';
COMMENT ON TABLE works_at      IS 'M:N link between doctors and clinics, with the date the doctor joined.';
COMMENT ON TABLE patients      IS 'Registered patients (role: patient).';
COMMENT ON TABLE admins        IS 'Staff accounts that manage master data (role: admin).';
COMMENT ON TABLE appointments  IS 'Bookings of a patient with a doctor at a clinic at a point in time.';
COMMENT ON TABLE prescriptions IS 'Prescription issued for a completed appointment (at most one per appointment).';

-- ---------- inspection: list every index that now exists ----------
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY 1, 2;
