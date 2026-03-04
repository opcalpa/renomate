-- Add bank_account_number to profiles and invoices
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
