-- Delete duplicate business (zero linked rows — verified safe)
DELETE FROM businesses WHERE id = '1125c9c3-60c1-4f60-b7ec-c8021ddc9ca9';

-- Prevent future race-condition duplicates: one business per owner
ALTER TABLE businesses ADD CONSTRAINT businesses_owner_id_unique UNIQUE (owner_id);

-- Fix get_my_business_id() to be deterministic (oldest business wins if dupes ever slip through)
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() ORDER BY created_at LIMIT 1
$$;
