# 12. Application screenshots and testing summary

## Screenshots to capture (save into `docs/screenshots/` and embed here)
| File | Page | How |
|---|---|---|
| `patient/01-landing.png` | `/` | logged out |
| `patient/02-login.png`, `03-register.png` | `/login`, `/register` | show an inline validation error |
| `patient/04-symptom-result.png` | `/symptom-check` | type a keyword-free symptom |
| `patient/05-doctors-search.png` | `/doctors` | search `cardio` |
| `patient/06-book.png` | `/book` | slot grid with a disabled slot |
| `patient/07-appointments.png`, `08-prescriptions.png` | patient lists | |
| `admin/01-dashboard.png` | `/admin` | with symptom-demand chart |
| `admin/02-appointments-prescribe.png` | `/admin/appointments` | Complete + prescribe panel open |
| `admin/03-doctors.png`, `04-clinics.png`, `05-specialities.png` | master data | include a blocked-delete message |
| `db/*.png` | pgAdmin | `\d+ patients` constraints, FTS `EXPLAIN ANALYZE`, query results |
| `qdrant/*.png` | Qdrant dashboard | `symptom_cases` count before and after a completed visit |

## Testing summary
| Suite | Cases | Passed | Not run here |
|---|---|---|---|
| SQL: views + FTS (`test_views_fts.sql`) | 11 + 1 info | 11 | 0 |
| SQL: constraints, triggers, transactions | 14 | 14 | 0 |
| API + security (`api-tests.ts`) | 80 | 77 | 3 (need Qdrant + model) |
| Retrieval evaluation (`qdrant:eval`) | 39 held-out | n/a | run locally, see `docs/testing/retrieval-eval.md` |

Detailed tables: [`docs/testing/test-cases.md`](../testing/test-cases.md). Raw outputs: `db-test-results.md`, `api-test-results.md`.
