-- v0.22.0: per-item after photos + photo purge tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photos_purged BOOLEAN NOT NULL DEFAULT false;

-- Back-fill completed_at for already-completed jobs
UPDATE jobs
SET completed_at = updated_at
WHERE status IN ('completed', 'invoiced')
  AND completed_at IS NULL
  AND updated_at IS NOT NULL;
