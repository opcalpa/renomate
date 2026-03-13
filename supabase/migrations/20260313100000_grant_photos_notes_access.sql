-- Fix 404 on photos/notes tables: PostgREST requires GRANT for the role to see the table.
-- RLS policies already handle row-level access control.
-- Revert: REVOKE SELECT, INSERT, UPDATE, DELETE ON public.photos FROM anon, authenticated;
--         REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notes FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon, authenticated;
