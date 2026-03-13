-- Fix DM INSERT policy: allow project owners (not just shared members) to send DMs
-- Revert: DROP POLICY IF EXISTS "Users can send DMs in their projects" ON direct_messages;
--         CREATE POLICY "Users can send DMs in their projects" ON direct_messages FOR INSERT TO authenticated WITH CHECK (from_user_id = get_user_profile_id() AND user_has_project_access(project_id));

DROP POLICY IF EXISTS "Users can send DMs in their projects" ON direct_messages;

CREATE POLICY "Users can send DMs in their projects"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = get_user_profile_id()
    AND (user_has_project_access(project_id) OR user_owns_project(project_id))
  );

-- Also fix SELECT policy so owner can read DMs
DROP POLICY IF EXISTS "Users can read own DMs" ON direct_messages;

CREATE POLICY "Users can read own DMs"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    from_user_id = get_user_profile_id()
    OR to_user_id = get_user_profile_id()
  );
