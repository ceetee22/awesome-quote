-- Backfill: create a suppliers record for any business that has parts
-- but no matching supplier entry. Safe to run repeatedly (NOT EXISTS guard).
INSERT INTO suppliers (business_id, name, email, phone, contact_person, notes, is_default, active)
SELECT DISTINCT
  p.business_id,
  p.supplier,
  '',
  '',
  '',
  '',
  true,
  true
FROM parts p
WHERE p.supplier IS NOT NULL
  AND p.supplier != ''
  AND NOT EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.business_id = p.business_id
      AND s.name = p.supplier
  );
