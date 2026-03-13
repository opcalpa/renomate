-- Fix: UPDATE policy rejects soft delete because the updated row (deleted_at IS NOT NULL)
-- no longer passes the SELECT policy. Adding WITH CHECK (true) allows the owner to set
-- deleted_at even though the row will become invisible after the update.
-- REVERT SQL:
--   DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
--   CREATE POLICY "Project owners can update their projects" ON public.projects
--     FOR UPDATE USING (
--       is_system_admin()
--       OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--     );

DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
CREATE POLICY "Project owners can update their projects" ON public.projects
FOR UPDATE
USING (
  is_system_admin()
  OR owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (true);
