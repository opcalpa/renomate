-- Fix activity log triggers to not log during cascade deletes
-- When a project is deleted, child entities are cascade-deleted but
-- the triggers try to insert activity_log entries referencing the deleted project

-- Update task activity trigger
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_project_exists BOOLEAN;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'task', NEW.id, NEW.title);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name, changes)
      VALUES (NEW.project_id, v_actor, 'status_changed', 'task', NEW.id, NEW.title,
              jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.assigned_to_stakeholder_id IS DISTINCT FROM NEW.assigned_to_stakeholder_id THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name, changes)
      VALUES (NEW.project_id, v_actor, 'assigned', 'task', NEW.id, NEW.title,
              jsonb_build_object('assignee_id', NEW.assigned_to_stakeholder_id));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check if project still exists (not being cascade-deleted)
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;
    IF v_project_exists THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
      VALUES (OLD.project_id, v_actor, 'deleted', 'task', OLD.id, OLD.title);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Update room activity trigger
CREATE OR REPLACE FUNCTION log_room_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_project_exists BOOLEAN;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'room', NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check if project still exists (not being cascade-deleted)
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;
    IF v_project_exists THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
      VALUES (OLD.project_id, v_actor, 'deleted', 'room', OLD.id, OLD.name);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Update material activity trigger
CREATE OR REPLACE FUNCTION log_material_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_project_exists BOOLEAN;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'material', NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name, changes)
      VALUES (NEW.project_id, v_actor, 'status_changed', 'material', NEW.id, NEW.name,
              jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check if project still exists (not being cascade-deleted)
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;
    IF v_project_exists THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
      VALUES (OLD.project_id, v_actor, 'deleted', 'material', OLD.id, OLD.name);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Update project_share activity trigger
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

-- Update floor_plan activity trigger
CREATE OR REPLACE FUNCTION log_floor_plan_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_project_exists BOOLEAN;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'floor_plan', NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Check if project still exists (not being cascade-deleted)
    SELECT EXISTS(SELECT 1 FROM projects WHERE id = OLD.project_id) INTO v_project_exists;
    IF v_project_exists THEN
      INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
      VALUES (OLD.project_id, v_actor, 'deleted', 'floor_plan', OLD.id, OLD.name);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
