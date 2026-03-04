-- Add quote_rejected to project status lifecycle.
-- When a quote is rejected, the project enters this state.
-- Creating a revision or new draft moves it back to quote_created.

-- Step 1: Drop and re-add constraint with new value
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('planning', 'quote_created', 'quote_sent', 'quote_rejected', 'active', 'on_hold', 'completed', 'cancelled'));

-- Step 2: Update trigger to use quote_rejected instead of planning on rejection,
--         and move to quote_created when a new draft is created for that project.
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
    UPDATE projects SET status = 'active' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'rejected' THEN
    -- Only set quote_rejected if no other non-rejected quote exists for this project
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

-- Step 3: When a new quote is inserted as draft for a project in quote_rejected,
--         move it back to quote_created (e.g. after revision).
CREATE OR REPLACE FUNCTION handle_new_quote_clears_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_new_quote_clears_rejected ON quotes;
CREATE TRIGGER trg_new_quote_clears_rejected
  AFTER INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_quote_clears_rejected();
