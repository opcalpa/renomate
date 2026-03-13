-- Direct messages between project team members
-- Revert: DROP TABLE IF EXISTS direct_messages;

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  images JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dm_project ON direct_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_dm_from_user ON direct_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_to_user ON direct_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(project_id, from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(to_user_id, is_read) WHERE is_read = false;

-- RLS: only sender and recipient can access
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own DMs"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    from_user_id = get_user_profile_id()
    OR to_user_id = get_user_profile_id()
  );

CREATE POLICY "Users can send DMs in their projects"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = get_user_profile_id()
    AND user_has_project_access(project_id)
  );

CREATE POLICY "Recipients can mark DMs as read"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (to_user_id = get_user_profile_id())
  WITH CHECK (to_user_id = get_user_profile_id());

CREATE POLICY "Senders can delete own DMs"
  ON direct_messages FOR DELETE
  TO authenticated
  USING (from_user_id = get_user_profile_id());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_dm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_updated_at
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_updated_at();
