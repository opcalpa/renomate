-- Add personnummer to profiles (personal, same across projects)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personnummer TEXT;

-- Add property_designation to projects (property-specific per renovation)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS property_designation TEXT;
