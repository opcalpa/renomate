-- ÄTA approval tokens — token-based approval without login (like worker_access_tokens)
-- Builder creates ÄTA task → sends approval link → customer approves/rejects via link
-- REVERT: DROP TABLE IF EXISTS ata_approval_tokens; ALTER TABLE tasks DROP COLUMN IF EXISTS ata_status;

-- Add ÄTA approval status to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ata_status TEXT DEFAULT NULL;
-- Values: NULL (not ÄTA or no approval needed), 'pending', 'approved', 'rejected'

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ata_approved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ata_approved_by_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ata_rejection_reason TEXT;

-- Token table for approval links
CREATE TABLE IF NOT EXISTS ata_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  response TEXT -- 'approved' or 'rejected'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ata_tokens_task ON ata_approval_tokens(task_id);
CREATE INDEX IF NOT EXISTS idx_ata_tokens_token ON ata_approval_tokens(token);

-- RLS — tokens readable by project members, insert by project owners/editors
ALTER TABLE ata_approval_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ata_tokens_select" ON ata_approval_tokens
  FOR SELECT USING (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "ata_tokens_insert" ON ata_approval_tokens
  FOR INSERT WITH CHECK (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "ata_tokens_update" ON ata_approval_tokens
  FOR UPDATE USING (user_owns_project(project_id) OR user_has_project_access(project_id));

-- Public read for token validation (anon can read by token to approve)
CREATE POLICY "ata_tokens_anon_select" ON ata_approval_tokens
  FOR SELECT TO anon USING (true);

-- Public update for approval response (anon can set response)
CREATE POLICY "ata_tokens_anon_update" ON ata_approval_tokens
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Also allow anon to update tasks.ata_status (for approval page)
CREATE POLICY "tasks_anon_ata_update" ON tasks
  FOR UPDATE TO anon USING (
    EXISTS (SELECT 1 FROM ata_approval_tokens WHERE task_id = tasks.id AND used_at IS NULL AND expires_at > now())
  ) WITH CHECK (true);
