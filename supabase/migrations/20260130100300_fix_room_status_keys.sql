-- Migrate Swedish room status values to English keys for i18n support
UPDATE rooms SET status = 'existing' WHERE status = 'befintligt';
UPDATE rooms SET status = 'to_be_renovated' WHERE status = 'ska renoveras';
UPDATE rooms SET status = 'new_construction' WHERE status = 'nyproduktion';
ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'existing';
