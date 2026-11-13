
-- Core relational schema for Symptom-Based Doctor & Clinic Finder

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS specialities (
    speciality_id SERIAL PRIMARY KEY,
    speciality_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS clinics (
    clinic_id SERIAL PRIMARY KEY,
    clinic_name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    years_experience INT NOT NULL DEFAULT 0
        CHECK (years_experience >= 0),
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available', 'on_leave', 'unavailable')),
    speciality_id INT NOT NULL
        REFERENCES specialities(speciality_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS works_at (
    doctor_id INT NOT NULL
        REFERENCES doctors(doctor_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    clinic_id INT NOT NULL
        REFERENCES clinics(clinic_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    since_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (doctor_id, clinic_id)
);

CREATE TABLE IF NOT EXISTS patients (
    patient_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age > 0 AND age < 130),
    contact_info VARCHAR(20),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL
        REFERENCES patients(patient_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    doctor_id INT NOT NULL,
    clinic_id INT NOT NULL,
    appointment_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_works_at
        FOREIGN KEY (doctor_id, clinic_id)
        REFERENCES works_at(doctor_id, clinic_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE
        REFERENCES appointments(appointment_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    medicine_details TEXT NOT NULL,
    notes TEXT,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_slot_scheduled
    ON appointments (doctor_id, appointment_time)
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON appointments (patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor
    ON appointments (doctor_id);

CREATE INDEX IF NOT EXISTS idx_appointments_time
    ON appointments (appointment_time);

CREATE INDEX IF NOT EXISTS idx_doctors_speciality
    ON doctors (speciality_id);

CREATE INDEX IF NOT EXISTS idx_works_at_clinic
    ON works_at (clinic_id);
