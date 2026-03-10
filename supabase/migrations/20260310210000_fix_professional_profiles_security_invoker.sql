-- Fix: Change professional_profiles view from SECURITY DEFINER to SECURITY INVOKER

DROP VIEW IF EXISTS public.professional_profiles;

CREATE VIEW public.professional_profiles
WITH (security_invoker = on)
AS
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

GRANT SELECT ON public.professional_profiles TO authenticated;
