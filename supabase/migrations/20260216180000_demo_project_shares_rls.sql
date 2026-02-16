-- Allow viewing project_shares for public demo project
-- This enables the Team page to display team members for the demo

-- Add policy for viewing project_shares in public demo
DROP POLICY IF EXISTS "Anyone can view public demo project shares" ON public.project_shares;
CREATE POLICY "Anyone can view public demo project shares" ON public.project_shares
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- Also add policy to view profiles linked to public demo shares
-- This is needed for the JOIN to profiles in TeamManagement.tsx
DROP POLICY IF EXISTS "Anyone can view public demo team profiles" ON public.profiles;
CREATE POLICY "Anyone can view public demo team profiles" ON public.profiles
FOR SELECT USING (
  id IN (
    SELECT shared_with_user_id
    FROM public.project_shares
    WHERE is_public_demo_project(project_id)
  )
);
