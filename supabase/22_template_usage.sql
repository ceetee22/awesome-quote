-- ─── Template usage tracking ─────────────────────────────────────────────────

ALTER TABLE repair_templates
  ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
