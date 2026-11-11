# 3. ER diagram and relational schema
 
Diagrams (editable in draw.io / diagrams.net, **File > Open from > Device**):
* `docs/diagrams/er-diagram.drawio`
* `docs/diagrams/relational-schema.drawio`
* `docs/diagrams/qdrant-model.drawio` (vector part)
* `docs/diagrams/architecture.drawio`
 
Export each as PNG into `docs/screenshots/diagrams/` for the final report.
 
## Entities and relationships
| Relationship | Cardinality | Implementation |
|---|---|---|
| patient **BOOKS** appointment | 1 : N | `appointments.patient_id` FK (ON DELETE CASCADE) |
| doctor **WORKS_AT** clinic | M : N, attribute `since_date` | table `works_at(doctor_id, clinic_id, since_date)`, composite PK |
| appointment **HELD_AT / ATTENDS** | N : 1 doctor-at-clinic | composite FK `appointments(doctor_id, clinic_id) -> works_at` (a doctor can only be booked where they work) |
| appointment **GENERATES** prescription | 1 : 0..1 | `prescriptions.appointment_id` FK + UNIQUE |
| doctor **SPECIALIZES_IN** speciality | N : 1 | `doctors.speciality_id` FK (ON DELETE RESTRICT) |
| admins | standalone | role-based access; no FK |
 
## Keys, constraints and indexes (summary)
* Primary keys: surrogate `SERIAL` ids; `works_at` uses a composite key.
* CHECK constraints: age range, enumerations for `status` and `availability_status`, `years_experience` 0..60, e-mail and phone formats.
* UNIQUE: `patients.email`, `admins.email`, `specialities.speciality_name`, `prescriptions.appointment_id`,
  partial unique index `(doctor_id, appointment_time) WHERE status = 'scheduled'` (no double booking, cancelled slots can be reused).
* Foreign-key actions: CASCADE where the child is meaningless without the parent (appointments of a deleted patient), RESTRICT where history must be kept.
* Indexes: see section 8 (data dictionary) for the full list, including the two GIN indexes used by full-text search.
 
## Difference from the first hand-drawn design
The first draft stored symptom queries in a relational table (`symptom_queries`) and kept one clinic per doctor. The final design
moves symptom text to the vector database (it is unstructured and searched by meaning) and restores the many-to-many
doctor-clinic relationship (doctors work at several clinics). `02_alter_drop.sql` retires the legacy tables.
