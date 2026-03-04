-- Add is_ata column to tasks (marks task as a change order / ÄTA)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_ata BOOLEAN DEFAULT false;

-- Extend quote acceptance trigger to also set project total_budget from accepted quote
CREATE OR REPLACE FUNCTION handle_quote_status_project_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    -- Set project status to active AND set total_budget from the quote's total_amount
    UPDATE projects
    SET status = 'active',
        total_budget = COALESCE(NEW.total_amount, total_budget)
    WHERE id = NEW.project_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE projects SET status = 'planning' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'sent' THEN
    UPDATE projects SET status = 'quote_sent' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'draft' AND OLD.status = 'sent' THEN
    UPDATE projects SET status = 'quote_created' WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;
