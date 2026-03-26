-- Fix: ROT allocations write policy was too permissive (allowed all project members)
-- Only project owners/co-owners should manage allocations.
-- Revert: DROP POLICY IF EXISTS "Project owners can manage ROT allocations" ON material_rot_allocations;
--         CREATE POLICY "Project owners can manage ROT allocations" ON material_rot_allocations FOR ALL TO authenticated
--         USING (EXISTS (SELECT 1 FROM materials m WHERE m.id = material_id AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))))
--         WITH CHECK (EXISTS (SELECT 1 FROM materials m WHERE m.id = material_id AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))));

DROP POLICY IF EXISTS "Project owners can manage ROT allocations" ON material_rot_allocations;

CREATE POLICY "Project owners can manage ROT allocations"
  ON material_rot_allocations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_id
      AND (user_has_project_access(m.project_id) OR user_owns_project(m.project_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_id
      AND user_owns_project(m.project_id)
    )
  );
