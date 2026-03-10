-- Allow clients (planning contributors / invited homeowners) to INSERT, UPDATE, DELETE rooms.
-- Previously only 'editor' and 'admin' roles could manage rooms.
-- Planning contributors have role='client' but need to create/edit rooms.

DROP POLICY IF EXISTS "Users can manage rooms in accessible projects" ON public.rooms;

CREATE POLICY "Users can manage rooms in accessible projects" ON public.rooms
FOR ALL USING (
  is_system_admin()
  OR project_id IN (
    SELECT id FROM public.projects WHERE
      owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR id IN (
        SELECT project_id FROM public.project_shares
        WHERE shared_with_user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
          AND role IN ('editor', 'admin', 'client')
      )
  )
);
