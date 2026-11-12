# API and security test results

Run against `http://localhost:3100` on 2026-11-09T17:09:30.150Z by `scripts/api-tests.ts`.

| ID | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A1 | Seed patient can log in | 200 | 200 | PASS |
| A2 | Seed admin can log in | 200 | 200 | PASS |
| A3 | Session cookie is HttpOnly + SameSite=Lax | httponly; samesite=lax | httponly; samesite=lax | PASS |
| A4 | Wrong password rejected | 401 | 401 | PASS |
| A5 | Unknown email gives the same error as a wrong password | identical 401 + message | 401 Incorrect email or password. | PASS |
| A6 | Patient credentials do not work on the admin role | 401 | 401 | PASS |
| S1 | No cookie -> 401 on all 23 protected routes | 401 everywhere | 401 everywhere | PASS |
| S2 | Patient session -> 403 on all 13 /api/admin/* routes | 403 everywhere | 403 everywhere | PASS |
| S3 | Patient cannot POST /api/prescriptions (admin only) | 403 | 403 | PASS |
| S4 | Admin session cannot use patient booking API | 403 | 403 | PASS |
| S5 | Admin session cannot call symptom-check | 403 | 403 | PASS |
| S6 | JWT with a modified signature -> 401 | 401 | 401 | PASS |
| S7 | JWT with role changed to admin but old signature -> 401 | 401 | 401 | PASS |
| S8 | JWT signed with the wrong secret -> 401 | 401 | 401 | PASS |
| S9 | Unsigned (alg=none) JWT -> 401 | 401 | 401 | PASS |
| S10 | Expired JWT -> 401 | 401 | 401 | PASS |
| S11 | Injection string in search q (' OR 1=1 --) is searched as plain words, not executed | 200 and fewer than 20 rows | 200, 0 rows | PASS |
| S11b | Time-based injection (pg_sleep) is not executed | 200, 0 rows, < 3 s | 200, 0 rows, 5 ms | PASS |
| S12 | SQL injection in login email/password -> normal 401 | 401 | 401 | PASS |
| S13 | Stacked-query injection attempt: doctors table intact | 200 and 20 doctors | 200, 20 doctors | PASS |
| S14 | Injection text in symptom-check is plain data (patients intact) | no 5xx caused by SQL; patients intact | 503, 10 patients | PASS |
| S15 | Every stored password is a 60-char bcrypt ($2.$10$) hash | all true | 12/12 bcrypt | PASS |
| S16 | Anonymous GET /admin redirects to /login | 307 -> /login | 307 -> /login?next=%2Fadmin | PASS |
| S17 | Patient GET /admin redirected away | 307 -> / | 307 -> / | PASS |
| S18 | Security headers present (nosniff, frame deny) | both set | nosniff, DENY | PASS |
| R1 | Register a new patient | 201 | 201 | PASS |
| R2 | Duplicate email -> 409 | 409 | 409 | PASS |
| R3 | Invalid email -> 400 | 400 | 400 | PASS |
| R4 | Age 200 -> 400 | 400 | 400 | PASS |
| R5 | Short password -> 400 | 400 | 400 | PASS |
| R6 | Malformed JSON body -> 400 | 400 | 400 | PASS |
| R7 | New patient can log in | 200 | 200 | PASS |
| R8 | New account password stored as bcrypt hash | starts with $2 | $2b$10$ | PASS |
| D1 | Doctor search "cardio" returns the cardiologists | 2 rows | 2 rows | PASS |
| D2 | Directory filtered by speciality id | only Dermatology rows | 3 rows | PASS |
| B1 | Slots for a future date: 16 half-hour slots, all free | 16 / 16 available | 16 / 16 | PASS |
| B2 | Book an available slot | 201 | 201 | PASS |
| B3 | Double-booking the same slot -> 409 | 403 | 403 | PASS |
| B4 | Second patient booking the same slot -> 409 | 409 | 409 | PASS |
| B5 | Booking at a clinic where the doctor does not work -> 409 | 409 | 409 | PASS |
| B6 | Booking in the past -> 409 | 409 | 409 | PASS |
| B7 | Booking an on-leave doctor (id 18) -> 409 | 409 | 409 | PASS |
| B8 | Malformed slot -> 400 | 400 | 400 | PASS |
| B9 | Patient B cannot cancel patient A's appointment (404) | 404 | 404 | PASS |
| B10 | Patient sees only their own appointments | 1 appointment | 1 | PASS |
| P1 | Prescription with empty medicine details -> 400 | 400 | 400 | PASS |
| P2 | Admin completes appointment and writes prescription | 201 | 201 | PASS |
| P3 | Completing the same appointment again -> 409 | 409 | 409 | PASS |
| P4 | Patient sees the new prescription | 1 prescription | 1 | PASS |
| P5 | Completed appointment can no longer be cancelled (404) | 404 | 404 | PASS |
| P6 | Feedback-loop flag reported by API | promotedToCorpus is boolean | false | PASS |
| B11 | Book a second slot | 201 | 201 | PASS |
| B12 | Patient cancels own appointment | 200 | 200 | PASS |
| B13 | Cancelled slot is free again | slot available | true | PASS |
| M1 | Admin stats load (even if Qdrant is down) | 200 with counters | 200 | PASS |
| M2 | Admin creates a clinic | 201 | 201 | PASS |
| M3 | Clinic with invalid phone -> 400 | 400 | 400 | PASS |
| M4 | Admin updates the clinic | 200 | 200 | PASS |
| M5 | Admin links doctor 16 to the clinic (works_at) | 201 | 201 | PASS |
| M6 | Duplicate works_at link -> 409 | 409 | 409 | PASS |
| M7 | Deleting a clinic that has doctors -> 409 (FK RESTRICT) | 409 | 409 | PASS |
| M8 | Admin removes the works_at link | 200 | 200 | PASS |
| M9 | Admin deletes the now-empty clinic | 200 | 200 | PASS |
| M10 | Deleting a speciality that still has doctors -> 409 | 409 | 409 | PASS |
| M11 | Deleting a doctor with appointments -> 409 | 409 | 409 | PASS |
| M12 | Admin creates a speciality | 201 | 201 | PASS |
| M13 | Duplicate speciality name -> 409 | 409 | 409 | PASS |
| M14 | Admin deletes the new speciality | 200 | 200 | PASS |
| M15 | Admin creates a doctor | 201 | 201 | PASS |
| M16 | Doctor with 61 years of experience -> 400 | 400 | 400 | PASS |
| M17 | Admin sets doctor on leave (update) | 200 | 200 | PASS |
| M18 | Admin deletes the test doctor | 200 | 200 | PASS |
| M19 | Admin marks a scheduled appointment as no-show | 200 | 200 | PASS |
| M20 | Marking the same appointment again -> 404 | 404 | 404 | PASS |
| M21 | Admin appointment filter by status | only completed | 50 rows | PASS |
| M22 | Invalid filter value -> 400 | 400 | 400 | PASS |
| V0 | Qdrant offline: symptom-check degrades to 503 with a friendly message | 503 | 503 | PASS |
| V1 | [vector] requires Qdrant + embedding model | - | not run here | SKIP |
| V2 | [vector] requires Qdrant + embedding model | - | not run here | SKIP |
| V3 | [vector] requires Qdrant + embedding model | - | not run here | SKIP |

**77 passed, 0 failed, 3 skipped.**
