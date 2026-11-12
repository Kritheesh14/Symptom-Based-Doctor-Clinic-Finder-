# Demo script (about 10 minutes)

Prepare: `docker compose up -d`, `./db/run_all.sh --reset`, `npm run qdrant:setup && npm run qdrant:ingest`, `npm run dev`.
Open: the app, the Qdrant dashboard (http://localhost:6333/dashboard), pgAdmin or `psql`.

| Min | Who | What |
|---|---|---|
| 0:00 | Both | Problem statement and motivation: patients do not know which specialist to see |
| 0:45 | Both | ER diagram and relational schema (`docs/diagrams`); highlight `works_at` M:N and the composite FK that ties appointments to works_at |
| 1:45 | Moorty | SQL implementation: DDL, constraints, seed; live: try to insert a bad e-mail (23514), book the same slot twice (23505) |
| 3:00 | Kritheesh | **Database choice (1 min):** why PostgreSQL for structured data, why Qdrant for symptom text; show the five keyword-free sentences returning 0 rows in FTS |
| 4:00 | Kritheesh | **Live vector search (2 min):** log in as patient, type "my pulse becomes very fast suddenly and my chest feels heavy" -> Cardiology, similar cases, confidence; contrast with `SELECT * FROM search_doctors(...)` = 0 rows |
| 5:15 | Moorty | Book a slot (transaction + trigger + unique index), show `v_upcoming_appointments` |
| 6:00 | Kritheesh | **Admin (2 min):** dashboard, Complete + prescribe, then the Qdrant dashboard: `symptom_cases` +1 with `source = confirmed` (feedback loop) |
| 7:30 | Kritheesh | **Security (1 min):** patient opening `/admin` is redirected; `SELECT email, left(password_hash,7) FROM patients` shows `$2b$10$`; `.env.local` not in Git |
| 8:30 | Kritheesh | Advanced features: views, FTS + `EXPLAIN ANALYZE` (GIN), triggers, functions, transactions, vector search |
| 9:00 | Both | Test cases and results (`docs/testing`), retrieval accuracy |
| 9:30 | Each | Individual contribution: `git shortlog -sn`, merged pull requests |

Backup if Qdrant fails during the demo: show `docs/testing/retrieval-eval.md` and the Qdrant dashboard screenshots; the rest of the app keeps working.
