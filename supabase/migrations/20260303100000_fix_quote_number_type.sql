-- Fix quote_number column type: was created as integer, needs to be text
-- for "OFF-2026-001" format
ALTER TABLE public.quotes
  ALTER COLUMN quote_number TYPE TEXT
  USING quote_number::TEXT;
