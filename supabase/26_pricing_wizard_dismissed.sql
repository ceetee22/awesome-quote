ALTER TABLE businesses ADD COLUMN IF NOT EXISTS pricing_wizard_dismissed BOOLEAN DEFAULT false;
