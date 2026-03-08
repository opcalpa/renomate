-- Add estimation_settings JSONB column to profiles for builder calculation preferences
-- Stores paint coverage, coat count, and future estimation parameters per user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estimation_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.estimation_settings IS
  'Builder estimation preferences: paint_coverage_sqm_per_liter, paint_coats, etc.';
