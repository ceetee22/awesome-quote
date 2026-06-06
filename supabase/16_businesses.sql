-- 16_businesses.sql
-- Creates the businesses table for multi-tenancy.
-- Absorbs all settings columns + adds owner_id for per-user auth scoping.
-- Seeds from the existing settings row.

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Identity
  name TEXT NOT NULL DEFAULT 'Awesome Joinery',
  trading_name TEXT NOT NULL DEFAULT '',
  legal_company_name TEXT NOT NULL DEFAULT '',
  business_tagline TEXT NOT NULL DEFAULT '',
  contact_person_name TEXT NOT NULL DEFAULT '',
  -- Contact
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  -- Location
  home_base_address TEXT NOT NULL DEFAULT '',
  home_base_lat DOUBLE PRECISION,
  home_base_lng DOUBLE PRECISION,
  -- Pricing
  hourly_labour_rate NUMERIC NOT NULL DEFAULT 85,
  default_markup_pct NUMERIC NOT NULL DEFAULT 30,
  gst_rate NUMERIC NOT NULL DEFAULT 15,
  gst_number TEXT NOT NULL DEFAULT '',
  -- Banking / invoicing
  bank_account_name TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account_number TEXT NOT NULL DEFAULT '',
  payment_terms TEXT NOT NULL DEFAULT 'Payment due on completion of work.',
  terms_and_conditions TEXT NOT NULL DEFAULT '',
  -- Supplier
  supplier_name TEXT NOT NULL DEFAULT 'Joinery Hardware NZ',
  supplier_email TEXT NOT NULL DEFAULT '',
  -- Estimator
  rubber_waste_pct NUMERIC NOT NULL DEFAULT 10,
  window_size_bands JSONB NOT NULL DEFAULT '[]',
  -- Planner
  day_start_minute INT NOT NULL DEFAULT 480,
  day_end_target_minute INT,
  default_buffer_minutes INT NOT NULL DEFAULT 10,
  working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  return_home_at_end BOOLEAN NOT NULL DEFAULT false,
  preferred_nav_app TEXT NOT NULL DEFAULT 'google_maps',
  -- SaaS metadata
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_business" ON businesses FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "update_own_business" ON businesses FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "insert_own_business" ON businesses FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Helper: returns the current authenticated user's business id
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS UUID AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Seed from existing settings row, claim by the primary user
INSERT INTO businesses (
  owner_id, name, trading_name, legal_company_name, business_tagline, contact_person_name,
  contact_email, contact_phone, logo_url,
  home_base_address, home_base_lat, home_base_lng,
  hourly_labour_rate, default_markup_pct, gst_rate, gst_number,
  bank_account_name, bank_name, bank_account_number,
  payment_terms, terms_and_conditions,
  supplier_name, supplier_email,
  rubber_waste_pct, window_size_bands,
  day_start_minute, day_end_target_minute, default_buffer_minutes,
  working_days, return_home_at_end, preferred_nav_app
)
SELECT
  'dea381a2-d163-42c8-87d4-390ef9476493'::uuid,
  business_name,
  COALESCE(trading_name, ''),
  COALESCE(legal_company_name, ''),
  COALESCE(business_tagline, ''),
  COALESCE(contact_person_name, ''),
  COALESCE(business_email, ''),
  COALESCE(business_phone, ''),
  logo_url,
  COALESCE(home_base_address, ''),
  home_base_lat,
  home_base_lng,
  COALESCE(hourly_labour_rate, 85),
  COALESCE(default_markup_pct, 30),
  COALESCE(gst_rate, 15),
  COALESCE(gst_number, ''),
  COALESCE(bank_account_name, ''),
  COALESCE(bank_name, ''),
  COALESCE(bank_account_number, ''),
  COALESCE(payment_terms, 'Payment due on completion of work.'),
  COALESCE(terms_and_conditions, ''),
  COALESCE(supplier_name, 'Joinery Hardware NZ'),
  COALESCE(supplier_email, ''),
  COALESCE(rubber_waste_pct, 10),
  COALESCE(window_size_bands, '[]'::jsonb),
  COALESCE(day_start_minute, 480),
  day_end_target_minute,
  COALESCE(default_buffer_minutes, 10),
  COALESCE(working_days, '{1,2,3,4,5}'),
  COALESCE(return_home_at_end, false),
  COALESCE(preferred_nav_app, 'google_maps')
FROM settings
WHERE id = 1;
