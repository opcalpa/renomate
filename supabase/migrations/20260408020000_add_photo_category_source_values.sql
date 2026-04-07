-- Document the photo source convention for worker uploads
-- No schema change needed — source is already a text field
-- New values: 'worker_progress', 'worker_completed'
-- Existing values: 'upload', 'pinterest', 'camera', etc.

-- Add a comment for documentation
COMMENT ON COLUMN photos.source IS 'Photo source/category. Values: upload, pinterest, camera, worker_progress, worker_completed';
