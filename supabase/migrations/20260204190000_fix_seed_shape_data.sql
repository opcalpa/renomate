-- Fix the seed function to use the correct floor_map_shapes columns
-- shape_data is required (NOT NULL), coordinates is optional

CREATE OR REPLACE FUNCTION seed_demo_project_for_user(p_owner_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_room_ids UUID[] := ARRAY[]::UUID[];
  v_task_ids UUID[] := ARRAY[]::UUID[];
  v_room_id UUID;
  v_task_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Check if user already has a demo project
  SELECT id INTO v_project_id
  FROM projects
  WHERE owner_id = p_owner_id AND project_type = 'demo_project'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    RETURN v_project_id;
  END IF;

  -- Create the demo project
  v_project_id := gen_random_uuid();

  INSERT INTO projects (id, name, description, owner_id, status, project_type)
  VALUES (
    v_project_id,
    'Renovering Vasastan 3:a',
    'Ytskiktsrenovering av 3-rumslägenhet i Vasastan, Stockholm. Ca 52 kvm.',
    p_owner_id,
    'in_progress',
    'demo_project'
  );

  -- Create rooms (PostgreSQL arrays are 1-based)
  -- Room 1: Vardagsrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Vardagsrum', 'Stort vardagsrum med parkettgolv. Väggar behöver spacklas och målas.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data, name, fill_color, stroke_color, stroke_width, opacity)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 3500}, {"x": 5000, "y": 3500}, {"x": 5000, "y": 7500}, {"x": 0, "y": 7500}]}'::jsonb,
    'Vardagsrum', '#60A5FA', '#60A5FA', 2, 0.4);

  -- Room 2: Sovrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Sovrum', 'Sovrum med fondvägg som ska tapetseras.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data, name, fill_color, stroke_color, stroke_width, opacity)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    '{"points": [{"x": 5200, "y": 2500}, {"x": 8200, "y": 2500}, {"x": 8200, "y": 6500}, {"x": 5200, "y": 6500}]}'::jsonb,
    'Sovrum', '#A78BFA', '#A78BFA', 2, 0.4);

  -- Room 3: Kök
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Kök', 'Kök med nya bänkskivor och stänkskydd.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data, name, fill_color, stroke_color, stroke_width, opacity)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 0}, {"x": 4000, "y": 0}, {"x": 4000, "y": 2000}, {"x": 0, "y": 2000}]}'::jsonb,
    'Kök', '#34D399', '#34D399', 2, 0.4);

  -- Room 4: Badrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Badrum', 'Badrum med nya kakel och klinker.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data, name, fill_color, stroke_color, stroke_width, opacity)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    '{"points": [{"x": 4200, "y": 0}, {"x": 6200, "y": 0}, {"x": 6200, "y": 2000}, {"x": 4200, "y": 2000}]}'::jsonb,
    'Badrum', '#38BDF8', '#38BDF8', 2, 0.4);

  -- Room 5: Hall
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Hall', 'Entréhall med plats för förvaring.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data, name, fill_color, stroke_color, stroke_width, opacity)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    '{"points": [{"x": 0, "y": 2200}, {"x": 5000, "y": 2200}, {"x": 5000, "y": 3300}, {"x": 0, "y": 3300}]}'::jsonb,
    'Hall', '#FBBF24', '#FBBF24', 2, 0.4);

  -- Create tasks (PostgreSQL arrays are 1-based)
  -- Task 1: Förberedelse
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Förberedelse och skydd', 'Täck golv, flytta möbler, tejpa fönster och lister.', 'done', 'high', 'preparation', 3000, v_today - 21, v_today - 19, p_owner_id);

  -- Task 2: Spackling
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Spackling av väggar', 'Spackla sprickor och ojämnheter i vardagsrummet.', 'done', 'high', 'walls', 8000, v_today - 19, v_today - 16, p_owner_id);

  -- Task 3: Målning vardagsrum
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Målning väggar & tak', 'Måla väggar och tak i vardagsrummet. Kulör: NCS S 0502-Y.', 'done', 'medium', 'painting', 12000, v_today - 16, v_today - 13, p_owner_id);

  -- Task 4: Tapetsering sovrum
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[2], 'Tapetsering fondvägg', 'Tapetsera fondvägg i sovrummet med mönstrad tapet.', 'doing', 'medium', 'walls', 6000, v_today - 5, v_today - 3, p_owner_id);

  -- Task 5: Golvslipning
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Slipning och lackning av golv', 'Slipa och lacka parkettgolv i vardagsrum och hall.', 'to_do', 'high', 'flooring', 18000, v_today + 2, v_today + 6, p_owner_id);

  -- Task 6: Köksbänk och stänkskydd
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3], 'Bänkskiva och stänkskydd', 'Montera ny bänkskiva och kakel som stänkskydd.', 'to_do', 'medium', 'kitchen', 25000, v_today + 7, v_today + 10, p_owner_id);

  -- Task 7: Badrumskakel
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[4], 'Kakelsättning badrum', 'Sätt nytt kakel på väggar och klinker på golv i badrummet.', 'to_do', 'high', 'bathroom', 35000, v_today + 10, v_today + 15, p_owner_id);

  -- Task 8: Lister
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Montering av lister', 'Montera golv- och taklister i hela lägenheten.', 'to_do', 'low', 'finishing', 8000, v_today + 16, v_today + 18, p_owner_id);

  -- Task 9: El-arbete
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3], 'Eluttag och belysning', 'Installera nya eluttag och LED-spots i köket.', 'to_do', 'medium', 'electrical', 15000, v_today + 5, v_today + 7, p_owner_id);

  -- Task 10: Slutstädning
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Slutstädning', 'Professionell städning efter renoveringen.', 'to_do', 'low', 'other', 4000, v_today + 19, v_today + 20, p_owner_id);

  -- Create materials (using 1-based array indices)
  -- Spackel - task 2 (spackling)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[2], 'Spackel fin (Gyproc)', 5, 'st', 350, 'Byggmax', 'done', p_owner_id);

  -- Väggfärg - task 3 (målning)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3], 'Väggfärg Beckers Scotte 7', 25, 'liter', 85, 'Colorama', 'done', p_owner_id);

  -- Takfärg - task 3
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3], 'Takfärg Beckers Takfärg', 10, 'liter', 95, 'Colorama', 'done', p_owner_id);

  -- Tapet - task 4 (tapetsering)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[2], v_task_ids[4], 'Tapet Boråstapeter Linen', 6, 'rullar', 890, 'Boråstapeter', 'new', p_owner_id);

  -- Golvlack - task 5 (golvslipning)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[5], 'Golvlack Bona Traffic HD', 5, 'liter', 520, 'Bona', 'new', p_owner_id);

  -- Bänkskiva - task 6 (kök)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6], 'Bänkskiva IKEA Ekbacken', 1, 'st', 8500, 'IKEA', 'new', p_owner_id);

  -- Stänkskydd - task 6
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6], 'Kakel stänkskydd vit 10x20', 2, 'kvm', 650, 'Kakel Direkt', 'new', p_owner_id);

  -- Badrumskakel - task 7
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7], 'Kakel vägg vit blank 20x25', 12, 'kvm', 490, 'Bauhaus', 'new', p_owner_id);

  -- Fog - task 7
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7], 'Fogmassa grå', 8, 'kg', 65, 'Bauhaus', 'new', p_owner_id);

  -- Golvlist - task 8 (lister)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, NULL, v_task_ids[8], 'Golvlist vitmålad 12x56mm', 45, 'meter', 89, 'Byggmax', 'new', p_owner_id);

  -- Taklist - task 8
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[8], 'Taklist klassisk 45mm', 25, 'meter', 125, 'Byggmax', 'new', p_owner_id);

  -- LED-spots - task 9 (el)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, cost, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[9], 'LED-spots inbyggnad 6W', 6, 'st', 299, 'Elgiganten', 'new', p_owner_id);

  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION seed_demo_project_for_user IS 'Seeds a demo project for a user if they do not already have one. Returns the project ID.';
