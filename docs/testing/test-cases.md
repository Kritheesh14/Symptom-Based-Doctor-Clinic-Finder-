# Test cases

Automated evidence: `db-test-results.md` (25 SQL checks), `api-test-results.md` (80 API/security checks), `retrieval-eval.md` (vector accuracy, generated locally).
Status values: **Pass** = executed and passed when this repository was assembled; **Run locally** = needs Qdrant and the embedding model (not available there).

## A. Views and full-text search (`db/tests/test_views_fts.sql`)
| ID | Test | Expected | Evidence | Status |
|---|---|---|---|---|
| V1 | Book a known appointment, query `v_upcoming_appointments` | row present | db-test-results | Pass |
| V2 | Same appointment in `v_patient_history` | row present | db-test-results | Pass |
| V3 | `v_admin_stats` counters vs `count(*)` | all equal | db-test-results | Pass |
| V4 | UPDATE status to cancelled inside the transaction | leaves upcoming, stays in history | db-test-results | Pass |
| V5 | DELETE the appointment | disappears from the views | db-test-results | Pass |
| V6 | `v_doctor_directory` | one row per doctor | db-test-results | Pass |
| F1 | `search_doctors('ravi')` | Dr. Ravi Menon | db-test-results | Pass |
| F2 | `search_doctors('koramangala')` (clinic address) | the 3 doctors of that clinic | db-test-results | Pass |
| F3 | speciality filter | only that speciality | db-test-results | Pass |
| F4 | prefix `cardio` | the 2 cardiologists | db-test-results | Pass |
| F5 | nonsense, empty, injection-like input | 0 rows, no error | db-test-results | Pass |
| F6 | symptom sentence with no keyword overlap | 0 rows (motivates vectors) | db-test-results, section 6 | Pass |

## B. Integrity, triggers, transactions (`db/tests/test_constraints_triggers.sql`)
| ID | Test | Expected | Status |
|---|---|---|---|
| C1-C3 | invalid e-mail / age 200 / bad phone | SQLSTATE 23514 | Pass |
| C4 | duplicate e-mail | 23505 | Pass |
| C5 | years_experience 61 | 23514 | Pass |
| C6 | delete speciality that has doctors | 23503 (RESTRICT) | Pass |
| C7 | book doctor at a clinic they do not work at | 23503 (composite FK) | Pass |
| T1 | book in the past | rejected by trigger | Pass |
| T2 | same doctor and time twice | 23505 (partial unique index) | Pass |
| T3 | re-book a cancelled slot | allowed | Pass |
| T4 | book an on-leave doctor | rejected | Pass |
| T5 | prescription for a scheduled appointment | rejected by trigger | Pass |
| X1 | `complete_with_prescription` twice | first commits both changes, second rejected | Pass |
| X2 | second prescription for one appointment | 23505 | Pass |

## C. Security and role-based access (`web/scripts/api-tests.ts`)
| ID | Test | Expected | Status |
|---|---|---|---|
| A1-A3 | seed logins; cookie flags | 200; HttpOnly + SameSite=Lax | Pass |
| A4-A6 | wrong password / unknown e-mail / wrong role | identical 401 message | Pass |
| S1 | no cookie on 23 protected routes | 401 on all | Pass |
| S2-S5 | patient on 13 admin routes; admin on patient routes | 403 | Pass |
| S6-S10 | tampered signature, forged role, wrong secret, alg=none, expired token | 401 | Pass |
| S11-S14 | SQL injection in search, login, doctors filter, symptom text | treated as data; tables intact | Pass |
| S15, R8 | stored passwords | all 60-char bcrypt `$2.$10$` | Pass |
| S16-S18 | page guards, security headers | redirects, nosniff, DENY | Pass |
| secrets | a `git grep -nE` for connection-string, QDRANT_API_KEY and JWT_SECRET assignments (pattern in the P7 plan) | only `.env.example` | Run after `git init` |

## D. Functional API flows
| ID | Test | Expected | Status |
|---|---|---|---|
| R1-R7 | register, duplicates, invalid e-mail/age/password, malformed JSON | 201 / 409 / 400 | Pass |
| D1-D2 | doctor search and directory filter | correct rows | Pass |
| B1-B13 | slots, booking, double booking, wrong clinic, past, on-leave, ownership of cancel, cancel frees slot | 201 / 409 / 404 | Pass |
| P1-P5 | prescription validation, completion, repeat, patient view | 400 / 201 / 409 | Pass |
| M1-M22 | admin stats, clinic/speciality/doctor CRUD, FK-blocked deletes, works_at, no-show, filters | 200 / 201 / 409 / 400 | Pass |

## E. Vector search and feedback loop
| ID | Test | Expected | Status |
|---|---|---|---|
| VT1 | `qdrant:setup` then `qdrant:ingest` on a clean Qdrant | collections created, 208 points | Run locally |
| VT2 | `qdrant:ingest` again | still 208 points (deterministic ids) | Run locally |
| VT3 | `qdrant:eval` | top-1 >= 70 %, top-3 >= 90 % | Run locally |
| VT4 | symptom-check "my chest feels tight when I climb stairs" | Cardiology | Run locally (API test V1) |
| VT5 | five keyword-free examples (section 6) | correct speciality, FTS returns 0 rows | Run locally (FTS part: Pass) |
| VT6 | vague input ("I feel strange") | low confidence notice + alternatives | Run locally |
| VT7 | symptom-check with Qdrant stopped | 503 with friendly message; rest of the app works | Pass (API test V0) |
| VT8 | feedback loop: check symptoms -> book with `queryId` -> admin completes + prescribes | `symptom_cases` count +1 with `source = confirmed`; API `promotedToCorpus: true` | Run locally |
| VT9 | complete an appointment that was booked without a symptom check | `promotedToCorpus: false`, no error | Pass |
| VT10 | admin dashboard with Qdrant stopped | page loads, notice shown | Pass (API test M1) |

## F. Manual UI checks (record screenshots in `docs/screenshots/`)
| ID | Test | Expected |
|---|---|---|
| U1 | Patient never sees admin links; typing `/admin` redirects | redirected to `/` |
| U2 | Register form shows inline errors that mirror the DB rules | messages under the fields |
| U3 | Booking page greys out taken and past slots | disabled buttons |
| U4 | Admin delete of a speciality with doctors | 409 message shown in the page |
| U5 | Loading, empty and error states on every list page | visible |
| U6 | Keyboard: tab through the login form and the confirm dialog (Esc closes) | focus visible |
