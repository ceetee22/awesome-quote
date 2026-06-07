-- Navigation app preference per business
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS nav_app TEXT DEFAULT 'google_maps';
