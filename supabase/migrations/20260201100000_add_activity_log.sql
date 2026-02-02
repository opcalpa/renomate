-- Activity log table for project feed
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity for their projects"
  ON activity_log FOR SELECT
  USING (user_has_project_access(project_id));

-- Trigger function for tasks
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
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
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (OLD.project_id, v_actor, 'deleted', 'task', OLD.id, OLD.title);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_activity ON tasks;
CREATE TRIGGER trg_task_activity
  AFTER INSERT OR UPDATE OF status, assigned_to_stakeholder_id OR DELETE
  ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

-- Trigger function for rooms
CREATE OR REPLACE FUNCTION log_room_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'room', NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (OLD.project_id, v_actor, 'deleted', 'room', OLD.id, OLD.name);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_activity ON rooms;
CREATE TRIGGER trg_room_activity
  AFTER INSERT OR DELETE
  ON rooms
  FOR EACH ROW EXECUTE FUNCTION log_room_activity();

-- Trigger function for materials
CREATE OR REPLACE FUNCTION log_material_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
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
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (OLD.project_id, v_actor, 'deleted', 'material', OLD.id, OLD.name);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_material_activity ON materials;
CREATE TRIGGER trg_material_activity
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON materials
  FOR EACH ROW EXECUTE FUNCTION log_material_activity();

-- Trigger function for project_shares (team members)
CREATE OR REPLACE FUNCTION log_project_share_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
  v_name TEXT;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_name FROM profiles WHERE id = NEW.shared_with_user_id;
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'member_added', 'team_member', NEW.shared_with_user_id, COALESCE(v_name, NEW.invited_email));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT name INTO v_name FROM profiles WHERE id = OLD.shared_with_user_id;
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (OLD.project_id, v_actor, 'member_removed', 'team_member', OLD.shared_with_user_id, COALESCE(v_name, OLD.invited_email));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_share_activity ON project_shares;
CREATE TRIGGER trg_project_share_activity
  AFTER INSERT OR DELETE
  ON project_shares
  FOR EACH ROW EXECUTE FUNCTION log_project_share_activity();

-- Trigger function for floor_map_plans
CREATE OR REPLACE FUNCTION log_floor_plan_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'floor_plan', NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (OLD.project_id, v_actor, 'deleted', 'floor_plan', OLD.id, OLD.name);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_floor_plan_activity ON floor_map_plans;
CREATE TRIGGER trg_floor_plan_activity
  AFTER INSERT OR DELETE
  ON floor_map_plans
  FOR EACH ROW EXECUTE FUNCTION log_floor_plan_activity();
