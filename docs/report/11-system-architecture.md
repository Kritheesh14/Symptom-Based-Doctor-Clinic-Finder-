# 11. System architecture

Editable diagram: `docs/diagrams/architecture.drawio`.

```mermaid
flowchart LR
  B[Browser: Next.js pages] --> P[proxy.ts page guard: JWT cookie]
  P --> A[Route Handlers /api/*: zod + requireRole]
  A -->|parameterised SQL| PG[(PostgreSQL: tables, views, FTS, triggers)]
  A -->|vector search| Q[(Qdrant: symptom_cases, patient_queries)]
  A --> E[Embedding model all-MiniLM-L6-v2]
  A --> AU[Auth: bcryptjs + JWT HS256 HttpOnly cookie]
```

## Sequence: symptom check -> book -> complete -> feedback

```mermaid
sequenceDiagram
  actor Pat as Patient
  participant API as Next.js API
  participant Q as Qdrant
  participant DB as PostgreSQL
  actor Adm as Admin
  Pat->>API: POST /api/symptom-check {text}
  API->>API: embed(text)
  API->>Q: top-K search in symptom_cases
  Q-->>API: nearest cases
  API->>API: weighted vote -> speciality + confidence
  API->>Q: upsert patient_queries (queryId)
  API->>DB: SELECT available doctors of speciality
  API-->>Pat: speciality, alternatives, doctors, queryId
  Pat->>API: POST /api/appointments {doctor, clinic, slot, queryId}
  API->>DB: SELECT book_appointment(...)  (atomic)
  API->>Q: setPayload(appointment_id) on the query point
  Adm->>API: POST /api/prescriptions {appointmentId, medicine}
  API->>DB: SELECT complete_with_prescription(...)  (one transaction)
  API->>Q: copy query point into symptom_cases (source = confirmed)
  API-->>Adm: prescriptionId, promotedToCorpus
```

## Layers
* **UI:** React client pages call only the JSON API; server components read the session for navigation.
* **API:** one Route Handler per resource; each starts with `requireRole(...)`; input validated with zod; errors mapped centrally (`lib/errors.ts`).
* **Data:** `lib/data/*` and `lib/admin/*` hold all SQL (parameterised); `lib/vector/*` holds all Qdrant access.
* **Security:** bcrypt (cost 10), JWT HS256 in an HttpOnly SameSite=Lax cookie (Secure in production), secrets only in environment variables, security headers in `next.config.ts`.
