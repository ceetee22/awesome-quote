-- 12_rls_authenticated.sql
-- Adds 'authenticated' role policies to every RLS-enabled table.
-- Without this, all browser writes from a logged-in operator are blocked —
-- the 'anon' policies only apply to requests without a user session.
-- Also seeds home_base_lat/lng from the known Parnell address and adds Sunday.

CREATE POLICY "allow authenticated" ON jobs             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON job_items        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON job_item_parts   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON settings         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON callout_zones    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON parts            FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Geocode the existing home_base_address (9 Fox Street, Parnell, Auckland)
-- so directional grouping works immediately. Only sets if still null.
UPDATE settings
SET home_base_lat = -36.8608, home_base_lng = 174.7813
WHERE id = 1
  AND home_base_lat IS NULL;

-- Add Sunday (0) to working_days
UPDATE settings
SET working_days = '{0,1,2,3,4,5,6}'
WHERE id = 1;
