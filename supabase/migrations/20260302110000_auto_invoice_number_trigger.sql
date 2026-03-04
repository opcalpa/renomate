-- Auto-assign invoice_number if NULL on insert (FAK-YYYY-NNN format per creator)
-- Allows user override: if invoice_number is provided, trigger skips
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  current_year TEXT;
BEGIN
  IF NEW.invoice_number IS NULL THEN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(
      MAX(
        CASE WHEN invoice_number ~ ('^FAK-' || current_year || '-\d+$')
        THEN CAST(SUBSTRING(invoice_number FROM '\d+$') AS INT)
        ELSE 0 END
      ), 0) + 1
    INTO next_seq
    FROM public.invoices
    WHERE creator_id = NEW.creator_id;

    NEW.invoice_number := 'FAK-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invoice_number ON public.invoices;
CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Backfill existing invoices that have no number
WITH numbered AS (
  SELECT id,
    'FAK-' || EXTRACT(YEAR FROM created_at)::TEXT || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at)::TEXT, 3, '0') AS num
  FROM public.invoices
  WHERE invoice_number IS NULL
)
UPDATE public.invoices i
SET invoice_number = numbered.num
FROM numbered
WHERE i.id = numbered.id;
