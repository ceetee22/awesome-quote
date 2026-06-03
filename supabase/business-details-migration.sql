ALTER TABLE settings ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Payment due on completion of work.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
