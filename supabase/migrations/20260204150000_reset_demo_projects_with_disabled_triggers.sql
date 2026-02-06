-- Reset all demo projects by temporarily disabling activity triggers
-- This prevents the foreign key constraint issue when deleting records

-- Temporarily disable triggers on tables that log to activity_log
ALTER TABLE tasks DISABLE TRIGGER trg_task_activity;
ALTER TABLE rooms DISABLE TRIGGER trg_room_activity;
ALTER TABLE materials DISABLE TRIGGER trg_material_activity;
ALTER TABLE project_shares DISABLE TRIGGER trg_project_share_activity;
ALTER TABLE floor_map_plans DISABLE TRIGGER trg_floor_plan_activity;

-- First clean up any orphaned activity_log records (where project no longer exists)
DELETE FROM activity_log
WHERE project_id NOT IN (SELECT id FROM projects);

-- Delete activity logs for demo projects
DELETE FROM activity_log
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete floor map shapes in demo projects
DELETE FROM floor_map_shapes
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete materials in demo projects
DELETE FROM materials
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete tasks in demo projects
DELETE FROM tasks
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete rooms in demo projects
DELETE FROM rooms
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete project shares for demo projects
DELETE FROM project_shares
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete quotes for demo projects
DELETE FROM quotes
WHERE project_id IN (SELECT id FROM projects WHERE project_type = 'demo_project');

-- Delete the demo projects themselves
DELETE FROM projects WHERE project_type = 'demo_project';

-- Re-enable the triggers
ALTER TABLE tasks ENABLE TRIGGER trg_task_activity;
ALTER TABLE rooms ENABLE TRIGGER trg_room_activity;
ALTER TABLE materials ENABLE TRIGGER trg_material_activity;
ALTER TABLE project_shares ENABLE TRIGGER trg_project_share_activity;
ALTER TABLE floor_map_plans ENABLE TRIGGER trg_floor_plan_activity;
