-- Add company_logo_url column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Create public bucket for company logos (needs to be public so quotes render for anyone)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload their own logo
CREATE POLICY "Users can upload own logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);

-- Anyone can view logos (public bucket, needed for quote rendering)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Users can update/delete their own logos
CREATE POLICY "Users can manage own logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);
