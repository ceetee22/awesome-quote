-- 18_rls_scoped.sql
-- Replaces broad "allow all / allow authenticated" policies with business_id-scoped
-- policies so each user can only access their own business's data.

-- Drop existing broad policies
DROP POLICY IF EXISTS "allow all" ON jobs;
DROP POLICY IF EXISTS "allow authenticated" ON jobs;
DROP POLICY IF EXISTS "allow all" ON job_items;
DROP POLICY IF EXISTS "allow authenticated" ON job_items;
DROP POLICY IF EXISTS "allow all" ON job_item_parts;
DROP POLICY IF EXISTS "allow authenticated" ON job_item_parts;
DROP POLICY IF EXISTS "allow all" ON parts;
DROP POLICY IF EXISTS "allow authenticated" ON parts;
DROP POLICY IF EXISTS "allow all" ON callout_zones;
DROP POLICY IF EXISTS "allow authenticated" ON callout_zones;
DROP POLICY IF EXISTS "allow all" ON settings;
DROP POLICY IF EXISTS "allow authenticated" ON settings;
DROP POLICY IF EXISTS "Allow all" ON suppliers;

-- jobs: direct business_id scope
CREATE POLICY "business_jobs" ON jobs FOR ALL TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- job_items: scoped via parent job's business_id
CREATE POLICY "business_job_items" ON job_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_items.job_id AND j.business_id = get_my_business_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = job_items.job_id AND j.business_id = get_my_business_id()
  ));

-- job_item_parts: scoped via item -> job -> business_id
CREATE POLICY "business_job_item_parts" ON job_item_parts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM job_items ji
    JOIN jobs j ON j.id = ji.job_id
    WHERE ji.id = job_item_parts.job_item_id AND j.business_id = get_my_business_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM job_items ji
    JOIN jobs j ON j.id = ji.job_id
    WHERE ji.id = job_item_parts.job_item_id AND j.business_id = get_my_business_id()
  ));

-- parts: direct business_id scope
CREATE POLICY "business_parts" ON parts FOR ALL TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- callout_zones: direct business_id scope
CREATE POLICY "business_callout_zones" ON callout_zones FOR ALL TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- suppliers: direct business_id scope
CREATE POLICY "business_suppliers" ON suppliers FOR ALL TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- settings: keep anon read for public API routes (/api/quotes, /api/done)
-- that show customer-facing pages without requiring auth.
CREATE POLICY "anon_read_settings" ON settings FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- travel_cache and weather_cache: keep existing permissive policies.
-- These caches are written by server routes using the service_role key,
-- which bypasses RLS entirely. Browser reads are authenticated and permissive.
-- (existing "allow anon" and "allow authenticated" policies remain unchanged)
