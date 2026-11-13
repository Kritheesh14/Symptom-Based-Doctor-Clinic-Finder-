-- =====================================================================
-- fts.sql  --  Full-text search (advanced feature: FTS + GIN indexing)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_search ON doctors USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_clinics_search ON clinics USING GIN (search_vector);

-- search_doctors('ravi cardio'):
--   * the text is cut into words of 3+ letters/digits (short words like "my" or "a" would prefix-match almost
--     everything); every word becomes a prefix term (cardio -> cardio:*)
--   * words are OR-ed; a doctor matches if ANY word hits the doctor name, the
--     speciality name, or the name/address of ANY clinic the doctor works at
--   * ts_rank orders results (doctor-name hits count double); more matching words rank higher
--   * optional speciality filter
CREATE OR REPLACE FUNCTION search_doctors(p_query text, p_speciality_id int DEFAULT NULL)
RETURNS TABLE (
    doctor_id           int,
    name                text,
    speciality_id       int,
    speciality_name     text,
    years_experience    int,
    availability_status text,
    clinics             text,
    rank                real
)
LANGUAGE plpgsql STABLE AS $$
#variable_conflict use_column
DECLARE
    tokens text[];
    q      tsquery;
BEGIN
    SELECT array_agg(m[1]) INTO tokens
    FROM regexp_matches(lower(coalesce(p_query, '')), '[a-z0-9]{3,}', 'g') AS m;

    IF tokens IS NULL THEN
        RETURN;                                   -- empty / punctuation-only / only tiny words: no rows
    END IF;

    q := to_tsquery('simple',
                    array_to_string(ARRAY(SELECT t || ':*' FROM unnest(tokens) AS t), ' | '));

    RETURN QUERY
    SELECT d.doctor_id,
           d.name::text,
           s.speciality_id,
           s.speciality_name::text,
           d.years_experience,
           d.availability_status::text,
           COALESCE(string_agg(DISTINCT c.clinic_name, ', '), '')::text,
           (ts_rank(d.search_vector, q) * 2
            + COALESCE(max(ts_rank(c.search_vector, q)), 0)
            + ts_rank(to_tsvector('simple', s.speciality_name), q))::real
    FROM doctors d
    JOIN specialities s       ON s.speciality_id = d.speciality_id
    LEFT JOIN works_at w      ON w.doctor_id = d.doctor_id
    LEFT JOIN clinics c       ON c.clinic_id = w.clinic_id
    WHERE (p_speciality_id IS NULL OR d.speciality_id = p_speciality_id)
      AND (   d.search_vector @@ q
           OR to_tsvector('simple', s.speciality_name) @@ q
           OR EXISTS (SELECT 1
                      FROM works_at w2
                      JOIN clinics c2 ON c2.clinic_id = w2.clinic_id
                      WHERE w2.doctor_id = d.doctor_id AND c2.search_vector @@ q))
    GROUP BY d.doctor_id, d.name, d.search_vector, d.years_experience,
             d.availability_status, s.speciality_id, s.speciality_name
    ORDER BY 8 DESC, d.name;
END $$;

COMMENT ON FUNCTION search_doctors(text, int) IS
 'Ranked full-text search over doctor name, speciality name and clinic name/address (prefix match, GIN indexed).';
