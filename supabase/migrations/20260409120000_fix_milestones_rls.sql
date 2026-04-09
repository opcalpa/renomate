-- Fix milestones RLS — use simpler policy that matches working patterns
-- Drop existing policies
DROP POLICY IF EXISTS "milestones_select" ON milestones;
DROP POLICY IF EXISTS "milestones_insert" ON milestones;
DROP POLICY IF EXISTS "milestones_update" ON milestones;
DROP POLICY IF EXISTS "milestones_delete" ON milestones;

-- Recreate with explicit project access check (owner or shared)
CREATE POLICY "milestones_select" ON milestones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM project_shares WHERE project_shares.project_id = milestones.project_id AND project_shares.shared_with_user_id = get_user_profile_id()
  )
);

CREATE POLICY "milestones_insert" ON milestones FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM project_shares WHERE project_shares.project_id = milestones.project_id AND project_shares.shared_with_user_id = get_user_profile_id()
  )
);

CREATE POLICY "milestones_update" ON milestones FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM project_shares WHERE project_shares.project_id = milestones.project_id AND project_shares.shared_with_user_id = get_user_profile_id()
  )
);

CREATE POLICY "milestones_delete" ON milestones FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM project_shares WHERE project_shares.project_id = milestones.project_id AND project_shares.shared_with_user_id = get_user_profile_id()
  )
);
