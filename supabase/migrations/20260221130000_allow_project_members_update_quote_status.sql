-- Allow project members (e.g. invited customers) to update quotes
-- This is needed so customers can accept/reject quotes and mark them as viewed
CREATE POLICY "Project members can update quotes"
ON quotes FOR UPDATE TO authenticated
USING (user_has_project_access(project_id))
WITH CHECK (user_has_project_access(project_id));
