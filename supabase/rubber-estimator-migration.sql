ALTER TABLE settings ADD COLUMN IF NOT EXISTS rubber_waste_pct NUMERIC DEFAULT 10;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS window_size_bands JSONB DEFAULT '[{"name":"Small","perimeter_m":3.0,"labour_min":15},{"name":"Medium","perimeter_m":4.4,"labour_min":20},{"name":"Large","perimeter_m":5.4,"labour_min":30},{"name":"Extra large","perimeter_m":7.0,"labour_min":40}]';
