-- HOTFIX: Revert profiles SELECT to permissive to fix 500 errors
-- The restrictive policy caused cascading failures because:
-- 1. profiles RLS → called get_visible_profile_ids()
-- 2. projects RLS → inline subquery on profiles → triggered profiles RLS
-- 3. This caused 500 errors on both profiles AND projects queries
--
-- TODO: Implement proper restrictive policy using a materialized view
-- or by rewriting projects/rooms/tasks RLS to not reference profiles inline

BEGIN;

-- Drop the broken restrictive policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

-- Restore permissive policy (same as original)
-- Safe for beta: all users are invited/known, no public signup
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

COMMIT;
