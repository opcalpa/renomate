-- New onboarding fields for extended steps
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_entered_canvas BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_generated_walls BOOLEAN DEFAULT FALSE;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
  ON profiles (onboarding_user_type, onboarding_dismissed);

COMMENT ON COLUMN profiles.onboarding_entered_canvas IS 'User has opened floor planner';
COMMENT ON COLUMN profiles.onboarding_generated_walls IS 'User has used auto-generate walls';
