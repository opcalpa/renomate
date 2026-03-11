-- Add a direct owner upload policy that doesn't depend on user_can_manage_project_files.
-- This fixes cover image uploads for project owners.
-- The function-based policy works for task-photos/material-photos/room-photos paths
-- but the projects/ path was failing despite correct logic — likely a Supabase
-- internal evaluation order issue with SECURITY DEFINER + storage.objects.

-- Simple direct policy: project owners can upload to projects/{their_project_id}/
CREATE POLICY "Project owners can upload files directly"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(name))[1] = 'projects'
  AND (
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM public.projects
      WHERE owner_id = public.get_user_profile_id()
    )
  )
);
