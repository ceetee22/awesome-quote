-- 15_start_overridden.sql
-- Adds a flag so the planner knows which jobs have been manually pinned on the
-- time axis (and should stay where they are) versus auto-placed by the cascade.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_overridden BOOLEAN NOT NULL DEFAULT false;
