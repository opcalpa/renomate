-- Add payment fields to profiles for invoice generation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bankgiro TEXT,
  ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER DEFAULT 30;
