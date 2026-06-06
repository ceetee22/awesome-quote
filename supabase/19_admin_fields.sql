-- 19_admin_fields.sql
-- Add active status and onboarding_complete flag to businesses table.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- Backfill onboarding_complete for businesses that already have jobs (existing users).
UPDATE businesses b
SET onboarding_complete = true
WHERE EXISTS (SELECT 1 FROM jobs j WHERE j.business_id = b.id);
