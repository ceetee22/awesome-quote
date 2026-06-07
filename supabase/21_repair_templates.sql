-- ─── Repair templates (per-business, one per joinery_type+fault combo) ───────

CREATE TABLE repair_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  joinery_type TEXT NOT NULL,
  fault TEXT NOT NULL,
  labour_minutes INTEGER NOT NULL DEFAULT 0,
  parts JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, joinery_type, fault)
);

ALTER TABLE repair_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repair_templates_own"
  ON repair_templates FOR ALL TO authenticated
  USING (business_id = get_my_business_id())
  WITH CHECK (business_id = get_my_business_id());

-- ─── Job rooms (per-job, cascades on job delete) ──────────────────────────────

CREATE TABLE job_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE job_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_rooms_own"
  ON job_rooms FOR ALL TO authenticated
  USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_my_business_id())
  )
  WITH CHECK (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_my_business_id())
  );

-- ─── Add room_id to job_items ─────────────────────────────────────────────────

ALTER TABLE job_items
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES job_rooms(id) ON DELETE SET NULL;
