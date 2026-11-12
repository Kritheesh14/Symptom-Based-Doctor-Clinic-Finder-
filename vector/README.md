# Vector data model (Qdrant)

Why a vector database: patients describe symptoms in everyday words ("my chest feels tight when I climb stairs") that
share no keywords with the speciality ("Cardiology"). Keyword/full-text search cannot bridge that gap; embeddings can.

## What is converted into embeddings
* **Corpus text** (`corpus.json`, 208 original patient-style descriptions, 13 specialities, 16 per speciality) -> collection `symptom_cases`.
* **Patient query text** (what a real patient typed in the symptom check) -> collection `patient_queries`.
No structured data (doctors, appointments) is embedded; that stays in PostgreSQL.

## Embedding model
`Xenova/all-MiniLM-L6-v2` (sentence-transformers MiniLM, ONNX build) run inside the Next.js server process with
`@xenova/transformers`: mean pooling, L2-normalised, **384 dimensions**. No external API, no cost, no patient text leaves the server.

## How vectors are stored
| Collection | Vector | Payload | Payload indexes |
|---|---|---|---|
| `symptom_cases` | 384-d, Cosine | `text`, `speciality_id`, `speciality_name`, `source` (`seed` / `confirmed`), `created_at`, `appointment_id` (confirmed only) | `speciality_id` (integer), `source` (keyword) |
| `patient_queries` | 384-d, Cosine | `patient_id`, `text`, `speciality_id` (predicted), `speciality_name`, `confidence`, `low_confidence`, `appointment_id`, `created_at` | `patient_id`, `speciality_id`, `appointment_id` (integer) |

Point ids are UUIDs. Seed points use a deterministic id (SHA-1 of the text), so re-running the ingest never duplicates.
`speciality_id`, `patient_id` and `appointment_id` are *logical* references to PostgreSQL rows (no cross-database FK).

## Similarity metric
**Cosine similarity.** Vectors are normalised, so cosine equals the dot product; scores range 0..1 for natural-language text.

## Retrieval strategy
1. Embed the patient's text.
2. Search `symptom_cases` for the top-K nearest points (`RECOMMEND_TOP_K`, default 5).
3. **Score-weighted vote:** add up the similarity of the hits per `speciality_id`; the highest total wins.
4. `confidence = winner total / sum of all totals`. If it is below `RECOMMEND_MIN_CONFIDENCE` (default 0.4) the UI says it is unsure,
   lists the top-3 alternatives and suggests General Medicine.
5. The top-3 specialities and the nearest *curated* cases are returned; "confirmed" cases are patients' own words and are never shown to other patients.

## Feedback loop
`patient_queries` points are linked to the appointment the patient books (`appointment_id`). When an admin completes the
appointment and writes the prescription, the point is copied into `symptom_cases` with `source = confirmed`, labelled with the
speciality of the doctor who actually saw the patient. Real usage therefore improves future recommendations.

## Evaluation
`eval.json` holds 39 held-out descriptions (3 per speciality, not paraphrases of corpus lines). `npm run qdrant:eval` reports
top-1 and top-3 accuracy and writes `docs/testing/retrieval-eval.md`. Targets: top-1 >= 70 %, top-3 >= 90 %.
If a speciality scores badly, add more varied phrasings to `corpus.json` and re-run `npm run qdrant:ingest`.
