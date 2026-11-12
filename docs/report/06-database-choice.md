# 6. Database choice and justification
 
> Database technology must be selected based on the problem requirements, and each store must be justified for its type of data.
 
| Data | Store | Why |
|---|---|---|
| Patients, doctors, clinics, appointments, prescriptions, accounts | **PostgreSQL** | Strongly structured, relational (M:N, 1:N), needs ACID transactions, foreign keys, CHECK/UNIQUE constraints, triggers, views. A double booking or an orphaned prescription must be *impossible*, not merely unlikely. |
| Doctor / clinic name search | **PostgreSQL full-text search (GIN)** | Searching names and addresses is exact-word matching on structured text; built-in FTS is enough and keeps it next to the data. |
| Free-text symptom descriptions | **Qdrant (vector database)** | Patients use everyday words that share no keywords with medical terms. Matching must be by *meaning*: nearest neighbours over embeddings with cosine similarity. A relational database cannot rank by semantic similarity efficiently. |
 
## Why not only SQL, why not NoSQL
* **FTS cannot bridge vocabulary.** Measured with `search_doctors` on five symptom sentences taken from the evaluation set: **0 rows for every one** (see below). A speciality name is never in the patient's sentence.
* A document store (MongoDB) would add flexibility the data does not need and give up foreign keys and transactions, which are the core of booking integrity. The only unstructured data is symptom text, which needs similarity search, not documents.
* Why a separate vector database rather than `pgvector`: the guideline asks for a second paradigm; Qdrant provides payload filtering and payload indexes, a dashboard to demonstrate the feedback loop live, and keeps health-related free text apart from the transactional database.
 
## Keyword-free evidence (FTS vs. vector search)
| # | Patient's words | `search_doctors` (FTS) | Vector search (expected speciality) |
|---|---|---|---|
| 1 | my pulse becomes very fast suddenly and my chest feels heavy | 0 rows | Cardiology |
| 2 | I see a curtain of shadow over part of my vision | 0 rows | Ophthalmology |
| 3 | pauses in breathing during sleep and daytime sleepiness with loud snoring | 0 rows | Pulmonology |
| 4 | my father struggles to start urinating and the flow is very slow | 0 rows | Urology |
| 5 | I suddenly lost balance and couldn't speak properly for ten minutes | 0 rows | Neurology |
 
The FTS column was measured against the seeded database (`SELECT count(*) FROM search_doctors('...')`).
The vector column is the label of each case in `vector/eval.json`; record the measured outcome by running `npm run qdrant:eval`
(per-case misses are listed in `docs/testing/retrieval-eval.md`) and demonstrate live in the app.
 
## Consistency between the two stores
There is no cross-database foreign key. Qdrant payloads hold `speciality_id`, `patient_id` and `appointment_id` as logical references.
The booking and the prescription are committed in PostgreSQL first; updates to Qdrant are best-effort and never fail the transaction
(failures are logged, the next completed visit simply adds its own case).
