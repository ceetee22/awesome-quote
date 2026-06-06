-- ─── Master catalogue tables (system-level, no business_id) ─────────────────
-- These are shared across all tenants. RLS: SELECT for authenticated users only.
-- INSERT/UPDATE/DELETE is blocked for normal users (service role only).

CREATE TABLE master_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  parts_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE master_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_suppliers_select_authenticated"
  ON master_suppliers FOR SELECT TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE master_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES master_suppliers(id),
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  rrp NUMERIC,
  fits TEXT[] DEFAULT '{}',
  fixes TEXT[] DEFAULT '{}',
  default_qty INTEGER DEFAULT 1,
  photo_url TEXT,
  unit TEXT DEFAULT 'each',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE master_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_parts_select_authenticated"
  ON master_parts FOR SELECT TO authenticated USING (true);

-- ─── Seed: Joinery Hardware NZ supplier ──────────────────────────────────────

INSERT INTO master_suppliers (name, active)
VALUES ('Joinery Hardware NZ', true);

-- ─── Seed: copy Dean's active parts (RRP + metadata only, never cost/sell) ───

INSERT INTO master_parts (
  supplier_id, sku, name, category, rrp,
  fits, fixes, default_qty, photo_url, unit, active
)
SELECT
  (SELECT id FROM master_suppliers WHERE name = 'Joinery Hardware NZ' LIMIT 1),
  sku, name, category, rrp,
  fits, fixes, default_qty, photo_url, unit, active
FROM parts
WHERE business_id = (
  SELECT id FROM businesses WHERE name LIKE '%Awesome%' LIMIT 1
)
AND active = true;

-- ─── Update parts_count ───────────────────────────────────────────────────────

UPDATE master_suppliers
SET parts_count = (
  SELECT COUNT(*) FROM master_parts
  WHERE supplier_id = master_suppliers.id
)
WHERE name = 'Joinery Hardware NZ';
