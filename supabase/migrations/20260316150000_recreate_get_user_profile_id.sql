-- Recreate get_user_profile_id function if it was dropped
-- This is a critical helper used by RLS policies across the database
-- Revert: (function is safe to keep)

CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;
