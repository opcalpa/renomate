-- Fix profiles RLS causing 500 errors due to circular RLS recursion:
-- profiles policy → queries projects → projects RLS → queries profiles → loop
--
-- Solution: SECURITY DEFINER function that bypasses RLS to compute visible profile IDs

BEGIN;

-- Helper function: returns all profile IDs the current user should see
-- SECURITY DEFINER bypasses RLS on projects and project_shares
CREATE OR REPLACE FUNCTION public.get_visible_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Own profile
  SELECT id FROM profiles WHERE user_id = auth.uid()

  UNION

  -- People in projects I own
  SELECT ps.shared_with_user_id
  FROM project_shares ps
  JOIN projects p ON p.id = ps.project_id
  WHERE p.owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())

  UNION

  -- Owners of projects I'm shared on
  SELECT p.owner_id
  FROM projects p
  JOIN project_shares ps ON ps.project_id = p.id
  WHERE ps.shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())

  UNION

  -- Co-members in shared projects
  SELECT ps2.shared_with_user_id
  FROM project_shares ps2
  WHERE ps2.project_id IN (
    SELECT ps.project_id FROM project_shares ps
    WHERE ps.shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
$$;

-- Replace the broken policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

CREATE POLICY "Users can view relevant profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Direct auth check (no function call needed for own profile)
    user_id = auth.uid()
    -- Profiles visible through project membership
    OR id IN (SELECT get_visible_profile_ids())
    -- System admins see all
    OR is_system_admin()
  );

COMMIT;
