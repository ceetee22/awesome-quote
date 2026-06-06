-- 17_add_business_id.sql
-- Adds business_id FK to all core data tables, backfills with the default
-- business, applies NOT NULL, and sets DEFAULT for future inserts.

-- jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE jobs SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE jobs ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE jobs ALTER COLUMN business_id SET DEFAULT get_my_business_id();

-- parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE parts SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE parts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE parts ALTER COLUMN business_id SET DEFAULT get_my_business_id();

-- callout_zones
ALTER TABLE callout_zones ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE callout_zones SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE callout_zones ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE callout_zones ALTER COLUMN business_id SET DEFAULT get_my_business_id();

-- suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE suppliers SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE suppliers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN business_id SET DEFAULT get_my_business_id();

-- travel_cache: shared geo cache, accessed via service role key (RLS bypassed).
-- business_id required for structural consistency with multi-tenant schema.
ALTER TABLE travel_cache ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE travel_cache SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE travel_cache ALTER COLUMN business_id SET NOT NULL;

-- weather_cache: same rationale as travel_cache
ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);
UPDATE weather_cache SET business_id = (SELECT id FROM businesses LIMIT 1) WHERE business_id IS NULL;
ALTER TABLE weather_cache ALTER COLUMN business_id SET NOT NULL;
