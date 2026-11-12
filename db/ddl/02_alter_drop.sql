-- =====================================================================
-- 02_alter_drop.sql  --  ALTER / DROP demonstrations + extra validation
-- Run after 01_schema.sql.  Fully re-runnable (run 01 then 02 twice).
-- =====================================================================

-- ---------- DROP ----------
-- An earlier design iteration kept symptom text in a relational table
-- (symptom_queries) and used the spelling "specialties".  Symptom text now
-- lives in Qdrant, so the legacy tables are retired.  On a fresh database
-- these are no-ops; on a database from the earlier iteration they remove
-- the obsolete tables.
DROP TABLE IF EXISTS symptom_queries;
DO $$
BEGIN
    IF to_regclass('public.specialties') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c
                       WHERE c.confrelid = to_regclass('public.specialties')) THEN
        DROP TABLE public.specialties;
    END IF;
END $$;

-- ---------- ALTER: database-level validation ----------
ALTER TABLE patients DROP CONSTRAINT IF EXISTS chk_patient_email;
ALTER TABLE patients ADD  CONSTRAINT chk_patient_email
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE admins   DROP CONSTRAINT IF EXISTS chk_admin_email;
ALTER TABLE admins   ADD  CONSTRAINT chk_admin_email
    CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE patients DROP CONSTRAINT IF EXISTS chk_contact_info;
ALTER TABLE patients ADD  CONSTRAINT chk_contact_info
    CHECK (contact_info IS NULL OR contact_info ~ '^[0-9+\- ]{7,20}$');

ALTER TABLE clinics  DROP CONSTRAINT IF EXISTS chk_clinic_phone;
ALTER TABLE clinics  ADD  CONSTRAINT chk_clinic_phone
    CHECK (phone IS NULL OR phone ~ '^[0-9+\- ]{7,20}$');

ALTER TABLE doctors  DROP CONSTRAINT IF EXISTS chk_years_realistic;
ALTER TABLE doctors  ADD  CONSTRAINT chk_years_realistic
    CHECK (years_experience <= 60);

-- ---------- ALTER: generated columns for full-text search ----------
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED;

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(clinic_name, '') || ' ' || coalesce(address, ''))) STORED;

COMMENT ON COLUMN doctors.search_vector IS 'Generated tsvector of the doctor name (GIN indexed in advanced/fts.sql).';
COMMENT ON COLUMN clinics.search_vector IS 'Generated tsvector of clinic name + address (GIN indexed in advanced/fts.sql).';
