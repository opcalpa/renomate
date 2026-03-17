-- Fix search_path for quote triggers that reference "projects" table
-- Without explicit search_path, SECURITY DEFINER functions can't find tables

CREATE OR REPLACE FUNCTION handle_quote_status_project_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    UPDATE projects SET status = 'active' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'rejected' THEN
    IF NOT EXISTS (
      SELECT 1 FROM quotes
      WHERE project_id = NEW.project_id
        AND id != NEW.id
        AND status IN ('draft', 'sent', 'accepted')
    ) THEN
      UPDATE projects SET status = 'quote_rejected' WHERE id = NEW.project_id;
    END IF;
  ELSIF NEW.status = 'sent' THEN
    UPDATE projects SET status = 'quote_sent' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'draft' AND OLD.status = 'sent' THEN
    UPDATE projects SET status = 'quote_created' WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_quote_clears_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'draft' THEN
    UPDATE projects
    SET status = 'quote_created'
    WHERE id = NEW.project_id
      AND status = 'quote_rejected';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;
