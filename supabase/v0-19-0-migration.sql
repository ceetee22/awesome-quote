-- v0.19.0: extended business details + logo
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS trading_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS legal_company_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_tagline TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_person_name TEXT;
