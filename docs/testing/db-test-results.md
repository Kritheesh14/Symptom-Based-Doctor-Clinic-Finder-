# Database test results

Generated 2026-11-09T17:08:44Z by running db/tests/*.sql against the seeded database (PostgreSQL 16).

## db/tests/test_views_fts.sql

```
PASS V1: new appointment 76 appears in v_upcoming_appointments
PASS V2: new appointment appears in v_patient_history
PASS V3: v_admin_stats matches direct count(*) queries
PASS V4: UPDATE reflected in views
PASS V5: DELETE reflected in views
PASS V6: v_doctor_directory has one row per doctor
PASS F1: search_doctors('ravi') finds Dr. Ravi Menon
PASS F2: clinic address match finds the 3 doctors working in Koramangala
PASS F3: speciality filter restricts results
PASS F4: prefix search 'cardio' returns the 2 cardiologists
PASS F5: nonsense, empty and injection-like input return no rows safely
INFO F6: FTS for "chest tightness when climbing stairs" returns 0 rows (no keyword overlap with any doctor/speciality/clinic)
```

## db/tests/test_constraints_triggers.sql

```
PASS C1: invalid email -> 23514
PASS C2: age 200 -> 23514
PASS C3: bad contact_info -> 23514
PASS C4: duplicate email -> 23505
PASS C5: years_experience 61 -> 23514
PASS C6: FK RESTRICT on specialities -> 23503
PASS C7: doctor/clinic pair must exist in works_at
PASS T1: past booking rejected by trigger
PASS T2: same doctor+time cannot be booked twice
PASS T3: cancelled slot can be booked again
PASS T4: on-leave doctor cannot be booked
PASS T5: prescription needs a completed appointment
PASS X1: complete_with_prescription is atomic and not repeatable
PASS X2: one prescription per appointment
```

