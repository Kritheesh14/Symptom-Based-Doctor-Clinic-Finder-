# 13. Conclusion and future enhancements

## Conclusion
The project combines PostgreSQL (integrity, transactions, views, full-text search, triggers) with Qdrant (semantic symptom matching) behind a
Next.js application with role-based access. Each store holds the data it is best suited for, the booking rules are enforced by the database
itself, and the system improves with use through the feedback loop.

## Limitations
* Recommendations are statistical suggestions from a small curated corpus, not diagnoses.
* The embedding model is general-purpose English, not medical.
* Doctors have no login; prescriptions are issued by an admin on their behalf.
* Slots are fixed half-hours between 09:00 and 16:30 for every doctor.

## Future work
Doctor accounts and personal schedules; a medical-domain or multilingual embedding model; re-ranking with patient age/sex;
emergency red-flag detection; reminders by e-mail/SMS; moderation of promoted "confirmed" cases before they enter the index; pagination and caching on the admin pages; deployment with managed PostgreSQL and Qdrant Cloud.
