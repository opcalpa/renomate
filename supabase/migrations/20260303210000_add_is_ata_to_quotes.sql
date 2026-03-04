-- Add is_ata column to quotes table (marks quote as a change order / ÄTA)
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS is_ata BOOLEAN DEFAULT false;
