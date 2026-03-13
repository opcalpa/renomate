-- Create user_feedback table to persist feedback/bug reports for analysis
-- Revert: DROP TABLE IF EXISTS user_feedback;

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('bug', 'suggestion', 'other')),
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'wont_fix')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by status and type
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

-- RLS: anyone authenticated can insert their own feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (is_system_admin());

-- Only admins can update feedback (status, admin_notes)
CREATE POLICY "Admins can update feedback"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (is_system_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feedback_updated_at();
