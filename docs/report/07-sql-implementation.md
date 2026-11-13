# 7. SQL implementation

All scripts are re-runnable and are executed in this order by `db/run_all.sh`:

| File | Contents | Concepts |
|---|---|---|
| `db/ddl/01_schema.sql` | 8 tables, PK/FK, CHECK, UNIQUE, DEFAULT, indexes, partial unique index, table comments | CREATE, constraints, indexing |
| `db/ddl/02_alter_drop.sql` | DROP legacy tables; ALTER ... ADD CONSTRAINT (e-mail, phone, years); ALTER ... ADD COLUMN generated `tsvector` | ALTER, DROP |
| `db/advanced/fts.sql` | GIN indexes; `search_doctors(text, int)` ranked prefix search with `ts_rank` | Full-text search, indexing, function |
| `db/advanced/views.sql` | `v_doctor_directory`, `v_upcoming_appointments`, `v_patient_history`, `v_admin_stats` (DROP/re-create demo) | Views |
| `db/advanced/functions_triggers.sql` | triggers `appointment_not_in_past`, `prescription_requires_completed`; functions `book_appointment`, `complete_with_prescription` | Triggers, functions, transactions |
| `db/seed/seed.sql` | 13 specialities, 6 clinics, 20 doctors, 26 doctor-clinic links, 10 patients, 2 admins, 75 appointments, prescriptions | INSERT |
| `db/queries/important_queries.sql` | 9 analytical queries + 3 DML examples (rolled back) | JOIN, GROUP BY, HAVING, subqueries, DML |

## Advanced database concepts demonstrated (rubric asks for four)
1. **Vector similarity search** (Qdrant, section 9).
2. **Full-text search** with GIN indexes (`EXPLAIN ANALYZE` in section 10 shows `Bitmap Index Scan on idx_doctors_search`).
3. **Views** (4) used directly by the application.
4. **Triggers**: no scheduled appointment in the past; no prescription unless the appointment is completed.
5. **Stored functions + transactions**: `book_appointment` (atomic availability check + insert) and `complete_with_prescription`
   (row lock `FOR UPDATE`, status change and prescription in one atomic unit; a second call is rejected).
6. **Indexing**: partial unique index for double-booking prevention, foreign-key indexes, GIN indexes.

## Data validation and integrity at database level
Input is validated in the browser, in the API (zod) **and** in the database, which is the final authority:
CHECK constraints (age, formats, enumerations), NOT NULL, UNIQUE, composite FK `appointments -> works_at`, triggers, and RESTRICT/CASCADE rules.
The API translates SQLSTATE codes to HTTP: 23505 -> 409, 23503 -> 409, 23514 -> 400, P0001 (our `RAISE EXCEPTION`) -> 409.
Tests `C1..C7, T1..T5, X1..X2` in `docs/testing/db-test-results.md` prove each rule.
