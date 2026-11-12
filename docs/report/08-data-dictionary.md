# 8. Data dictionary
 
Generated from the live schema (`information_schema`, `pg_constraint`, `pg_indexes`) after running `db/run_all.sh`, with descriptions added by hand. Symptom vectors are documented in section 9.
 
## `specialities`
 
Medical specialities (Cardiology, Dermatology, ...). Qdrant cases are labelled with these ids.
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `speciality_id` | integer | no | nextval('specialities_speciality_id_seq'::regclass) | Surrogate key |
| `speciality_name` | character varying(100) | no |  | Speciality label; the symptom corpus uses exactly these names |
 
**Constraints**
 
- `specialities_pkey`: `PRIMARY KEY (speciality_id)`
- `specialities_speciality_name_key`: `UNIQUE (speciality_name)`
 
**Indexes**
 
- `specialities_pkey`: `CREATE UNIQUE INDEX specialities_pkey ON specialities USING btree (speciality_id)`
- `specialities_speciality_name_key`: `CREATE UNIQUE INDEX specialities_speciality_name_key ON specialities USING btree (speciality_name)`
 
## `clinics`
 
Physical clinic locations.
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `clinic_id` | integer | no | nextval('clinics_clinic_id_seq'::regclass) | Surrogate key |
| `clinic_name` | character varying(150) | no |  | Clinic display name |
| `address` | character varying(255) | no |  | Street address (searched by full-text search) |
| `phone` | character varying(20) | yes |  | Optional phone, format-checked |
| `search_vector` | tsvector | yes | GENERATED ALWAYS STORED | Generated tsvector of name + address (GIN indexed) |
 
**Constraints**
 
- `chk_clinic_phone`: `CHECK (((phone IS NULL) OR ((phone)::text ~ '^[0-9+\- ]{7,20}$'::text)))`
- `clinics_pkey`: `PRIMARY KEY (clinic_id)`
 
**Indexes**
 
- `clinics_pkey`: `CREATE UNIQUE INDEX clinics_pkey ON clinics USING btree (clinic_id)`
- `idx_clinics_search`: `CREATE INDEX idx_clinics_search ON clinics USING gin (search_vector)`
 
## `doctors`
 
Doctors; each has exactly one speciality and may work at several clinics.
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `doctor_id` | integer | no | nextval('doctors_doctor_id_seq'::regclass) | Surrogate key |
| `name` | character varying(100) | no |  | Doctor name |
| `years_experience` | integer | no | 0 | Years of practice, 0 to 60 |
| `availability_status` | character varying(20) | no | 'available'::character varying | available / on_leave / unavailable; only available doctors can be booked |
| `speciality_id` | integer | no |  | FK to specialities (SPECIALIZES_IN) |
| `search_vector` | tsvector | yes | GENERATED ALWAYS STORED | Generated tsvector of the name (GIN indexed) |
 
**Constraints**
 
- `chk_years_realistic`: `CHECK ((years_experience <= 60))`
- `doctors_availability_status_check`: `CHECK (((availability_status)::text = ANY ((ARRAY['available'::character varying, 'on_leave'::character varying, 'unavailable'::character varying])::text[])))`
- `doctors_years_experience_check`: `CHECK ((years_experience >= 0))`
- `doctors_speciality_id_fkey`: `FOREIGN KEY (speciality_id) REFERENCES specialities(speciality_id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `doctors_pkey`: `PRIMARY KEY (doctor_id)`
 
**Indexes**
 
- `doctors_pkey`: `CREATE UNIQUE INDEX doctors_pkey ON doctors USING btree (doctor_id)`
- `idx_doctors_search`: `CREATE INDEX idx_doctors_search ON doctors USING gin (search_vector)`
- `idx_doctors_speciality`: `CREATE INDEX idx_doctors_speciality ON doctors USING btree (speciality_id)`
 
## `works_at`
 
M:N link between doctors and clinics, with the date the doctor joined.
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `doctor_id` | integer | no |  | FK to doctors (part of PK) |
| `clinic_id` | integer | no |  | FK to clinics (part of PK) |
| `since_date` | date | no | CURRENT_DATE | Date the doctor joined the clinic |
 
**Constraints**
 
- `works_at_clinic_id_fkey`: `FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `works_at_doctor_id_fkey`: `FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON UPDATE CASCADE ON DELETE CASCADE`
- `works_at_pkey`: `PRIMARY KEY (doctor_id, clinic_id)`
 
**Indexes**
 
- `idx_works_at_clinic`: `CREATE INDEX idx_works_at_clinic ON works_at USING btree (clinic_id)`
- `works_at_pkey`: `CREATE UNIQUE INDEX works_at_pkey ON works_at USING btree (doctor_id, clinic_id)`
 
## `patients`
 
Registered patients (role: patient).
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `patient_id` | integer | no | nextval('patients_patient_id_seq'::regclass) | Surrogate key |
| `name` | character varying(100) | no |  | Full name |
| `age` | integer | yes |  | Optional, 1 to 129 |
| `contact_info` | character varying(20) | yes |  | Optional phone, format-checked |
| `email` | character varying(150) | no |  | Login id; unique; format-checked |
| `password_hash` | text | no |  | bcrypt hash ($2b$10$...), never plain text |
| `created_at` | timestamp without time zone | no | CURRENT_TIMESTAMP | Registration time |
 
**Constraints**
 
- `chk_contact_info`: `CHECK (((contact_info IS NULL) OR ((contact_info)::text ~ '^[0-9+\- ]{7,20}$'::text)))`
- `chk_patient_email`: `CHECK (((email)::text ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))`
- `patients_age_check`: `CHECK (((age > 0) AND (age < 130)))`
- `patients_pkey`: `PRIMARY KEY (patient_id)`
- `patients_email_key`: `UNIQUE (email)`
 
**Indexes**
 
- `patients_email_key`: `CREATE UNIQUE INDEX patients_email_key ON patients USING btree (email)`
- `patients_pkey`: `CREATE UNIQUE INDEX patients_pkey ON patients USING btree (patient_id)`
 
## `admins`
 
Staff accounts that manage master data (role: admin).
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `admin_id` | integer | no | nextval('admins_admin_id_seq'::regclass) | Surrogate key |
| `name` | character varying(100) | no |  | Full name |
| `email` | character varying(150) | no |  | Login id; unique; format-checked |
| `password_hash` | text | no |  | bcrypt hash |
 
**Constraints**
 
- `chk_admin_email`: `CHECK (((email)::text ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))`
- `admins_pkey`: `PRIMARY KEY (admin_id)`
- `admins_email_key`: `UNIQUE (email)`
 
**Indexes**
 
- `admins_email_key`: `CREATE UNIQUE INDEX admins_email_key ON admins USING btree (email)`
- `admins_pkey`: `CREATE UNIQUE INDEX admins_pkey ON admins USING btree (admin_id)`
 
## `appointments`
 
Bookings of a patient with a doctor at a clinic at a point in time.
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `appointment_id` | integer | no | nextval('appointments_appointment_id_seq'::regclass) | Surrogate key |
| `patient_id` | integer | no |  | FK to patients (ON DELETE CASCADE) |
| `doctor_id` | integer | no |  | Part of composite FK to works_at |
| `clinic_id` | integer | no |  | Part of composite FK to works_at |
| `appointment_time` | timestamp without time zone | no |  | Start of the slot (no time zone; clinic local time) |
| `status` | character varying(20) | no | 'scheduled'::character varying | scheduled / completed / cancelled / no_show |
| `created_at` | timestamp without time zone | no | CURRENT_TIMESTAMP | Booking time |
 
**Constraints**
 
- `appointments_status_check`: `CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::text[])))`
- `appointments_patient_id_fkey`: `FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE CASCADE ON DELETE CASCADE`
- `fk_appt_works_at`: `FOREIGN KEY (doctor_id, clinic_id) REFERENCES works_at(doctor_id, clinic_id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `appointments_pkey`: `PRIMARY KEY (appointment_id)`
 
**Indexes**
 
- `appointments_pkey`: `CREATE UNIQUE INDEX appointments_pkey ON appointments USING btree (appointment_id)`
- `idx_appointments_doctor`: `CREATE INDEX idx_appointments_doctor ON appointments USING btree (doctor_id)`
- `idx_appointments_patient`: `CREATE INDEX idx_appointments_patient ON appointments USING btree (patient_id)`
- `idx_appointments_time`: `CREATE INDEX idx_appointments_time ON appointments USING btree (appointment_time)`
- `uq_doctor_slot_scheduled`: `CREATE UNIQUE INDEX uq_doctor_slot_scheduled ON appointments USING btree (doctor_id, appointment_time) WHERE ((status)::text = 'scheduled'::text)`
 
## `prescriptions`
 
Prescription issued for a completed appointment (at most one per appointment).
 
| Column | Type | Null? | Default | Description |
|---|---|---|---|---|
| `prescription_id` | integer | no | nextval('prescriptions_prescription_id_seq'::regclass) | Surrogate key |
| `appointment_id` | integer | no |  | FK to appointments, UNIQUE (one prescription per appointment) |
| `medicine_details` | text | no |  | Free-text medicines and dosage |
| `notes` | text | yes |  | Optional doctor notes |
| `issued_at` | timestamp without time zone | no | CURRENT_TIMESTAMP | Issue time |
 
**Constraints**
 
- `prescriptions_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON UPDATE CASCADE ON DELETE CASCADE`
- `prescriptions_pkey`: `PRIMARY KEY (prescription_id)`
- `prescriptions_appointment_id_key`: `UNIQUE (appointment_id)`
 
**Indexes**
 
- `prescriptions_appointment_id_key`: `CREATE UNIQUE INDEX prescriptions_appointment_id_key ON prescriptions USING btree (appointment_id)`
- `prescriptions_pkey`: `CREATE UNIQUE INDEX prescriptions_pkey ON prescriptions USING btree (prescription_id)`
 
## Views, functions and triggers
 
- **view `v_admin_stats`**: Single-row dashboard counters for the admin home page.  
  columns: total_patients, total_doctors, total_clinics, total_appointments, scheduled, completed, cancelled, no_show, total_prescriptions
- **view `v_doctor_directory`**: Doctors with speciality and the clinics they work at (one row per doctor).  
  columns: doctor_id, doctor_name, years_experience, availability_status, speciality_id, speciality_name, clinics
- **view `v_patient_history`**: Every appointment with doctor, clinic and optional prescription. Filter by patient_id.  
  columns: appointment_id, patient_id, appointment_time, status, doctor_id, doctor_name, speciality_name, clinic_id, clinic_name, clinic_address, prescription_id, medicine_details, prescription_notes, issued_at
- **view `v_upcoming_appointments`**: Scheduled appointments in the future, with patient, doctor, speciality and clinic names.  
  columns: appointment_id, appointment_time, status, patient_id, patient_name, doctor_id, doctor_name, speciality_name, clinic_id, clinic_name
- **function `armor(bytea)`**: 
- **function `armor(bytea, text[], text[])`**: 
- **function `book_appointment(p_patient_id integer, p_doctor_id integer, p_clinic_id integer, p_time timestamp without time zone)`**: Atomic booking: checks doctor availability, then inserts; FK, unique-slot index and triggers enforce the rest.
- **function `complete_with_prescription(p_appointment_id integer, p_medicine text, p_notes text)`**: Marks a scheduled appointment completed and writes its prescription in one transaction.
- **function `crypt(text, text)`**: 
- **function `dearmor(text)`**: 
- **function `decrypt(bytea, bytea, text)`**: 
- **function `decrypt_iv(bytea, bytea, bytea, text)`**: 
- **function `digest(bytea, text)`**: 
- **function `digest(text, text)`**: 
- **function `encrypt(bytea, bytea, text)`**: 
- **function `encrypt_iv(bytea, bytea, bytea, text)`**: 
- **function `gen_random_bytes(integer)`**: 
- **function `gen_random_uuid()`**: 
- **function `gen_salt(text)`**: 
- **function `gen_salt(text, integer)`**: 
- **function `hmac(text, text, text)`**: 
- **function `hmac(bytea, bytea, text)`**: 
- **function `pgp_armor_headers(text, OUT key text, OUT value text)`**: 
- **function `pgp_key_id(bytea)`**: 
- **function `pgp_pub_decrypt(bytea, bytea, text, text)`**: 
- **function `pgp_pub_decrypt(bytea, bytea)`**: 
- **function `pgp_pub_decrypt(bytea, bytea, text)`**: 
- **function `pgp_pub_decrypt_bytea(bytea, bytea)`**: 
- **function `pgp_pub_decrypt_bytea(bytea, bytea, text)`**: 
- **function `pgp_pub_decrypt_bytea(bytea, bytea, text, text)`**: 
- **function `pgp_pub_encrypt(text, bytea, text)`**: 
- **function `pgp_pub_encrypt(text, bytea)`**: 
- **function `pgp_pub_encrypt_bytea(bytea, bytea)`**: 
- **function `pgp_pub_encrypt_bytea(bytea, bytea, text)`**: 
- **function `pgp_sym_decrypt(bytea, text, text)`**: 
- **function `pgp_sym_decrypt(bytea, text)`**: 
- **function `pgp_sym_decrypt_bytea(bytea, text, text)`**: 
- **function `pgp_sym_decrypt_bytea(bytea, text)`**: 
- **function `pgp_sym_encrypt(text, text, text)`**: 
- **function `pgp_sym_encrypt(text, text)`**: 
- **function `pgp_sym_encrypt_bytea(bytea, text)`**: 
- **function `pgp_sym_encrypt_bytea(bytea, text, text)`**: 
- **function `search_doctors(p_query text, p_speciality_id integer)`**: Ranked full-text search over doctor name, speciality name and clinic name/address (prefix match, GIN indexed).
- **trigger `appointment_not_in_past`** on `appointments`
- **trigger `prescription_requires_completed`** on `prescriptions`
