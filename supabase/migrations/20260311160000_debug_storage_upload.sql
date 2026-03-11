-- DEBUG: Ultra-simple policy to isolate whether it's RLS or something else.
-- Any authenticated user can upload to project-files bucket.
-- TODO: Remove after debugging.
CREATE POLICY "temp_debug_allow_all_uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');
