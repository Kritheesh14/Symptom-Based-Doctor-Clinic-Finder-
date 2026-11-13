# 1. Problem statement, objectives and scope

## Problem statement
Patients who feel unwell often do not know which type of specialist to consult. They pick the wrong speciality from a
dropdown, wait for a referral, or delay care. Existing directories assume the patient already knows the medical term.
This project lets a patient describe symptoms in plain language and recommends the right speciality by **meaning**,
then connects the patient to available doctors, clinics and bookable time slots. Structured clinical data (patients, doctors,
clinics, appointments, prescriptions) must stay exact and consistent, while symptom interpretation must stay flexible. That is
why the system combines a relational database with a vector database.

## Objectives
1. Recommend a speciality from free-text symptoms using semantic similarity, with a confidence value and a safe fallback.
2. Keep all transactional data in a normalised PostgreSQL schema with constraints that make invalid states impossible
   (double booking, prescriptions without a visit, a doctor booked at a clinic where they do not work).
3. Provide full-text search over doctors, specialities and clinic areas for patients who already know what they want.
4. Let the system **learn from use**: completed visits add the patient's wording to the search index (feedback loop).
5. Offer role-based access (patient, admin) with secure authentication and a dashboard with live statistics.
6. Demonstrate database concepts end to end: design, DDL/DML, views, triggers, functions, transactions, indexing, FTS, vectors.

## Scope
**In scope:** patient registration/login; symptom check; doctor search and filtering; booking, cancelling, history; prescriptions
issued by the admin when completing a visit; admin management of doctors, clinics, specialities and doctor-clinic links;
admin dashboard; vector index set-up, ingestion, evaluation.

**Out of scope (future work):** a separate doctor login, online payments, e-mail/SMS reminders, multi-language symptom input,
emergency triage (the app states clearly that it is not a diagnosis), clinic opening hours per doctor.

**Medical disclaimer:** every recommendation is labelled *"This is a suggestion, not a diagnosis."*
