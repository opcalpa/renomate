-- Allow an invited user to create their own project_share when accepting an invitation.
-- The user can only insert a row where shared_with_user_id is their own profile id,
-- and a pending invitation exists for their email on that project.
CREATE POLICY "Invited users can create own share"
ON public.project_shares
FOR INSERT
TO authenticated
WITH CHECK (
  shared_with_user_id = public.get_user_profile_id()
  AND EXISTS (
    SELECT 1 FROM public.project_invitations
    WHERE project_invitations.project_id = project_shares.project_id
      AND project_invitations.status = 'pending'
      AND (
        project_invitations.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
        OR project_invitations.invited_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
      )
  )
);
