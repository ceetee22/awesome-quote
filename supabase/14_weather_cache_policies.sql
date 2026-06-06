-- 14_weather_cache_policies.sql
-- RLS policies for weather_cache (table was created in an earlier migration
-- but policies were not added at that time).

CREATE POLICY "allow anon"          ON weather_cache FOR ALL TO anon          USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON weather_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
