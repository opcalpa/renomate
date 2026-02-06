-- Reset all demo projects so they get recreated with the new template
-- This removes old demo projects for all users

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

-- Delete the demo projects themselves
DELETE FROM projects WHERE project_type = 'demo_project';
