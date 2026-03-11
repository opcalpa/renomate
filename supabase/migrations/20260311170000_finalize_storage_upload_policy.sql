-- Finalize storage upload policy: the function-based policy failed in
-- storage context. Replace with simple inline check using auth.uid().
-- Remove debug policy and redundant function-based policies.

DROP POLICY IF EXISTS "temp_debug_allow_all_uploads" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project owners can upload files directly" ON storage.objects;

-- Single clean INSERT policy for project-files bucket
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.uid() IS NOT NULL
  AND (
    -- Owner: projects/{project_id}/...
    (
      (storage.foldername(storage.objects.name))[1] = 'projects'
      AND EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.profiles pr ON pr.id = p.owner_id
        WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
        AND pr.user_id = auth.uid()
      )
    )
    OR
    -- Member with edit access: projects/{project_id}/...
    (
      (storage.foldername(storage.objects.name))[1] = 'projects'
      AND EXISTS (
        SELECT 1 FROM public.project_shares ps
        JOIN public.profiles pr ON pr.id = ps.shared_with_user_id
        WHERE ps.project_id = (storage.foldername(storage.objects.name))[2]::uuid
        AND pr.user_id = auth.uid()
        AND ps.files_access = 'edit'
      )
    )
    OR
    -- Task/material/room photos: {type}-photos/{entity_id}/...
    (
      (storage.foldername(storage.objects.name))[1] IN ('task-photos', 'material-photos', 'room-photos')
      AND auth.uid() IS NOT NULL
    )
  )
);
