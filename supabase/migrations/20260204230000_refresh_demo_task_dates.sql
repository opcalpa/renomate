-- Update demo project seeding function to always refresh task dates
-- This ensures the timeline always shows tasks relative to "today"
-- Only affects demo projects - regular user projects are not touched

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
  v_existing_project BOOLEAN := FALSE;
BEGIN
  -- Check if user already has a demo project
  SELECT id INTO v_project_id
  FROM projects
  WHERE owner_id = p_owner_id AND project_type = 'demo_project'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    v_existing_project := TRUE;

    -- Update existing task dates to be relative to today
    -- This ensures the timeline always shows relevant data

    -- Get room IDs in order
    SELECT array_agg(id ORDER BY created_at) INTO v_room_ids
    FROM rooms
    WHERE project_id = v_project_id;

    -- Get task IDs in order
    SELECT array_agg(id ORDER BY created_at) INTO v_task_ids
    FROM tasks
    WHERE project_id = v_project_id;

    -- Update task dates relative to today (matching the original seeding pattern)
    -- Task 0: Förberedelse (done)
    IF array_length(v_task_ids, 1) >= 1 THEN
      UPDATE tasks SET
        start_date = v_today - 21,
        finish_date = v_today - 19,
        status = 'completed',
        progress = 100
      WHERE id = v_task_ids[1];
    END IF;

    -- Task 1: Spackling (done)
    IF array_length(v_task_ids, 1) >= 2 THEN
      UPDATE tasks SET
        start_date = v_today - 19,
        finish_date = v_today - 16,
        status = 'completed',
        progress = 100
      WHERE id = v_task_ids[2];
    END IF;

    -- Task 2: Målning (done)
    IF array_length(v_task_ids, 1) >= 3 THEN
      UPDATE tasks SET
        start_date = v_today - 16,
        finish_date = v_today - 13,
        status = 'completed',
        progress = 100
      WHERE id = v_task_ids[3];
    END IF;

    -- Task 3: Tapetsering (in_progress)
    IF array_length(v_task_ids, 1) >= 4 THEN
      UPDATE tasks SET
        start_date = v_today - 3,
        finish_date = v_today + 1,
        status = 'in_progress',
        progress = 60
      WHERE id = v_task_ids[4];
    END IF;

    -- Task 4: Golvslipning (to_do, upcoming)
    IF array_length(v_task_ids, 1) >= 5 THEN
      UPDATE tasks SET
        start_date = v_today + 2,
        finish_date = v_today + 6,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[5];
    END IF;

    -- Task 5: Köksbänk (to_do)
    IF array_length(v_task_ids, 1) >= 6 THEN
      UPDATE tasks SET
        start_date = v_today + 7,
        finish_date = v_today + 10,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[6];
    END IF;

    -- Task 6: Badrumskakel (to_do)
    IF array_length(v_task_ids, 1) >= 7 THEN
      UPDATE tasks SET
        start_date = v_today + 10,
        finish_date = v_today + 15,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[7];
    END IF;

    -- Task 7: Lister (to_do)
    IF array_length(v_task_ids, 1) >= 8 THEN
      UPDATE tasks SET
        start_date = v_today + 16,
        finish_date = v_today + 18,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[8];
    END IF;

    -- Task 8: El-arbete (to_do)
    IF array_length(v_task_ids, 1) >= 9 THEN
      UPDATE tasks SET
        start_date = v_today + 5,
        finish_date = v_today + 7,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[9];
    END IF;

    -- Task 9: Slutstädning (to_do)
    IF array_length(v_task_ids, 1) >= 10 THEN
      UPDATE tasks SET
        start_date = v_today + 19,
        finish_date = v_today + 20,
        status = 'to_do',
        progress = 0
      WHERE id = v_task_ids[10];
    END IF;

    RETURN v_project_id;
  END IF;

  -- Create the demo project (if it doesn't exist)
  v_project_id := gen_random_uuid();

  INSERT INTO projects (id, name, description, owner_id, status, project_type, currency)
  VALUES (
    v_project_id,
    'Renovering Vasastan 3:a',
    'Ytskiktsrenovering av 3-rumslägenhet i Vasastan, Stockholm. Ca 52 kvm.',
    p_owner_id,
    'in_progress',
    'demo_project',
    'SEK'
  );

  -- Create rooms
  -- Room 0: Vardagsrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Vardagsrum', 'Stort vardagsrum med parkettgolv. Väggar behöver spacklas och målas.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, view_mode, coordinates, properties)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room', 'floorplan',
    '{"points": [{"x": 0, "y": 3500}, {"x": 5000, "y": 3500}, {"x": 5000, "y": 7500}, {"x": 0, "y": 7500}]}'::jsonb,
    '{"fill": "#60A5FA", "opacity": 0.4, "stroke": "#60A5FA", "strokeWidth": 2, "name": "Vardagsrum"}'::jsonb);

  -- Room 1: Sovrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Sovrum', 'Sovrum med fondvägg som ska tapetseras.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, view_mode, coordinates, properties)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room', 'floorplan',
    '{"points": [{"x": 5200, "y": 2500}, {"x": 8200, "y": 2500}, {"x": 8200, "y": 6500}, {"x": 5200, "y": 6500}]}'::jsonb,
    '{"fill": "#A78BFA", "opacity": 0.4, "stroke": "#A78BFA", "strokeWidth": 2, "name": "Sovrum"}'::jsonb);

  -- Room 2: Kök
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Kök', 'Kök med nya bänkskivor och stänkskydd.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, view_mode, coordinates, properties)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room', 'floorplan',
    '{"points": [{"x": 0, "y": 0}, {"x": 4000, "y": 0}, {"x": 4000, "y": 2000}, {"x": 0, "y": 2000}]}'::jsonb,
    '{"fill": "#34D399", "opacity": 0.4, "stroke": "#34D399", "strokeWidth": 2, "name": "Kök"}'::jsonb);

  -- Room 3: Badrum
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Badrum', 'Badrum med nya kakel och klinker.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, view_mode, coordinates, properties)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room', 'floorplan',
    '{"points": [{"x": 4200, "y": 0}, {"x": 6200, "y": 0}, {"x": 6200, "y": 2000}, {"x": 4200, "y": 2000}]}'::jsonb,
    '{"fill": "#38BDF8", "opacity": 0.4, "stroke": "#38BDF8", "strokeWidth": 2, "name": "Badrum"}'::jsonb);

  -- Room 4: Hall
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id, 'Hall', 'Entréhall med plats för förvaring.', 'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, view_mode, coordinates, properties)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room', 'floorplan',
    '{"points": [{"x": 0, "y": 2200}, {"x": 5000, "y": 2200}, {"x": 5000, "y": 3300}, {"x": 0, "y": 3300}]}'::jsonb,
    '{"fill": "#FBBF24", "opacity": 0.4, "stroke": "#FBBF24", "strokeWidth": 2, "name": "Hall"}'::jsonb);

  -- Create tasks with dates relative to today
  -- Task 0: Förberedelse (completed)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Förberedelse och skydd', 'Täck golv, flytta möbler, tejpa fönster och lister.', 'completed', 'high', 'preparation', 3000, v_today - 21, v_today - 19, 100, p_owner_id);

  -- Task 1: Spackling (completed)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Spackling av väggar', 'Spackla sprickor och ojämnheter i vardagsrummet.', 'completed', 'high', 'walls', 8000, v_today - 19, v_today - 16, 100, p_owner_id);

  -- Task 2: Målning vardagsrum (completed)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Målning väggar & tak', 'Måla väggar och tak i vardagsrummet. Kulör: NCS S 0502-Y.', 'completed', 'medium', 'painting', 12000, v_today - 16, v_today - 13, 100, p_owner_id);

  -- Task 3: Tapetsering sovrum (in_progress - current work!)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[2], 'Tapetsering fondvägg', 'Tapetsera fondvägg i sovrummet med mönstrad tapet.', 'in_progress', 'medium', 'walls', 6000, v_today - 3, v_today + 1, 60, p_owner_id);

  -- Task 4: Golvslipning (to_do, upcoming)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1], 'Slipning och lackning av golv', 'Slipa och lacka parkettgolv i vardagsrum och hall.', 'to_do', 'high', 'flooring', 18000, v_today + 2, v_today + 6, 0, p_owner_id);

  -- Task 5: Köksbänk och stänkskydd (to_do)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3], 'Bänkskiva och stänkskydd', 'Montera ny bänkskiva och kakel som stänkskydd.', 'to_do', 'medium', 'kitchen', 25000, v_today + 7, v_today + 10, 0, p_owner_id);

  -- Task 6: Badrumskakel (to_do)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[4], 'Kakelsättning badrum', 'Sätt nytt kakel på väggar och klinker på golv i badrummet.', 'to_do', 'high', 'bathroom', 35000, v_today + 10, v_today + 15, 0, p_owner_id);

  -- Task 7: Lister (to_do)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Montering av lister', 'Montera golv- och taklister i hela lägenheten.', 'to_do', 'low', 'finishing', 8000, v_today + 16, v_today + 18, 0, p_owner_id);

  -- Task 8: El-arbete (to_do)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3], 'Eluttag och belysning', 'Installera nya eluttag och LED-spots i köket.', 'to_do', 'medium', 'electrical', 15000, v_today + 5, v_today + 7, 0, p_owner_id);

  -- Task 9: Slutstädning (to_do)
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, progress, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL, 'Slutstädning', 'Professionell städning efter renoveringen.', 'to_do', 'low', 'other', 4000, v_today + 19, v_today + 20, 0, p_owner_id);

  -- Create materials (same as before)
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[2], 'Spackel fin (Gyproc)', 5, 'st', 350, 'Byggmax', 'paid', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3], 'Väggfärg Beckers Scotte 7', 25, 'liter', 85, 'Colorama', 'paid', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3], 'Takfärg Beckers Takfärg', 10, 'liter', 95, 'Colorama', 'paid', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[2], v_task_ids[4], 'Tapet Boråstapeter Linen', 6, 'rullar', 890, 'Boråstapeter', 'approved', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[5], 'Golvlack Bona Traffic HD', 5, 'liter', 520, 'Bona', 'approved', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6], 'Bänkskiva IKEA Ekbacken', 1, 'st', 8500, 'IKEA', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6], 'Kakel stänkskydd vit 10x20', 2, 'kvm', 650, 'Kakel Direkt', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7], 'Kakel vägg vit blank 20x25', 12, 'kvm', 490, 'Bauhaus', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7], 'Fogmassa grå', 8, 'kg', 65, 'Bauhaus', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, NULL, v_task_ids[8], 'Golvlist vitmålad 12x56mm', 45, 'meter', 89, 'Byggmax', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[8], 'Taklist klassisk 45mm', 25, 'meter', 125, 'Byggmax', 'submitted', p_owner_id);

  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[9], 'LED-spots inbyggnad 6W', 6, 'st', 299, 'Elgiganten', 'submitted', p_owner_id);

  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION seed_demo_project_for_user IS 'Seeds a demo project for a user. If demo project already exists, refreshes task dates to be relative to today. Only affects demo projects.';
