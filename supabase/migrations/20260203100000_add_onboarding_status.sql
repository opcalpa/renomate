-- Add onboarding tracking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_profile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_created_project BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_drawn_room BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_created_quote BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
