-- When a quote's status changes, update the associated project's status.
-- This runs as SECURITY DEFINER so it works even when the actor (e.g. a customer)
-- doesn't have direct UPDATE access to the projects table.

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
    UPDATE projects SET status = 'planning' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'sent' THEN
    UPDATE projects SET status = 'quote_sent' WHERE id = NEW.project_id;
  ELSIF NEW.status = 'draft' AND OLD.status = 'sent' THEN
    UPDATE projects SET status = 'quote_created' WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_status_project_sync ON quotes;
CREATE TRIGGER trg_quote_status_project_sync
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_quote_status_project_sync();
