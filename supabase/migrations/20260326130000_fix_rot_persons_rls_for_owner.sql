-- Fix: project_rot_persons RLS must also allow project owners (who don't have a share)
-- Revert: DROP POLICY IF EXISTS "Project members can read ROT persons" ON project_rot_persons;
--         DROP POLICY IF EXISTS "Project members can manage ROT persons" ON project_rot_persons;
--         CREATE POLICY "Project members can read ROT persons" ON project_rot_persons FOR SELECT TO authenticated USING (user_has_project_access(project_id));
--         CREATE POLICY "Project members can manage ROT persons" ON project_rot_persons FOR ALL TO authenticated USING (user_has_project_access(project_id)) WITH CHECK (user_has_project_access(project_id));

DROP POLICY IF EXISTS "Project members can read ROT persons" ON project_rot_persons;
DROP POLICY IF EXISTS "Project members can manage ROT persons" ON project_rot_persons;

CREATE POLICY "Project members can read ROT persons"
  ON project_rot_persons FOR SELECT
  TO authenticated
  USING (user_has_project_access(project_id) OR user_owns_project(project_id));

CREATE POLICY "Project members can manage ROT persons"
  ON project_rot_persons FOR ALL
  TO authenticated
  USING (user_has_project_access(project_id) OR user_owns_project(project_id))
  WITH CHECK (user_has_project_access(project_id) OR user_owns_project(project_id));
