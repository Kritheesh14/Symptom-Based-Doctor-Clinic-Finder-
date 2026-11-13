# Symptom-Based Doctor & Clinic Finder
## Complete Local Setup and Execution Guide

**Stack:** Next.js 16, React, TypeScript, Node.js 22, PostgreSQL 16, Docker Compose, Qdrant, and `all-MiniLM-L6-v2` embeddings (384 dimensions).

Run commands in **Windows CMD** unless stated otherwise. Run project commands from the repository root unless a step says to enter `web`.

---

## 1. Install prerequisites

### Git

Install Git for Windows: https://git-scm.com/download/win

```cmd
git --version
```

### Node.js

Install Node.js 22 LTS: https://nodejs.org/

```cmd
node --version
npm --version
```

The Node version should be 22.x.

### Docker Desktop

Install Docker Desktop: https://www.docker.com/products/docker-desktop/

1. Use the WSL 2 backend if prompted and supported.
2. Complete any WSL setup requested by the installer.
3. Restart Windows if requested.
4. Launch Docker Desktop and wait until its engine is running.

Verify:

```cmd
docker --version
docker compose version
docker info
```

`docker info` must return server details. If Docker cannot connect to the daemon, start Docker Desktop and wait for it to finish loading.

**Do not install separate PostgreSQL or Qdrant servers.** The project runs these services using Docker Compose.

---

## 2. Get the repository

For a fresh clone:

```cmd
cd /d "C:\My Files\Programming\PESUclass\Sem-5\DBMS\Project\Github"
git clone https://github.com/Kritheesh14/Symptom-Based-Doctor-Clinic-Finder-.git
cd Symptom-Based-Doctor-Clinic-Finder-
```

For an existing clone:

```cmd
cd /d "C:\My Files\Programming\PESUclass\Sem-5\DBMS\Project\Github\Symptom-Based-Doctor-Clinic-Finder-"
git switch main
git pull --rebase origin main
```

Check that the project folders exist:

```cmd
dir
dir db
dir web
dir vector
```

Important files include `docker-compose.yml`, `db/ddl/01_schema.sql`, `db/ddl/02_alter_drop.sql`, `db/advanced/fts.sql`, `db/advanced/views.sql`, `db/advanced/functions_triggers.sql`, `db/seed/seed.sql`, `web/package.json`, and `web/.env.example`.

---

## 3. Configure the web environment

Enter the web folder:

```cmd
cd web
```

If `.env.local` does not exist:

```cmd
copy .env.example .env.local
```

If it already exists, do not overwrite it. Open it:

```cmd
notepad .env.local
```

Review `web/.env.example` and populate every required variable in `.env.local`. Use the actual variable names and values expected by the checked-out code and Compose configuration.

The tested local values include:

```env
DATABASE_URL=postgresql://symptom:symptom_dev@localhost:5433/symptom_finder
QDRANT_URL=http://localhost:6333
```

Configuration notes:

- PostgreSQL is exposed on host port `5433` and listens on `5432` inside its container.
- Qdrant is exposed at `http://localhost:6333`.
- These values match the tested local setup. If `docker-compose.yml` specifies different credentials or ports, use those values consistently.
- Add any other variables required by `.env.example`.
- Never commit `.env.local`, passwords, API keys, or signing secrets.

Save and close Notepad. Return to the repository root:

```cmd
cd ..
```

Check that Git ignores the local file:

```cmd
git check-ignore web/.env.local
```

Git should print `web/.env.local`. If it prints nothing, fix the ignore rule before committing anything. Do not stage the local environment file.

---

## 4. Validate and start Docker services

From the repository root:

```cmd
docker compose config
docker compose config --services
```

The first command validates the Compose file. The second lists the actual service names. The tested service names are `postgres` and `qdrant`.

Start them:

```cmd
docker compose up -d postgres qdrant
docker compose ps
```

If the service names differ in the checked-out Compose file, use the names shown by `docker compose config --services`.

Check logs if a service is unhealthy or exits:

```cmd
docker compose logs --tail=100 postgres
docker compose logs --tail=100 qdrant
```

Check PostgreSQL readiness:

```cmd
docker compose exec postgres pg_isready -U symptom -d symptom_finder
```

Expected result includes `accepting connections`.

Open `http://localhost:6333` in a browser to check that Qdrant responds.

**Do not use `docker compose down -v` as a routine command.** The `-v` option deletes persistent volumes and can erase database and Qdrant data.

---

## 5. Initialize PostgreSQL

Run every command in this section from the **repository root**. If currently in `web`, run:

```cmd
cd ..
```

Execute the SQL files in this exact order. `-v ON_ERROR_STOP=1` makes `psql` stop on the first SQL error.

### 5.1 Create the base schema

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/ddl/01_schema.sql
```

The script should create the `pgcrypto` extension, eight tables, and indexes. The core tables are:

- `specialities`
- `clinics`
- `doctors`
- `works_at`
- `patients`
- `admins`
- `appointments`
- `prescriptions`

If this command only displays a query result such as `tablename | indexname | indexdef` and `(0 rows)`, it is not creating the schema. Open `db/ddl/01_schema.sql` and verify that it contains `CREATE TABLE IF NOT EXISTS` statements. Fix this before continuing.

### 5.2 Apply alterations and constraints

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/ddl/02_alter_drop.sql
```

Notices that an optional constraint or table does not exist and is being skipped can be normal on a fresh database. An error that a required relation such as `patients` does not exist means the base schema step failed.

### 5.3 Create full-text-search objects

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/fts.sql
```

### 5.4 Create views

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/views.sql
```

### 5.5 Create functions and triggers

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/functions_triggers.sql
```

### 5.6 Load demo seed data

```cmd
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/seed/seed.sql
```

The tested seed file inserted:

- 13 specialities
- 6 clinics
- 20 doctors
- 26 doctor-clinic mappings
- 10 patients
- 2 admins
- 25 appointments

**Important seed warning:** the current seed script executes `TRUNCATE TABLE` before inserting demo data. This can erase existing application records and replace them with demo records. Run it on a fresh database or when you deliberately want to reset the data. Do not run it casually on a database containing records you need.

---

## 6. Verify the database

List tables:

```cmd
docker compose exec postgres psql -U symptom -d symptom_finder -c "\dt"
```

There should be eight core tables listed above.

Check demo record counts:

```cmd
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS patients FROM patients;"
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS admins FROM admins;"
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS specialities FROM specialities;"
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS clinics FROM clinics;"
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS doctors FROM doctors;"
docker compose exec postgres psql -U symptom -d symptom_finder -c "SELECT COUNT(*) AS appointments FROM appointments;"
```

Expected counts for the tested seed dataset: 10 patients, 2 admins, 13 specialities, 6 clinics, 20 doctors, and 25 appointments. If the counts differ, inspect the seed output and SQL file before proceeding.

---

## 7. Install Node dependencies

Enter the web directory:

```cmd
cd web
```

Install the exact dependency versions from the lockfile:

```cmd
npm ci
```

List the npm scripts available in this checkout:

```cmd
npm run
```

If `npm ci` reports that `package.json` and `package-lock.json` are out of sync, inspect the error and repository changes. Do not delete the lockfile as a first response. If dependencies were intentionally changed, run `npm install`, review the lockfile changes, and commit the updated lockfile.

---

## 8. Initialize Qdrant and ingest the corpus

Run from the `web` directory.

### 8.1 Create or verify collections and payload indexes

```cmd
npm run qdrant:setup
```

The script should create or confirm the required collections and indexes. A message that a collection already exists is normal on repeat setup.

### 8.2 Ingest the symptom corpus

```cmd
npm run qdrant:ingest
```

The tested corpus contains 208 cases. Successful ingestion should finish with:

```text
upserted 208 / 208
```

Do not continue if ingestion fails or stops before all records are processed.

### 8.3 Validate the corpus

Check `npm run` for the validation script. If the project defines `validate:corpus`, run:

```cmd
npm run validate:corpus
```

Otherwise run the script directly:

```cmd
npx tsx --env-file=.env.local scripts/validate-corpus.ts
```

### 8.4 Run retrieval evaluation

If `npm run` lists `eval:retrieval`, run:

```cmd
npm run eval:retrieval
```

Otherwise:

```cmd
npx tsx --env-file=.env.local scripts/eval-retrieval.ts
```

Previously observed evaluation on 39 held-out cases:

- Top-1 accuracy: 97.4% (38/39)
- Top-3 accuracy: 100% (39/39)

These are recorded results from the tested project version, not a guarantee that a changed corpus or model will reproduce them exactly.

---

## 9. Start the Next.js application

Keep the terminal in `web`. Ensure Docker services are running, then:

```cmd
npm run dev
```

Wait for Next.js to report that it is ready. Open:

http://localhost:3000

Important routes:

- `/` — home
- `/register` — patient registration
- `/login` — login
- `/doctors` — doctor search
- `/symptom-check` — symptom recommendation
- `/appointments` — patient appointments
- `/prescriptions` — prescriptions
- `/admin` — admin dashboard (requires admin login)

Keep the terminal open while using the app. Stop the dev server with `Ctrl + C`. If CMD asks `Terminate batch job (Y/N)?`, type the single letter `y`, not `yes`.

---

## 10. Test the main workflows

The following demo credentials were used in the tested version. Confirm them against `db/seed/seed.sql` if the seed file has changed.

Patient:

```text
Email:    aarav.sharma@example.com
Password: Patient@123
```

Admin:

```text
Email:    admin@symptomfinder.example
Password: Admin@123
```

Test in this order:

1. Open the home page.
2. Log in as the patient.
3. Open `/symptom-check`.
4. Enter a symptom description and submit it.
5. Confirm that recommendations load.
6. Open `/doctors` and inspect doctor/speciality results.
7. Book an appointment with an available doctor and slot.
8. Open `/appointments` and verify the booking.
9. Log out.
10. Log in as the admin.
11. Open `/admin`.
12. Inspect doctor, clinic, speciality, and appointment management.

The symptom-check API should return HTTP `200` when the database, Qdrant collections, and corpus ingestion are ready. An HTTP `503` can indicate that the vector service or its data is not ready. Inspect the Next.js terminal output and Qdrant container logs.

---

## 11. Troubleshooting

### Docker cannot connect to the daemon

Start Docker Desktop and wait for the engine to become ready:

```cmd
docker info
docker compose ps
```

### PostgreSQL is not ready

```cmd
docker compose ps
docker compose logs --tail=100 postgres
docker compose exec postgres pg_isready -U symptom -d symptom_finder
```

Wait for the database to accept connections before running SQL.

### `relation "patients" does not exist` or `relation "doctors" does not exist`

The base schema was not created. Verify that `db/ddl/01_schema.sql` contains actual `CREATE TABLE` statements. Run section 5.1, verify the eight tables using `\dt`, and only then rerun the remaining SQL files in order.

### PostgreSQL authentication failure

Compare `docker-compose.yml` with `web/.env.local`. The tested connection string is:

```env
DATABASE_URL=postgresql://symptom:symptom_dev@localhost:5433/symptom_finder
```

Use the credentials and ports actually defined in Compose if they differ. Restart Next.js after changing environment variables.

### Qdrant connection failure or symptom-check returns 503

Check:

```cmd
docker compose ps
docker compose logs --tail=100 qdrant
```

Confirm the configured endpoint:

```env
QDRANT_URL=http://localhost:6333
```

Then, from `web`, run:

```cmd
npm run qdrant:setup
npm run qdrant:ingest
```

Restart Next.js and retry the symptom check.

### Node module or dependency errors

From `web`:

```cmd
node --version
npm --version
npm ci
```

Use Node.js 22.x for the tested setup.

### Port already in use

Stop the process already using the port, or change the host port in `docker-compose.yml` and update the corresponding application environment variable. Do not change only one side of a port mapping.

### SQL script stops with an error

The `ON_ERROR_STOP=1` option intentionally stops at the first error. Fix that error before moving to the next SQL script. Do not treat a partially executed script as successful.

---

## 12. Normal startup after the first setup

After the initial setup is complete, do **not** recreate the schema or reload seed data every time.

From the repository root:

```cmd
docker compose up -d postgres qdrant
docker compose ps
cd web
npm run dev
```

Open http://localhost:3000.

Only rerun schema/alteration scripts when the database is fresh or the schema has changed. Only rerun seed when you intentionally need the demo data reset. Only rerun Qdrant ingestion when the collection is fresh or the corpus has changed.

---

## 13. Stop the project safely

Stop Next.js with `Ctrl + C`.

From the repository root, stop Docker containers while preserving their volumes:

```cmd
docker compose stop
```

Start them again later:

```cmd
docker compose start
```

You can also use `docker compose up -d postgres qdrant`.

Avoid this unless you deliberately intend to delete persisted database and Qdrant data:

```cmd
docker compose down -v
```

---

## 14. Commit and push project changes

From the repository root:

```cmd
git status
git diff --stat
```

Make sure `web/.env.local`, passwords, API keys, signing secrets, and private tokens are not staged.

Stage and inspect:

```cmd
git add -A
git diff --cached --stat
git status
```

Commit and push:

```cmd
git commit -m "docs: add complete local setup and execution guide"
git pull --rebase origin main
git push origin main
```

---

## Quick reference: first-time setup

From the repository root, after prerequisites, repository clone, and environment configuration:

```cmd
docker compose config
docker compose up -d postgres qdrant
docker compose ps
docker compose exec postgres pg_isready -U symptom -d symptom_finder

docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/ddl/01_schema.sql
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/ddl/02_alter_drop.sql
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/fts.sql
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/views.sql
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/advanced/functions_triggers.sql
docker compose exec -T postgres psql -U symptom -d symptom_finder -v ON_ERROR_STOP=1 -f /dev/stdin < db/seed/seed.sql

docker compose exec postgres psql -U symptom -d symptom_finder -c "\dt"
cd web
npm ci
npm run qdrant:setup
npm run qdrant:ingest
npm run dev
```

If `.env.local` already exists, do not overwrite it. If the repository defines different Compose service names, environment variables, or npm scripts, use the names in the checked-out files.

## Setup flow

```text
Install Git, Node.js 22, Docker Desktop
                  |
                  v
             Clone repo
                  |
                  v
         Configure web/.env.local
                  |
                  v
      Start PostgreSQL and Qdrant
                  |
                  v
        Create relational schema
                  |
                  v
        Apply constraints/changes
                  |
                  v
        Create FTS indexes/function
                  |
                  v
              Create views
                  |
                  v
       Create functions and triggers
                  |
                  v
             Load seed data
                  |
                  v
          Verify database tables
                  |
                  v
          Install npm dependencies
                  |
                  v
       Set up Qdrant collections
                  |
                  v
          Ingest symptom corpus
                  |
                  v
        Start Next.js application
                  |
                  v
       Test patient/admin workflows
```

**Configuration caveat:** This guide reflects the tested local setup and command sequence. If the checked-out project has changed, verify the exact environment variable names, Docker Compose service names, and npm scripts against `web/.env.example`, `docker-compose.yml`, and `web/package.json`.
