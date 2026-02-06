-- First clean up any orphaned activity_log records
DELETE FROM activity_log
WHERE project_id NOT IN (SELECT id FROM projects);

-- Now clean up demo projects properly
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
