-- Fix: Postgres checks the new row against SELECT policies too during UPDATE.
-- Since our SELECT policy requires deleted_at IS NULL, setting deleted_at blocks the update.
-- Solution: Remove deleted_at filter from SELECT, add a view or handle in application.
-- Instead, we keep the hard DELETE approach but use soft delete only at application level.
--
-- New approach: Revert SELECT to not filter by deleted_at.
-- Instead, add deleted_at filtering in the application queries.
-- The UPDATE WITH CHECK (true) already works for setting deleted_at.

-- Revert SELECT policy to not filter deleted_at
DROP POLICY IF EXISTS "Users can view projects they own or have access to" ON public.projects;
CREATE POLICY "Users can view projects they own or have access to" ON public.projects
FOR SELECT USING (
  is_system_admin()
  OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR id IN (SELECT project_id FROM public.project_shares WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Revert public demo policy too
DROP POLICY IF EXISTS "Anyone can view public demo project" ON public.projects;
CREATE POLICY "Anyone can view public demo project" ON public.projects
FOR SELECT USING (
  project_type = 'public_demo'
);
