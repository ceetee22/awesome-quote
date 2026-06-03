-- Run this in the Supabase SQL editor to create the schema and seed data.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- Settings (single row per business)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name TEXT NOT NULL DEFAULT 'Awesome Building Services',
  business_phone TEXT NOT NULL DEFAULT '',
  business_email TEXT NOT NULL DEFAULT '',
  home_base_address TEXT NOT NULL DEFAULT '',
  hourly_labour_rate NUMERIC NOT NULL DEFAULT 85,
  default_markup_pct NUMERIC NOT NULL DEFAULT 50,
  gst_rate NUMERIC NOT NULL DEFAULT 15,
  supplier_name TEXT NOT NULL DEFAULT 'Joinery Hardware NZ',
  supplier_email TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

-- Callout zones
CREATE TABLE IF NOT EXISTS callout_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_km NUMERIC NOT NULL DEFAULT 0,
  max_km NUMERIC,
  fee NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

-- Parts catalogue
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  supplier TEXT NOT NULL DEFAULT '',
  supplier_code TEXT NOT NULL DEFAULT '',
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  fits TEXT[] NOT NULL DEFAULT '{}',
  fixes TEXT[] NOT NULL DEFAULT '{}',
  default_qty INT NOT NULL DEFAULT 1,
  photo_url TEXT,
  unit TEXT NOT NULL DEFAULT 'each',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_address TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'direct',
  status TEXT NOT NULL DEFAULT 'draft',
  callout_fee NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 85,
  scheduled_date DATE,
  scheduled_time TEXT,
  scheduled_duration NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job items
CREATE TABLE IF NOT EXISTS job_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'custom',
  joinery_type TEXT,
  joinery_type_label TEXT,
  fault TEXT,
  fault_label TEXT,
  description TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  labour_hours NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC NOT NULL DEFAULT 85,
  save_to_catalogue BOOLEAN NOT NULL DEFAULT FALSE,
  fits TEXT[] NOT NULL DEFAULT '{}',
  fixes TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job item parts (line items within a job item)
CREATE TABLE IF NOT EXISTS job_item_parts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  job_item_id TEXT NOT NULL REFERENCES job_items(id) ON DELETE CASCADE,
  part_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  sell_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  supplier TEXT NOT NULL DEFAULT '',
  supplier_code TEXT NOT NULL DEFAULT ''
);

-- Enable RLS on all tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE callout_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_item_parts ENABLE ROW LEVEL SECURITY;

-- Allow all operations via the anon key (single-operator app, no multi-user auth yet)
CREATE POLICY "allow all" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON callout_zones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON parts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON jobs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON job_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON job_item_parts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed: default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Seed: default callout zones
INSERT INTO callout_zones (id, name, min_km, max_km, fee, sort_order) VALUES
  ('local', 'Local', 0, 15, 50, 0),
  ('mid', 'Mid-range', 15, 30, 75, 1),
  ('far', 'Far', 30, NULL, 100, 2)
ON CONFLICT (id) DO NOTHING;

-- Seed: parts catalogue
INSERT INTO parts (id, sku, name, supplier, supplier_code, cost_price, sell_price, category, fits, fixes, default_qty, unit, active) VALUES
  ('part-001','DR-220','Sliding door roller pair','Joinery Hardware NZ','JHN-DR220',18.00,23.40,'rollers',ARRAY['sliding_door'],ARRAY['stiff'],2,'pair',true),
  ('part-002','DR-225','Heavy duty sliding door roller','Joinery Hardware NZ','JHN-DR225',24.50,31.85,'rollers',ARRAY['sliding_door'],ARRAY['stiff'],2,'each',true),
  ('part-003','SL-114','Sliding door latch lock','Joinery Hardware NZ','JHN-SL114',22.00,28.60,'locks',ARRAY['sliding_door'],ARRAY['wont_lock'],1,'each',true),
  ('part-004','SH-300','Sliding door handle set','Joinery Hardware NZ','JHN-SH300',35.00,45.50,'handles',ARRAY['sliding_door'],ARRAY['broken_hardware'],1,'set',true),
  ('part-005','WS-200','Sliding door weatherseal','Joinery Hardware NZ','JHN-WS200',12.00,15.60,'seals',ARRAY['sliding_door'],ARRAY['drafty'],1,'metre',true),
  ('part-006','ST-400','Friction stay 400mm','Joinery Hardware NZ','JHN-ST400',28.00,36.40,'stays',ARRAY['window_ali'],ARRAY['broken_hardware'],1,'each',true),
  ('part-007','ST-300','Friction stay 300mm','Joinery Hardware NZ','JHN-ST300',22.00,28.60,'stays',ARRAY['window_ali','window_timber'],ARRAY['broken_hardware'],1,'each',true),
  ('part-008','WL-210','Aluminium window latch','Joinery Hardware NZ','JHN-WL210',16.50,21.45,'locks',ARRAY['window_ali'],ARRAY['wont_lock'],1,'each',true),
  ('part-009','BH-400','Bifold door hinge pair','Joinery Hardware NZ','JHN-BH400',32.00,41.60,'hinges',ARRAY['bifold_door'],ARRAY['broken_hardware','stiff'],2,'pair',true),
  ('part-010','BG-120','Bifold door guide track','Joinery Hardware NZ','JHN-BG120',28.00,36.40,'rollers',ARRAY['bifold_door'],ARRAY['stiff','misaligned'],1,'each',true),
  ('part-011','HH-500','Hinged door hinge pair','Joinery Hardware NZ','JHN-HH500',18.00,23.40,'hinges',ARRAY['hinged_door'],ARRAY['broken_hardware','stiff'],2,'pair',true),
  ('part-012','HL-310','Door latch and striker plate','Joinery Hardware NZ','JHN-HL310',24.00,31.20,'locks',ARRAY['hinged_door'],ARRAY['wont_lock'],1,'set',true),
  ('part-013','WH-150','Window handle','Joinery Hardware NZ','JHN-WH150',19.50,25.35,'handles',ARRAY['window_ali','window_timber'],ARRAY['broken_hardware'],1,'each',true),
  ('part-014','WS-305','Window weatherseal strip','Joinery Hardware NZ','JHN-WS305',9.50,12.35,'seals',ARRAY['window_ali','window_timber','sliding_door'],ARRAY['drafty'],1,'metre',true),
  ('part-015','BL-220','Bifold door lock set','Joinery Hardware NZ','JHN-BL220',38.00,49.40,'locks',ARRAY['bifold_door'],ARRAY['wont_lock'],1,'set',true)
ON CONFLICT (id) DO NOTHING;
