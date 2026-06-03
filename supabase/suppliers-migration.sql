-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_person TEXT,
  website TEXT,
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- Seed default supplier
INSERT INTO suppliers (name, email, is_default)
VALUES ('Joinery Hardware NZ', '', true);

-- Add supplier_id to parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
