-- Add new onboarding fields for guided setup flow
-- These track the new de-emphasized canvas onboarding steps

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_reviewed_rooms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_invited_team BOOLEAN DEFAULT false;

-- Add comments for the new fields
COMMENT ON COLUMN public.profiles.onboarding_reviewed_rooms IS 'User has reviewed their rooms after guided setup';
COMMENT ON COLUMN public.profiles.onboarding_invited_team IS 'User has invited a team member or client';
