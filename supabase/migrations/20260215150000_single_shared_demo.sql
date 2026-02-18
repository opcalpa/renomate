-- Single Shared Demo Project
-- Everyone sees the same public_demo project
-- Only system_admin can edit it

-- ============================================================
-- UPDATE RLS POLICIES FOR SYSTEM ADMIN EDITING
-- ============================================================

-- PROJECTS: System admin can edit public_demo
DROP POLICY IF EXISTS "System admin can edit public demo project" ON public.projects;
CREATE POLICY "System admin can edit public demo project" ON public.projects
FOR ALL USING (
  project_type = 'public_demo'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- ROOMS: System admin can edit rooms in public_demo
DROP POLICY IF EXISTS "System admin can edit public demo rooms" ON public.rooms;
CREATE POLICY "System admin can edit public demo rooms" ON public.rooms
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- TASKS: System admin can edit tasks in public_demo
DROP POLICY IF EXISTS "System admin can edit public demo tasks" ON public.tasks;
CREATE POLICY "System admin can edit public demo tasks" ON public.tasks
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- MATERIALS: System admin can edit materials in public_demo
DROP POLICY IF EXISTS "System admin can edit public demo materials" ON public.materials;
CREATE POLICY "System admin can edit public demo materials" ON public.materials
FOR ALL USING (
  project_id IN (SELECT id FROM public.projects WHERE project_type = 'public_demo')
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- FLOOR_MAP_SHAPES: System admin can edit shapes in public_demo
DROP POLICY IF EXISTS "System admin can edit public demo shapes" ON public.floor_map_shapes;
CREATE POLICY "System admin can edit public demo shapes" ON public.floor_map_shapes
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- FLOOR_MAP_PLANS: System admin can edit plans in public_demo
DROP POLICY IF EXISTS "System admin can edit public demo plans" ON public.floor_map_plans;
CREATE POLICY "System admin can edit public demo plans" ON public.floor_map_plans
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- COMMENTS: System admin can manage comments in public_demo
DROP POLICY IF EXISTS "System admin can manage public demo comments" ON public.comments;
CREATE POLICY "System admin can manage public demo comments" ON public.comments
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- STAKEHOLDERS: System admin can manage stakeholders in public_demo
DROP POLICY IF EXISTS "System admin can manage public demo stakeholders" ON public.stakeholders;
CREATE POLICY "System admin can manage public demo stakeholders" ON public.stakeholders
FOR ALL USING (
  is_public_demo_project(project_id)
  AND EXISTS (SELECT 1 FROM profiles WHERE id = get_user_profile_id() AND is_system_admin = TRUE)
);

-- ============================================================
-- CLEAN UP: Delete any existing personal demo projects
-- They are no longer needed since everyone shares the public demo
-- ============================================================
-- Disable activity log triggers to avoid FK violations during cascade delete
ALTER TABLE tasks DISABLE TRIGGER trg_task_activity;
ALTER TABLE rooms DISABLE TRIGGER trg_room_activity;
ALTER TABLE materials DISABLE TRIGGER trg_material_activity;
ALTER TABLE project_shares DISABLE TRIGGER trg_project_share_activity;
ALTER TABLE floor_map_plans DISABLE TRIGGER trg_floor_plan_activity;

-- First delete related activity_log entries
DELETE FROM activity_log WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');
-- Then delete the demo projects (will cascade to tasks, rooms, etc.)
DELETE FROM projects WHERE project_type = 'demo_project';

-- Re-enable triggers
ALTER TABLE tasks ENABLE TRIGGER trg_task_activity;
ALTER TABLE rooms ENABLE TRIGGER trg_room_activity;
ALTER TABLE materials ENABLE TRIGGER trg_material_activity;
ALTER TABLE project_shares ENABLE TRIGGER trg_project_share_activity;
ALTER TABLE floor_map_plans ENABLE TRIGGER trg_floor_plan_activity;

-- ============================================================
-- HELPER COMMENT
-- ============================================================
COMMENT ON FUNCTION is_public_demo_project IS
'Returns true if the given project is the public demo project (project_type = public_demo).
The public demo is viewable by everyone (including anonymous users) but only editable by system admins.';
