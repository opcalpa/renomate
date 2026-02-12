-- Migration: Customer Intake Requests
-- Description: Adds support for customer intake forms that lead to quotes
-- Created: 2026-02-11

-- =============================================================================
-- 1. CREATE ENUM FOR WORK TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE work_type AS ENUM (
    'rivning',
    'el',
    'vvs',
    'kakel',
    'snickeri',
    'malning',
    'golv',
    'kok',
    'badrum',
    'fonster_dorrar',
    'fasad',
    'tak',
    'tradgard',
    'annat'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. CREATE CUSTOMER INTAKE REQUESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_intake_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to builder (creator)
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Unique token for public access (using UUID without dashes as secure random token)
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || substring(replace(gen_random_uuid()::text, '-', ''), 1, 16),

  -- Status workflow: pending -> submitted -> converted/expired/cancelled
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'converted', 'expired', 'cancelled')),

  -- Customer information (filled by customer)
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,

  -- Property information (filled by customer)
  property_address TEXT,
  property_postal_code TEXT,
  property_city TEXT,
  property_type TEXT CHECK (property_type IN ('villa', 'lagenhet', 'radhus', 'fritidshus', 'annat') OR property_type IS NULL),

  -- Overall project info
  project_description TEXT,
  desired_start_date DATE,

  -- Images (URLs to uploaded images)
  images JSONB DEFAULT '[]'::jsonb,

  -- Room data (filled via wizard)
  -- Format: [{
  --   "id": "uuid",
  --   "name": "Kök",
  --   "description": "Vill ha nytt kök...",
  --   "work_types": ["rivning", "el", "vvs"],
  --   "priority": "high" | "medium" | "low",
  --   "images": ["url1", "url2"]
  -- }]
  rooms_data JSONB DEFAULT '[]'::jsonb,

  -- Reference to created project (filled on conversion)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Reference to created client record
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Metadata
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. CREATE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_intake_creator_id ON customer_intake_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_intake_token ON customer_intake_requests(token);
CREATE INDEX IF NOT EXISTS idx_intake_status ON customer_intake_requests(status);
CREATE INDEX IF NOT EXISTS idx_intake_project_id ON customer_intake_requests(project_id);

-- =============================================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- =============================================================================

-- Reuse existing function if available, otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_intake_updated_at ON customer_intake_requests;
CREATE TRIGGER update_intake_updated_at
  BEFORE UPDATE ON customer_intake_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. ADD INTAKE_REQUEST_ID TO QUOTES TABLE
-- =============================================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS intake_request_id UUID REFERENCES customer_intake_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_intake_request_id ON quotes(intake_request_id);

-- =============================================================================
-- 6. ADD PROJECT LOCKING FIELDS
-- =============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS locked_for_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- =============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE customer_intake_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can manage their own intake requests
DROP POLICY IF EXISTS "Creators can manage own intake requests" ON customer_intake_requests;
CREATE POLICY "Creators can manage own intake requests"
  ON customer_intake_requests
  FOR ALL
  USING (creator_id = get_user_profile_id())
  WITH CHECK (creator_id = get_user_profile_id());

-- Policy: Anyone can view by token (for public form access)
-- Note: Token validation happens in application layer
DROP POLICY IF EXISTS "Public can view by token" ON customer_intake_requests;
CREATE POLICY "Public can view by token"
  ON customer_intake_requests
  FOR SELECT
  USING (true);

-- Policy: Anyone can update pending requests (for form submission)
DROP POLICY IF EXISTS "Public can submit intake requests" ON customer_intake_requests;
CREATE POLICY "Public can submit intake requests"
  ON customer_intake_requests
  FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (status IN ('pending', 'submitted'));

-- =============================================================================
-- 8. HELPER FUNCTION: GET INTAKE BY TOKEN
-- =============================================================================

CREATE OR REPLACE FUNCTION get_intake_request_by_token(p_token TEXT)
RETURNS customer_intake_requests AS $$
DECLARE
  v_request customer_intake_requests;
BEGIN
  SELECT * INTO v_request
  FROM customer_intake_requests
  WHERE token = p_token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN v_request;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE customer_intake_requests IS 'Stores customer renovation requests before they become quotes/projects';
COMMENT ON COLUMN customer_intake_requests.token IS 'Unique token for public form access (48 hex chars)';
COMMENT ON COLUMN customer_intake_requests.status IS 'Workflow: pending (awaiting customer) -> submitted (customer filled) -> converted/expired/cancelled';
COMMENT ON COLUMN customer_intake_requests.rooms_data IS 'JSON array of room objects with name, description, work_types, priority, and images';
COMMENT ON COLUMN customer_intake_requests.expires_at IS 'Auto-set to 30 days from creation';

COMMENT ON COLUMN quotes.intake_request_id IS 'Reference to the intake request this quote was created from';
COMMENT ON COLUMN projects.locked_for_quote IS 'When true, project cannot be edited (quote has been sent)';
COMMENT ON COLUMN projects.locked_by_quote_id IS 'The quote that caused the project to be locked';
