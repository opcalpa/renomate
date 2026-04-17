-- Lightweight supplier registry (profile-level, reusable across projects)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, name)
);

-- Index for fast lookup by profile
CREATE INDEX IF NOT EXISTS idx_suppliers_profile_id ON suppliers(profile_id);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own suppliers"
  ON suppliers FOR ALL
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add supplier_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
