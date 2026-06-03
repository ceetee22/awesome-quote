-- Feature 1: Quote revision tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revision_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS previous_total NUMERIC;

-- Feature 2: Reschedule tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;

-- Feature 3: Payment tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
