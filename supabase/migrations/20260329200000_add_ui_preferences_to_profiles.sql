-- Add ui_preferences JSONB column to profiles for cross-device view preference sync
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN profiles.ui_preferences IS 'User view preferences (column order, view modes, etc.) synced across devices';
