-- job_items.photos and the job-photos storage bucket already exist.
-- This adds after_photos at the job level for completion proof photos.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS after_photos JSONB DEFAULT '[]';
