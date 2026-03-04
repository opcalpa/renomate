-- Allow unauthenticated users to read an invitation by token.
-- This is needed so customers can view the invitation page before
-- creating an account or logging in.
CREATE POLICY "Anyone can view invitation by token"
ON public.project_invitations
FOR SELECT
TO anon
USING (token IS NOT NULL);
