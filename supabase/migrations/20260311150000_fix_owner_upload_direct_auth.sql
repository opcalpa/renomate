-- Previous policies using get_user_profile_id() failed inside storage context.
-- Use auth.uid() directly with a JOIN to avoid SECURITY DEFINER issues.

DROP POLICY IF EXISTS "Project owners can upload files directly" ON storage.objects;

CREATE POLICY "Project owners can upload files directly"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND (storage.foldername(storage.objects.name))[1] = 'projects'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON pr.id = p.owner_id
    WHERE p.id = (storage.foldername(storage.objects.name))[2]::uuid
    AND pr.user_id = auth.uid()
  )
);
