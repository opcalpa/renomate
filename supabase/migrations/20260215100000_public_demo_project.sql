-- Public Demo Project
-- Creates a single, publicly viewable demo project that non-logged-in users can view.
-- System admins retain full edit access.

-- Fixed ID for the public demo project (easy to reference from frontend)
-- Using a deterministic UUID based on a known seed
DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_system_admin_profile_id UUID;
  v_room_ids UUID[] := ARRAY[]::UUID[];
  v_task_ids UUID[] := ARRAY[]::UUID[];
  v_room_id UUID;
  v_task_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get the system admin profile (carl.palmquist@gmail.com)
  SELECT p.id INTO v_system_admin_profile_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'carl.palmquist@gmail.com'
  LIMIT 1;

  -- If no system admin found, use a fallback (the project will still work)
  IF v_system_admin_profile_id IS NULL THEN
    -- Create a placeholder profile ID (will be updated when admin logs in)
    v_system_admin_profile_id := gen_random_uuid();
  END IF;

  -- Disable activity triggers
  ALTER TABLE tasks DISABLE TRIGGER trg_task_activity;
  ALTER TABLE rooms DISABLE TRIGGER trg_room_activity;
  ALTER TABLE materials DISABLE TRIGGER trg_material_activity;
  ALTER TABLE project_shares DISABLE TRIGGER trg_project_share_activity;
  ALTER TABLE floor_map_plans DISABLE TRIGGER trg_floor_plan_activity;

  -- Delete existing public demo project if it exists
  DELETE FROM activity_log WHERE project_id = v_public_demo_id;
  DELETE FROM floor_map_shapes WHERE project_id = v_public_demo_id;
  DELETE FROM materials WHERE project_id = v_public_demo_id;
  DELETE FROM tasks WHERE project_id = v_public_demo_id;
  DELETE FROM rooms WHERE project_id = v_public_demo_id;
  DELETE FROM project_shares WHERE project_id = v_public_demo_id;
  DELETE FROM quotes WHERE project_id = v_public_demo_id;
  DELETE FROM projects WHERE id = v_public_demo_id;

  -- Re-enable triggers
  ALTER TABLE tasks ENABLE TRIGGER trg_task_activity;
  ALTER TABLE rooms ENABLE TRIGGER trg_room_activity;
  ALTER TABLE materials ENABLE TRIGGER trg_material_activity;
  ALTER TABLE project_shares ENABLE TRIGGER trg_project_share_activity;
  ALTER TABLE floor_map_plans ENABLE TRIGGER trg_floor_plan_activity;

  -- Create the public demo project
  INSERT INTO projects (id, name, description, owner_id, status, project_type, address, city, postal_code, total_budget, currency)
  VALUES (
    v_public_demo_id,
    'Renovering Vasastan 3:a',
    'Ytskiktsrenovering av 3-rumslägenhet i Vasastan, Stockholm. Ca 52 kvm. Detta är ett demonstrationsprojekt som visar Renomates funktioner.',
    v_system_admin_profile_id,
    'in_progress',
    'public_demo',
    'Odengatan 45',
    'Stockholm',
    '113 51',
    134000,
    'SEK'
  );

  -- Create rooms
  -- Room 0: Vardagsrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_public_demo_id, 'Vardagsrum', 'Stort vardagsrum med parkettgolv. Väggar behöver spacklas och målas.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 3500}, {"x": 5000, "y": 3500}, {"x": 5000, "y": 7500}, {"x": 0, "y": 7500}], "coordinates": [{"x": 0, "y": 3500}, {"x": 5000, "y": 3500}, {"x": 5000, "y": 7500}, {"x": 0, "y": 7500}], "fillColor": "#60A5FA", "strokeColor": "#60A5FA", "name": "Vardagsrum"}'::jsonb);

  -- Room 1: Sovrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_public_demo_id, 'Sovrum', 'Sovrum med fondvägg som ska tapetseras.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_id, 'room',
    '{"points": [{"x": 5200, "y": 2500}, {"x": 8200, "y": 2500}, {"x": 8200, "y": 6500}, {"x": 5200, "y": 6500}], "coordinates": [{"x": 5200, "y": 2500}, {"x": 8200, "y": 2500}, {"x": 8200, "y": 6500}, {"x": 5200, "y": 6500}], "fillColor": "#A78BFA", "strokeColor": "#A78BFA", "name": "Sovrum"}'::jsonb);

  -- Room 2: Kök
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_public_demo_id, 'Kök', 'Kök med nya bänkskivor och stänkskydd.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 0}, {"x": 4000, "y": 0}, {"x": 4000, "y": 2000}, {"x": 0, "y": 2000}], "coordinates": [{"x": 0, "y": 0}, {"x": 4000, "y": 0}, {"x": 4000, "y": 2000}, {"x": 0, "y": 2000}], "fillColor": "#34D399", "strokeColor": "#34D399", "name": "Kök"}'::jsonb);

  -- Room 3: Badrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_public_demo_id, 'Badrum', 'Badrum med nya kakel och klinker.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_id, 'room',
    '{"points": [{"x": 4200, "y": 0}, {"x": 6200, "y": 0}, {"x": 6200, "y": 2000}, {"x": 4200, "y": 2000}], "coordinates": [{"x": 4200, "y": 0}, {"x": 6200, "y": 0}, {"x": 6200, "y": 2000}, {"x": 4200, "y": 2000}], "fillColor": "#38BDF8", "strokeColor": "#38BDF8", "name": "Badrum"}'::jsonb);

  -- Room 4: Hall
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_public_demo_id, 'Hall', 'Entréhall med plats för förvaring.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 2200}, {"x": 5000, "y": 2200}, {"x": 5000, "y": 3300}, {"x": 0, "y": 3300}], "coordinates": [{"x": 0, "y": 2200}, {"x": 5000, "y": 2200}, {"x": 5000, "y": 3300}, {"x": 0, "y": 3300}], "fillColor": "#FBBF24", "strokeColor": "#FBBF24", "name": "Hall"}'::jsonb);

  -- Create tasks
  -- Task 0: Förberedelse
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, NULL, 'Förberedelse och skydd', 'Täck golv, flytta möbler, tejpa fönster och lister.', 'completed', 'high', 'preparation', 3000, v_today - 21, v_today - 19, v_system_admin_profile_id);

  -- Task 1: Spackling
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[1], 'Spackling av väggar', 'Spackla sprickor och ojämnheter i vardagsrummet.', 'completed', 'high', 'walls', 8000, v_today - 19, v_today - 16, v_system_admin_profile_id);

  -- Task 2: Målning vardagsrum
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[1], 'Målning väggar & tak', 'Måla väggar och tak i vardagsrummet. Kulör: NCS S 0502-Y.', 'completed', 'medium', 'painting', 12000, v_today - 16, v_today - 13, v_system_admin_profile_id);

  -- Task 3: Tapetsering sovrum
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[2], 'Tapetsering fondvägg', 'Tapetsera fondvägg i sovrummet med mönstrad tapet.', 'in_progress', 'medium', 'walls', 6000, v_today - 5, v_today - 3, v_system_admin_profile_id);

  -- Task 4: Golvslipning
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[1], 'Slipning och lackning av golv', 'Slipa och lacka parkettgolv i vardagsrum och hall.', 'to_do', 'high', 'flooring', 18000, v_today + 2, v_today + 6, v_system_admin_profile_id);

  -- Task 5: Köksbänk och stänkskydd
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[3], 'Bänkskiva och stänkskydd', 'Montera ny bänkskiva och kakel som stänkskydd.', 'to_do', 'medium', 'kitchen', 25000, v_today + 7, v_today + 10, v_system_admin_profile_id);

  -- Task 6: Badrumskakel
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[4], 'Kakelsättning badrum', 'Sätt nytt kakel på väggar och klinker på golv i badrummet.', 'to_do', 'high', 'bathroom', 35000, v_today + 10, v_today + 15, v_system_admin_profile_id);

  -- Task 7: Lister
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, NULL, 'Montering av lister', 'Montera golv- och taklister i hela lägenheten.', 'to_do', 'low', 'finishing', 8000, v_today + 16, v_today + 18, v_system_admin_profile_id);

  -- Task 8: El-arbete
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, v_room_ids[3], 'Eluttag och belysning', 'Installera nya eluttag och LED-spots i köket.', 'to_do', 'medium', 'electrical', 15000, v_today + 5, v_today + 7, v_system_admin_profile_id);

  -- Task 9: Slutstädning
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_public_demo_id, NULL, 'Slutstädning', 'Professionell städning efter renoveringen.', 'to_do', 'low', 'other', 4000, v_today + 19, v_today + 20, v_system_admin_profile_id);

  -- Create materials
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[1], v_task_ids[2], 'Spackel fin (Gyproc)', 5, 'st', 350, 'Byggmax', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[1], v_task_ids[3], 'Väggfärg Beckers Scotte 7', 25, 'liter', 85, 'Colorama', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[1], v_task_ids[3], 'Takfärg Beckers Takfärg', 10, 'liter', 95, 'Colorama', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[2], v_task_ids[4], 'Tapet Boråstapeter Linen', 6, 'rullar', 890, 'Boråstapeter', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[1], v_task_ids[5], 'Golvlack Bona Traffic HD', 5, 'liter', 520, 'Bona', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[3], v_task_ids[6], 'Bänkskiva IKEA Ekbacken', 1, 'st', 8500, 'IKEA', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[3], v_task_ids[6], 'Kakel stänkskydd vit 10x20', 2, 'kvm', 650, 'Kakel Direkt', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[4], v_task_ids[7], 'Kakel vägg vit blank 20x25', 12, 'kvm', 490, 'Bauhaus', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[4], v_task_ids[7], 'Fogmassa grå', 8, 'kg', 65, 'Bauhaus', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, NULL, v_task_ids[8], 'Golvlist vitmålad 12x56mm', 45, 'meter', 89, 'Byggmax', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[1], v_task_ids[8], 'Taklist klassisk 45mm', 25, 'meter', 125, 'Byggmax', v_system_admin_profile_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, created_by_user_id)
  VALUES (gen_random_uuid(), v_public_demo_id, v_room_ids[3], v_task_ids[9], 'LED-spots inbyggnad 6W', 6, 'st', 299, 'Elgiganten', v_system_admin_profile_id);

END $$;

-- ============================================================
-- RLS POLICIES FOR PUBLIC DEMO ACCESS
-- Allow anonymous users to READ the public demo project
-- ============================================================

-- Helper function to check if a project is the public demo
CREATE OR REPLACE FUNCTION public.is_public_demo_project(p_project_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND project_type = 'public_demo'
  );
$$;

-- PROJECTS: Allow anon to view public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo project" ON public.projects;
CREATE POLICY "Anyone can view public demo project" ON public.projects
FOR SELECT USING (
  project_type = 'public_demo'
);

-- ROOMS: Allow anon to view rooms in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo rooms" ON public.rooms;
CREATE POLICY "Anyone can view public demo rooms" ON public.rooms
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- TASKS: Allow anon to view tasks in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo tasks" ON public.tasks;
CREATE POLICY "Anyone can view public demo tasks" ON public.tasks
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- MATERIALS: Allow anon to view materials in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo materials" ON public.materials;
CREATE POLICY "Anyone can view public demo materials" ON public.materials
FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE project_type = 'public_demo')
);

-- FLOOR_MAP_SHAPES: Allow anon to view shapes in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo shapes" ON public.floor_map_shapes;
CREATE POLICY "Anyone can view public demo shapes" ON public.floor_map_shapes
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- FLOOR_MAP_PLANS: Allow anon to view plans in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo plans" ON public.floor_map_plans;
CREATE POLICY "Anyone can view public demo plans" ON public.floor_map_plans
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- COMMENTS: Allow anon to view comments in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo comments" ON public.comments;
CREATE POLICY "Anyone can view public demo comments" ON public.comments
FOR SELECT USING (
  is_public_demo_project(project_id)
);

-- ACTIVITY_LOG: Allow anon to view activity in public_demo projects
DROP POLICY IF EXISTS "Anyone can view public demo activity" ON public.activity_log;
CREATE POLICY "Anyone can view public demo activity" ON public.activity_log
FOR SELECT USING (
  is_public_demo_project(project_id)
);

COMMENT ON FUNCTION is_public_demo_project IS 'Returns true if the given project is the public demo project (project_type = public_demo)';
