-- Time entries for time tracking (tidrapportering)
-- Proffs log hours per task/day. Owners/PMs approve.
-- REVERT: DROP TABLE IF EXISTS time_entries;

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT USING (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "time_entries_insert" ON time_entries
  FOR INSERT WITH CHECK (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE USING (user_owns_project(project_id) OR user_has_project_access(project_id));

CREATE POLICY "time_entries_delete" ON time_entries
  FOR DELETE USING (user_owns_project(project_id));

-- Add time_tracking_access to project_shares
ALTER TABLE project_shares ADD COLUMN IF NOT EXISTS time_tracking_access TEXT DEFAULT 'none';

-- Set sensible defaults for existing role templates
UPDATE project_shares SET time_tracking_access = 'edit'
  WHERE role_type IN ('contractor', 'project_manager', 'co_owner') AND time_tracking_access = 'none';
UPDATE project_shares SET time_tracking_access = 'view'
  WHERE role_type IN ('client', 'collaborator') AND time_tracking_access = 'none';
