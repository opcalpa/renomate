-- Fix the project_share activity trigger to use display_email instead of invited_email
-- The invited_email column doesn't exist on project_shares table

CREATE OR REPLACE FUNCTION log_project_share_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_name TEXT;
  v_project_exists BOOLEAN;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_name FROM profiles WHERE id = NEW.shared_with_user_id;
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'member_added', 'team_member', NEW.shared_with_user_id, COALESCE(v_name, NEW.display_name, NEW.display_email));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check if project still exists (not being cascade-deleted)
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;
    IF v_project_exists THEN
      SELECT name INTO v_name FROM profiles WHERE id = OLD.shared_with_user_id;
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
      VALUES (OLD.project_id, v_actor, 'member_removed', 'team_member', OLD.shared_with_user_id, COALESCE(v_name, OLD.display_name, OLD.display_email));
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
