-- 10_geo_and_rebook.sql
-- Adds geo-coordinates for Phase 2 travel estimation and bumped_from_date
-- for rebooking tracking. Run once in the Supabase SQL editor before running
-- the planner seed script.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_lat  NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_lng  NUMERIC;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS bumped_from_date DATE;
