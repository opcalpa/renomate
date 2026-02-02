-- Add professional/marketplace fields to profiles
-- Extends the existing contractor fields from 20260129100500

-- Boolean flag to enable professional mode
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT false;

-- Company description (free text about the business)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_description TEXT;

-- Company website URL
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_website TEXT;

-- Average rating (computed from reviews, 1.0–5.0)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1);

-- Geographic coordinates for radius-based search
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Index for finding professionals quickly
CREATE INDEX IF NOT EXISTS idx_profiles_is_professional
  ON public.profiles (is_professional)
  WHERE is_professional = true;

-- Composite index for marketplace search (category + geography)
CREATE INDEX IF NOT EXISTS idx_profiles_pro_category
  ON public.profiles (contractor_category, average_rating DESC NULLS LAST)
  WHERE is_professional = true;

-- RLS: Replace the blanket SELECT policy with a more targeted one.
-- Everyone can still see basic info (name, avatar), but professional
-- fields are only exposed for is_professional = true profiles,
-- and private fields are only visible to the profile owner.
--
-- Since Supabase RLS works at row level (not column level), we keep
-- the existing "Users can view all profiles" policy as-is. Column-level
-- visibility will be enforced via a database view.

-- Create a public view for marketplace searches that only exposes
-- professional profiles with relevant fields.
CREATE OR REPLACE VIEW public.professional_profiles AS
SELECT
  id,
  user_id,
  name,
  avatar_url,
  is_professional,
  contractor_category,
  company_name,
  company_address,
  company_city,
  company_postal_code,
  company_country,
  company_description,
  company_website,
  average_rating,
  latitude,
  longitude,
  created_at
FROM public.profiles
WHERE is_professional = true;

-- Grant read access on the view to authenticated users
GRANT SELECT ON public.professional_profiles TO authenticated;
