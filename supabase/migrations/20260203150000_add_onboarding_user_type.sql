-- Add user type and welcome completion status for PLG onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_user_type TEXT CHECK (onboarding_user_type IN ('homeowner', 'contractor')),
  ADD COLUMN IF NOT EXISTS onboarding_welcome_completed BOOLEAN DEFAULT false;

-- Add index for faster lookup of users who haven't completed welcome
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_incomplete
  ON public.profiles (user_id)
  WHERE onboarding_welcome_completed = false;
