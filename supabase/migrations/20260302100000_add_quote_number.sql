-- Add quote_number column to quotes (TEXT to allow custom numbering)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- Function to auto-assign sequential quote number per creator (OFF-2026-001 format)
-- Only sets if quote_number is NULL, allowing user overrides
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  current_year TEXT;
BEGIN
  IF NEW.quote_number IS NULL THEN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(
      MAX(
        CASE WHEN quote_number ~ ('^OFF-' || current_year || '-\d+$')
        THEN CAST(SUBSTRING(quote_number FROM '\d+$') AS INT)
        ELSE 0 END
      ), 0) + 1
    INTO next_seq
    FROM public.quotes
    WHERE creator_id = NEW.creator_id;

    NEW.quote_number := 'OFF-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger before insert
DROP TRIGGER IF EXISTS trg_set_quote_number ON public.quotes;
CREATE TRIGGER trg_set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Backfill existing quotes with sequential numbers per creator
WITH numbered AS (
  SELECT id,
    'OFF-' || EXTRACT(YEAR FROM created_at)::TEXT || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at)::TEXT, 3, '0') AS num
  FROM public.quotes
  WHERE quote_number IS NULL
)
UPDATE public.quotes q
SET quote_number = numbered.num
FROM numbered
WHERE q.id = numbered.id;
