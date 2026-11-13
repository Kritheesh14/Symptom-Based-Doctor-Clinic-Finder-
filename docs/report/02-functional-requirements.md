# 2. Functional requirements

| ID | Requirement | Role |
|---|---|---|
| FR1 | Register with name, age, phone, e-mail and password; duplicate e-mails are rejected | Patient |
| FR2 | Log in and out; sessions expire after 8 hours | Patient, Admin |
| FR3 | Describe symptoms (10 to 1000 characters) and receive a suggested speciality, match strength, alternatives and available doctors | Patient |
| FR4 | If the match is weak, show alternatives and suggest General Medicine | Patient |
| FR5 | Search doctors by name, speciality or clinic address; filter by speciality | Patient |
| FR6 | Choose clinic, date and a free half-hour slot; book; cancel own appointment | Patient |
| FR7 | View own appointment history and prescriptions | Patient |
| FR8 | Dashboard: counters, appointments per speciality (30 days), busiest doctors, symptom demand | Admin |
| FR9 | Filter appointments by status and date; mark no-show; complete and prescribe | Admin |
| FR10 | Create, edit, delete doctors (incl. availability); link/unlink doctors to clinics | Admin |
| FR11 | Create, edit, delete clinics and specialities; deletes blocked by foreign keys show a clear message | Admin |
| FR12 | Completing an appointment adds the patient's symptom text to the vector index as a confirmed case | System |

Non-functional: passwords hashed with bcrypt; no secrets in source; parameterised SQL only; every API route checks the role;
database-level validation for all user-supplied data; graceful degradation when the vector service is down.
