-- 07_scheduling.sql
-- Phase 1 planner: scheduling columns on jobs and settings.
-- Run once in the Supabase SQL editor.

-- ─── jobs: new scheduling columns ───────────────────────────────────────────

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS schedule_state   TEXT        NOT NULL DEFAULT 'unassigned';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS slot             TEXT;          -- 'morning' | 'afternoon'
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration NUMERIC    NOT NULL DEFAULT 1;  -- hours
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sequence_index   INT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_minute     INT;

-- ─── settings: planner settings ─────────────────────────────────────────────

ALTER TABLE settings ADD COLUMN IF NOT EXISTS day_start_minute       INT  NOT NULL DEFAULT 480;   -- 8:00am
ALTER TABLE settings ADD COLUMN IF NOT EXISTS day_end_target_minute  INT;                          -- NULL = no target
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_buffer_minutes INT  NOT NULL DEFAULT 10;

-- ─── Backfill accepted_at ────────────────────────────────────────────────────
-- Use created_at as the best available proxy for when the job was accepted.
-- Real accepted_at will be set going forward by the API.

UPDATE jobs
SET accepted_at = created_at
WHERE status = 'accepted'
  AND accepted_at IS NULL;

-- ─── Backfill schedule_state ─────────────────────────────────────────────────
-- Accepted jobs with a scheduled_date already assigned → 'assigned'.
-- Everything else defaults to 'unassigned' (already set by column default,
-- this just catches any NULLs if the column was added without a default).

UPDATE jobs
SET schedule_state = 'assigned'
WHERE status = 'accepted'
  AND scheduled_date IS NOT NULL
  AND schedule_state = 'unassigned';
