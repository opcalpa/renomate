-- Add system admin field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT FALSE;

-- Set carl.palmquist@gmail.com as system admin
UPDATE profiles
SET is_system_admin = TRUE
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'carl.palmquist@gmail.com'
);

-- Add comment
COMMENT ON COLUMN profiles.is_system_admin IS 'System administrators can edit demo projects and access admin features';
