-- Expand role CHECK to include 'client'
ALTER TABLE public.project_shares
DROP CONSTRAINT IF EXISTS project_shares_role_check;

ALTER TABLE public.project_shares
ADD CONSTRAINT project_shares_role_check
CHECK (role IN ('viewer', 'editor', 'admin', 'client'));

-- Backfill: set role_type for existing client viewers (role_type was not set before)
-- A viewer is a client if they were invited via a client invitation
-- (i.e. their shared project has a matching invitation with role = 'client')
UPDATE public.project_shares ps
SET role = 'client', role_type = 'client'
WHERE ps.role = 'viewer'
  AND (
    ps.role_type = 'client'
    OR EXISTS (
      SELECT 1 FROM public.project_invitations pi
      JOIN public.profiles p ON p.email = pi.email
      WHERE pi.project_id = ps.project_id
        AND p.id = ps.shared_with_user_id
        AND pi.role = 'client'
        AND pi.status = 'accepted'
    )
  );
