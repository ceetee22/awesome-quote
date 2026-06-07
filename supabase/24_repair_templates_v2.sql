-- Standard price (GST-inclusive, manually entered — not calculated from parts/labour)
ALTER TABLE repair_templates ADD COLUMN IF NOT EXISTS price NUMERIC;

-- Custom repair type support
ALTER TABLE repair_templates ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE repair_templates ADD COLUMN IF NOT EXISTS custom_name TEXT;
