# 9. Vector database implementation

The full design (collections, payloads, indexes, embeddings, metric, retrieval, feedback loop) is documented in
[`vector/README.md`](../../vector/README.md) and drawn in `docs/diagrams/qdrant-model.drawio`. Summary:

| Item | Choice |
|---|---|
| Data embedded | corpus descriptions (`symptom_cases`) and patient queries (`patient_queries`) |
| Model | all-MiniLM-L6-v2, 384-d, mean pooling, normalised, run in-process (`@xenova/transformers`) |
| Storage | Qdrant; UUID points; payload with `speciality_id`, `speciality_name`, `source`, ...; payload indexes on `speciality_id`, `source`, `patient_id`, `appointment_id` |
| Metric | Cosine |
| Retrieval | top-K (5) nearest cases, score-weighted vote per speciality, confidence = winner share, threshold 0.4, top-3 alternatives |
| Feedback loop | query -> linked to appointment at booking -> on completion copied to `symptom_cases` with `source = confirmed` and the doctor's speciality |
| Corpus | 208 original cases (16 per speciality, 13 specialities), written for this project; 39 held-out evaluation cases |

Code: `web/lib/vector/{client,embed,recommend,queries}.ts`, scripts `web/scripts/{setup-qdrant,ingest-corpus,eval-retrieval,validate-corpus}.ts`.

## Evaluation
Run `npm run qdrant:eval`; results are written to `docs/testing/retrieval-eval.md` (targets: top-1 >= 70 %, top-3 >= 90 %).
Paste the table here before submission. If a target is missed, improve the corpus (more varied phrasings), not the code.

## Privacy note
Symptom text is health-related. It is stored only in Qdrant, keyed by `patient_id`; "confirmed" cases are never displayed to other
patients (the API returns only curated seed cases as "similar descriptions"). A production system would add consent, retention limits and encryption at rest.
