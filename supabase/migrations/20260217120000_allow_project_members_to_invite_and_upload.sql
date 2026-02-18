-- Allow project members (via project_shares) to invite others and upload files
-- This extends the existing owner-only policies to also include invited members

-- ============================================================
-- 1. PROJECT_INVITATIONS - Allow members with teams_access='invite' to create invitations
-- ============================================================

-- Helper function to check if user can invite to project
CREATE OR REPLACE FUNCTION public.user_can_invite_to_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    -- Project owner can always invite
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND owner_id = get_user_profile_id()
  ) OR EXISTS (
    -- Project members with invite permission can invite
    SELECT 1 FROM public.project_shares
    WHERE project_id = project_uuid
    AND shared_with_user_id = get_user_profile_id()
    AND teams_access = 'invite'
  );
$$;

-- Drop and recreate the INSERT policy for project_invitations
DROP POLICY IF EXISTS "Project owners can create invitations" ON public.project_invitations;
CREATE POLICY "Users with invite access can create invitations"
ON public.project_invitations
FOR INSERT
WITH CHECK (
  user_can_invite_to_project(project_id)
);

-- Also allow members with invite access to view invitations
DROP POLICY IF EXISTS "Project owners can view invitations" ON public.project_invitations;
CREATE POLICY "Users with invite access can view invitations"
ON public.project_invitations
FOR SELECT
USING (
  user_can_invite_to_project(project_id)
);

-- Also allow members with invite access to delete invitations
DROP POLICY IF EXISTS "Project owners can delete invitations" ON public.project_invitations;
CREATE POLICY "Users with invite access can delete invitations"
ON public.project_invitations
FOR DELETE
USING (
  user_can_invite_to_project(project_id)
);

-- ============================================================
-- 2. STORAGE - Allow members with files_access='edit' to upload/manage files
-- ============================================================

-- Helper function to check if user can manage files for a project
-- Extracts project_id from storage path: projects/{project_id}/...
CREATE OR REPLACE FUNCTION public.user_can_manage_project_files(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_path_parts TEXT[];
BEGIN
  -- Extract project ID from path: projects/{project_id}/...
  v_path_parts := string_to_array(file_path, '/');

  -- Path should be at least: projects/{uuid}/filename
  IF array_length(v_path_parts, 1) < 3 OR v_path_parts[1] != 'projects' THEN
    RETURN FALSE;
  END IF;

  -- Try to cast the second part to UUID
  BEGIN
    v_project_id := v_path_parts[2]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Check if user is owner or has files_access = 'edit'
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = v_project_id AND owner_id = get_user_profile_id()
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = v_project_id
    AND shared_with_user_id = get_user_profile_id()
    AND files_access = 'edit'
  );
END;
$$;

-- Helper function to check if user can view files for a project
CREATE OR REPLACE FUNCTION public.user_can_view_project_files(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_path_parts TEXT[];
BEGIN
  -- Extract project ID from path: projects/{project_id}/...
  v_path_parts := string_to_array(file_path, '/');

  IF array_length(v_path_parts, 1) < 3 OR v_path_parts[1] != 'projects' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_project_id := v_path_parts[2]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Check if user is owner, has any files access, or it's a public demo project
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = v_project_id AND (
      owner_id = get_user_profile_id()
      OR project_type = 'public_demo'
    )
  ) OR EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = v_project_id
    AND shared_with_user_id = get_user_profile_id()
    AND files_access IN ('view', 'edit')
  );
END;
$$;

-- Drop existing storage policies for project-files bucket (if any)
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can delete files" ON storage.objects;

-- Create new policies for project-files bucket
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND user_can_manage_project_files(name)
);

CREATE POLICY "Project members can view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files'
  AND user_can_view_project_files(name)
);

-- Also allow anonymous users to view files in public demo projects
CREATE POLICY "Anyone can view public demo files"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'project-files'
  AND name LIKE 'projects/00000000-0000-0000-0000-000000000001/%'
);

CREATE POLICY "Project members can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND user_can_manage_project_files(name)
)
WITH CHECK (
  bucket_id = 'project-files'
  AND user_can_manage_project_files(name)
);

CREATE POLICY "Project members can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND user_can_manage_project_files(name)
);

-- Comments for the new functions
COMMENT ON FUNCTION user_can_invite_to_project IS 'Returns true if user is project owner or has teams_access=invite';
COMMENT ON FUNCTION user_can_manage_project_files IS 'Returns true if user is project owner or has files_access=edit';
COMMENT ON FUNCTION user_can_view_project_files IS 'Returns true if user can view project files (owner, member with view/edit, or public demo)';
