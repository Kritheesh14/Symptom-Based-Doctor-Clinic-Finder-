# Symptom-Based Doctor & Clinic Finder
 
DBMS Experiential Learning, Level 3 project (PES University, Section 5E)
 
| Team member | SRN |
|---|---|
| Kritheesh NV | PES2UG24CS293 |
| Moorty Perepa | PES2UG24CS248 |
 
Patients describe their symptoms in plain language. A **vector database (Qdrant)** finds the most similar
labelled symptom descriptions and recommends the right **speciality**; **PostgreSQL** then supplies the
doctors, clinics, slots, bookings and prescriptions. Admins manage master data and see live statistics.
Every completed visit feeds the patient's original wording back into the vector index (the *feedback loop*).
 
* **SQL (PostgreSQL 16):** 8 tables, constraints, indexes, 4 views, full-text search (GIN), 2 triggers, 2 stored functions, transactions.
* **Vector DB (Qdrant):** two collections, 384-d `all-MiniLM-L6-v2` embeddings, cosine similarity, score-weighted top-K vote.
* **Web (Next.js 16, App Router, TypeScript, Tailwind):** Route Handlers as the API layer, JWT sessions, two roles (patient, admin).
 
## Repository layout
 
```
db/            SQL: ddl/ (schema, ALTER/DROP), advanced/ (FTS, views, triggers, functions), seed/, queries/, tests/, run_all.sh
vector/        corpus.json (208 labelled symptom cases), eval.json (39 held-out cases), README (vector design)
web/           Next.js app: app/ (pages + api/), lib/ (db, auth, data, vector), components/, scripts/ (qdrant + tests)
docs/          report/ (sections 1-13), diagrams/ (draw.io), testing/, demo-script.md, CONTRIBUTIONS.md
docker-compose.yml   PostgreSQL + Qdrant for local development
```
 
## App & vector setup
 
Prerequisites: Node.js 20.9 or newer, Git, Docker (or a local PostgreSQL 14+ and a Qdrant Cloud cluster), `psql`.
 
```bash
# 1. services (PostgreSQL on 5432, Qdrant on 6333)
docker compose up -d
 
# 2. database: schema, constraints, views, triggers, seed data   (--reset wipes the public schema first)
export DATABASE_URL=postgresql://symptom:symptom_dev@localhost:5432/symptom_finder
./db/run_all.sh --reset
 
# 3. web app
cd web
npm install
cp .env.example .env.local          # then edit: DATABASE_URL, QDRANT_URL, JWT_SECRET (openssl rand -base64 48)
 
# 4. vector index (first run downloads the ~25 MB embedding model)
npm run validate:corpus             # checks every label against the 13 specialities
npm run qdrant:setup                # creates collections + payload indexes
npm run qdrant:ingest               # embeds and uploads vector/corpus.json   (add -- --reset to start clean)
npm run qdrant:eval                 # top-1 / top-3 accuracy on vector/eval.json -> docs/testing/retrieval-eval.md
 
# 5. run
npm run dev                         # http://localhost:3000
```
 
Demo logins (created by `db/seed/seed.sql`, local demo use only):
 
| Role | Email | Password |
|---|---|---|
| Patient | `aarav.sharma@example.com` | `Patient@123` |
| Admin | `admin@symptomfinder.example` | `Admin@123` |
 
Try it: log in as the patient, type *"my chest feels tight when I climb stairs"* (no word from the speciality name),
get **Cardiology**, book a slot. Log in as admin, open *Appointments*, **Complete + prescribe**: the Qdrant dashboard
count of `symptom_cases` goes up by one (`source = confirmed`).
 
### Configuration (`web/.env.local`, never committed)
 
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `QDRANT_URL`, `QDRANT_API_KEY` | Qdrant endpoint (API key only for Qdrant Cloud) |
| `JWT_SECRET` | Session signing key, at least 32 random characters |
| `RECOMMEND_TOP_K` (5), `RECOMMEND_MIN_CONFIDENCE` (0.4) | Retrieval tuning |
 
## Tests
 
```bash
# SQL tests (each rolls back; prints PASS/FAIL notices)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/test_views_fts.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/test_constraints_triggers.sql
 
# API + security suite (needs the app running and a seeded DB; --write saves docs/testing/api-test-results.md)
cd web && npm run build && npm start &            # or: npm run dev
npx tsx --env-file=.env.local scripts/api-tests.ts --write
```
 
## Troubleshooting
 
* **First vector call is slow / fails offline:** the embedding model is downloaded once from Hugging Face and cached.
  Without network access the symptom check answers `503` (the rest of the app keeps working).
* **`ECONNREFUSED 6333`:** Qdrant is not running (`docker compose up -d qdrant`). The admin dashboard still loads and shows a notice.
* **`Missing environment variable`:** create `web/.env.local` from `.env.example`.
* **Qdrant Cloud instead of Docker:** set `QDRANT_URL` to the cluster URL and `QDRANT_API_KEY` to its key.
* **Seed dates look stale:** appointment times are generated relative to the moment you run `seed.sql`; re-run `./db/run_all.sh` to refresh.
* **Existing database from the earlier design** (`specialties`, `symptom_queries`, ...): use `./db/run_all.sh --reset`.
 
## Status of this code base
 
Verified when this repository was assembled (PostgreSQL 16, Node 22): all SQL scripts run twice without error; 25 SQL
tests and 77 API/security tests pass; `tsc` and `next build` succeed. **Not executable in that environment and therefore
not yet run:** Qdrant, the embedding-model download, the retrieval evaluation and the feedback loop (the API suite
shows them as skipped, and the app degrades to a clear 503). Run steps 4-5 above and then
`npm run qdrant:eval` to record the accuracy numbers (targets: top-1 >= 70 %, top-3 >= 90 %).
 
## Git workflow
 
Use feature branches and small commits per person (`git shortlog -sn` is used in the demo to show individual contributions).
Conventional prefixes used in this project: `feat(db)`, `feat(vector)`, `feat(auth)`, `feat(api)`, `feat(ui)`, `test(...)`, `docs(...)`, `chore(repo)`.
