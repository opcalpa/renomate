-- Fix: Canvas image uploads fail for project members with files_access = 'view'
--
-- The current INSERT policy only allows uploads for project owners and members
-- with files_access = 'edit'. Canvas background images should be uploadable by
-- ANY authenticated project member (owner or any share), since the canvas is a
-- shared workspace.
--
-- Revert:
--   DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
--   (then recreate previous version using user_can_manage_project_files)

DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;

CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND (
    -- Project owner can always upload
    (
      (storage.foldername(objects.name))[1] = 'projects'
      AND EXISTS (
        SELECT 1 FROM projects p
        JOIN profiles pr ON pr.id = p.owner_id
        WHERE p.id = (storage.foldername(objects.name))[2]::uuid
        AND pr.user_id = auth.uid()
      )
    )
    OR
    -- Any project member (view or edit) can upload
    (
      (storage.foldername(objects.name))[1] = 'projects'
      AND EXISTS (
        SELECT 1 FROM project_shares ps
        JOIN profiles pr ON pr.id = ps.shared_with_user_id
        WHERE ps.project_id = (storage.foldername(objects.name))[2]::uuid
        AND pr.user_id = auth.uid()
        AND ps.files_access IN ('view', 'edit')
      )
    )
    OR
    -- task/material/room photos
    (
      (storage.foldername(objects.name))[1] = ANY (
        ARRAY['task-photos', 'material-photos', 'room-photos']
      )
      AND auth.uid() IS NOT NULL
    )
  )
);
