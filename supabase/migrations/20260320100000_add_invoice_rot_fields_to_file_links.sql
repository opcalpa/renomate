-- Add invoice and ROT tracking fields to task_file_links
-- These enable:
-- 1. Tracking invoice dates and amounts per file
-- 2. ROT deduction tracking per invoice
-- 3. Feeding data to the Deklarationssammanställning

ALTER TABLE public.task_file_links
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS rot_amount NUMERIC;

-- Update the file_type CHECK to include 'quote' if not already present
-- (idempotent: drop + re-create)
ALTER TABLE public.task_file_links DROP CONSTRAINT IF EXISTS task_file_links_file_type_check;
ALTER TABLE public.task_file_links
  ADD CONSTRAINT task_file_links_file_type_check
  CHECK (file_type IN ('invoice', 'receipt', 'contract', 'quote', 'specification', 'other'));
