-- Fix: Project owners were blocked from uploading cover images due to
-- conflicting or missing INSERT policies on storage.objects.
--
-- The function user_can_manage_project_files checks owner_id correctly,
-- but the old ad-hoc script (create_comment_images_storage.sql) may have
-- created policies with different names that were never properly dropped.
--
-- Solution: Drop all known INSERT policy variants and recreate a clean one.

-- Drop all known INSERT policy names for project-files bucket
DROP POLICY IF EXISTS "Users can upload files to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;

-- Recreate clean INSERT policy
CREATE POLICY "Project members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND public.user_can_manage_project_files(name)
);
