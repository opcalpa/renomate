-- Allow project managers (teams_access='invite') to update project_shares
-- They can change roles but NOT grant teams_access='invite' (no privilege escalation)

CREATE OR REPLACE FUNCTION public.user_can_manage_team(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    -- Project owner can always manage
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = public.get_user_profile_id()
  ) OR EXISTS (
    -- Project members with invite permission can manage
    SELECT 1 FROM public.project_shares
    WHERE project_id = project_uuid
    AND shared_with_user_id = public.get_user_profile_id()
    AND teams_access = 'invite'
  );
$$;

-- Allow team managers to update shares (role changes)
CREATE POLICY "Team managers can update shares"
ON public.project_shares
FOR UPDATE
TO authenticated
USING (
  public.user_can_manage_team(project_id)
)
WITH CHECK (
  public.user_can_manage_team(project_id)
  -- Prevent privilege escalation: only owners can grant invite access
  AND (
    teams_access IS DISTINCT FROM 'invite'
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE owner_id = public.get_user_profile_id()
    )
  )
);
