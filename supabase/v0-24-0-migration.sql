-- v0.24.0: add customer_email to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_email TEXT;
