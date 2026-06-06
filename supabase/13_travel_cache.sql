-- 13_travel_cache.sql
-- Caches OSRM driving times between coordinate pairs so each origin→dest
-- pair is only fetched from the public OSRM server once ever.
-- origin_key / dest_key are "lat4,lng4" strings (4 decimal places ≈ 11 m).

CREATE TABLE IF NOT EXISTS travel_cache (
  origin_key  TEXT         NOT NULL,
  dest_key    TEXT         NOT NULL,
  minutes     INTEGER      NOT NULL,
  fetched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (origin_key, dest_key)
);

ALTER TABLE travel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow anon"          ON travel_cache FOR ALL TO anon          USING (true) WITH CHECK (true);
CREATE POLICY "allow authenticated" ON travel_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
