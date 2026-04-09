-- Create milestones table for project timeline markers
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_by_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);

-- Enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing helper functions
CREATE POLICY "milestones_select" ON milestones
  FOR SELECT USING (user_has_project_access(project_id));

CREATE POLICY "milestones_insert" ON milestones
  FOR INSERT WITH CHECK (user_has_project_access(project_id));

CREATE POLICY "milestones_update" ON milestones
  FOR UPDATE USING (user_has_project_access(project_id));

CREATE POLICY "milestones_delete" ON milestones
  FOR DELETE USING (user_has_project_access(project_id));

-- Revert SQL (keep in comment for rollback):
-- DROP POLICY IF EXISTS "milestones_select" ON milestones;
-- DROP POLICY IF EXISTS "milestones_insert" ON milestones;
-- DROP POLICY IF EXISTS "milestones_update" ON milestones;
-- DROP POLICY IF EXISTS "milestones_delete" ON milestones;
-- DROP TABLE IF EXISTS milestones;
