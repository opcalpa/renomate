-- Track whether homeowner has been asked about household members for ROT
-- Revert: ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_asked_household;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_asked_household boolean DEFAULT false;
