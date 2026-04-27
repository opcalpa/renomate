-- Fix demo project: name, budget, address, dates, material statuses
-- Applies to both public demo (00000000-...-000000000001) and personal demo projects
-- REVERT: No destructive changes — safe to re-run

DO $$
DECLARE
  v_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Skip if public demo doesn't exist
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = v_demo_id) THEN
    RAISE NOTICE 'Public demo project not found, skipping';
    RETURN;
  END IF;

  -- 1. Fix project name, status, budget, and address
  UPDATE projects SET
    name = 'Renovering Vasastan 3:a',
    status = 'active',
    total_budget = 134000,
    address = 'Odengatan 45',
    city = 'Stockholm',
    postal_code = '113 51',
    country = 'SE'
  WHERE id = v_demo_id;

  -- 2. Refresh task dates relative to today
  UPDATE tasks SET
    start_date = v_today - 21,
    finish_date = v_today - 19
  WHERE project_id = v_demo_id AND title ILIKE 'Förberedelse%';

  UPDATE tasks SET
    start_date = v_today - 19,
    finish_date = v_today - 16
  WHERE project_id = v_demo_id AND title ILIKE 'Spackling%';

  UPDATE tasks SET
    start_date = v_today - 16,
    finish_date = v_today - 13
  WHERE project_id = v_demo_id AND title ILIKE 'Målning%';

  UPDATE tasks SET
    start_date = v_today - 5,
    finish_date = v_today - 1
  WHERE project_id = v_demo_id AND title ILIKE 'Tapetsering%';

  UPDATE tasks SET
    start_date = v_today + 2,
    finish_date = v_today + 6
  WHERE project_id = v_demo_id AND title ILIKE 'Slipning%';

  UPDATE tasks SET
    start_date = v_today + 7,
    finish_date = v_today + 10
  WHERE project_id = v_demo_id AND title ILIKE 'Bänkskiva%';

  UPDATE tasks SET
    start_date = v_today + 10,
    finish_date = v_today + 15
  WHERE project_id = v_demo_id AND title ILIKE 'Kakelsättning%';

  UPDATE tasks SET
    start_date = v_today + 16,
    finish_date = v_today + 18
  WHERE project_id = v_demo_id AND title ILIKE 'Montering av lister%';

  UPDATE tasks SET
    start_date = v_today + 5,
    finish_date = v_today + 7
  WHERE project_id = v_demo_id AND title ILIKE 'Eluttag%';

  UPDATE tasks SET
    start_date = v_today + 19,
    finish_date = v_today + 20
  WHERE project_id = v_demo_id AND title ILIKE 'Slutstädning%';

  -- 3. Set material statuses (matching the enrichment migration pattern)
  -- Completed tasks → materials paid
  UPDATE materials SET status = 'paid'
  WHERE project_id = v_demo_id
    AND task_id IN (SELECT id FROM tasks WHERE project_id = v_demo_id AND status = 'completed');

  -- In-progress tasks → materials approved
  UPDATE materials SET status = 'approved'
  WHERE project_id = v_demo_id
    AND task_id IN (SELECT id FROM tasks WHERE project_id = v_demo_id AND status = 'in_progress');

  -- Future tasks → materials to_order
  UPDATE materials SET status = 'to_order'
  WHERE project_id = v_demo_id
    AND task_id IN (SELECT id FROM tasks WHERE project_id = v_demo_id AND status = 'to_do');

  RAISE NOTICE 'Public demo project fixed: name, budget, address, dates, material statuses';
END;
$$;

-- Also update the seed function to include these fields for NEW personal demo projects
CREATE OR REPLACE FUNCTION seed_demo_project_for_user(p_owner_id UUID, p_language TEXT DEFAULT 'sv')
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
  v_is_en BOOLEAN := (p_language = 'en');
BEGIN
  -- Check if user already has a demo project
  SELECT id INTO v_project_id
  FROM projects
  WHERE owner_id = p_owner_id AND project_type = 'demo_project'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    RETURN v_project_id;
  END IF;

  v_project_id := gen_random_uuid();

  INSERT INTO projects (id, name, description, owner_id, status, project_type, total_budget, address, city, postal_code, country)
  VALUES (
    v_project_id,
    CASE WHEN v_is_en THEN 'Demo: 3-room Apartment Renovation' ELSE 'Renovering Vasastan 3:a' END,
    CASE WHEN v_is_en THEN 'A demo project showcasing Renofine features. Surface renovation of a 3-room apartment in Stockholm.' ELSE 'Ytskiktsrenovering av 3-rumslägenhet i Vasastan, Stockholm. Ca 52 kvm.' END,
    p_owner_id,
    'active',
    'demo_project',
    134000,
    'Odengatan 45',
    'Stockholm',
    '113 51',
    'SE'
  );

  -- Create rooms (same as before)
  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id,
    CASE WHEN v_is_en THEN 'Living Room' ELSE 'Vardagsrum' END,
    CASE WHEN v_is_en THEN 'Large living room with parquet flooring' ELSE 'Stort vardagsrum med parkettgolv' END,
    'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    jsonb_build_object(
      'points', '[{"x":0,"y":3500},{"x":5000,"y":3500},{"x":5000,"y":7500},{"x":0,"y":7500}]'::jsonb,
      'coordinates', '[{"x":0,"y":3500},{"x":5000,"y":3500},{"x":5000,"y":7500},{"x":0,"y":7500}]'::jsonb,
      'fillColor', '#60A5FA', 'strokeColor', '#60A5FA',
      'name', CASE WHEN v_is_en THEN 'Living Room' ELSE 'Vardagsrum' END
    ));

  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id,
    CASE WHEN v_is_en THEN 'Bedroom' ELSE 'Sovrum' END,
    CASE WHEN v_is_en THEN 'Bedroom with feature wall' ELSE 'Sovrum med fondvägg' END,
    'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    jsonb_build_object(
      'points', '[{"x":5200,"y":2500},{"x":8200,"y":2500},{"x":8200,"y":6500},{"x":5200,"y":6500}]'::jsonb,
      'coordinates', '[{"x":5200,"y":2500},{"x":8200,"y":2500},{"x":8200,"y":6500},{"x":5200,"y":6500}]'::jsonb,
      'fillColor', '#A78BFA', 'strokeColor', '#A78BFA',
      'name', CASE WHEN v_is_en THEN 'Bedroom' ELSE 'Sovrum' END
    ));

  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id,
    CASE WHEN v_is_en THEN 'Kitchen' ELSE 'Kök' END,
    CASE WHEN v_is_en THEN 'Kitchen with new countertops' ELSE 'Kök med nya bänkskivor' END,
    'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    jsonb_build_object(
      'points', '[{"x":0,"y":0},{"x":4000,"y":0},{"x":4000,"y":2000},{"x":0,"y":2000}]'::jsonb,
      'coordinates', '[{"x":0,"y":0},{"x":4000,"y":0},{"x":4000,"y":2000},{"x":0,"y":2000}]'::jsonb,
      'fillColor', '#34D399', 'strokeColor', '#34D399',
      'name', CASE WHEN v_is_en THEN 'Kitchen' ELSE 'Kök' END
    ));

  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id,
    CASE WHEN v_is_en THEN 'Bathroom' ELSE 'Badrum' END,
    CASE WHEN v_is_en THEN 'Bathroom with tiles' ELSE 'Badrum med kakel' END,
    'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    jsonb_build_object(
      'points', '[{"x":4200,"y":0},{"x":6200,"y":0},{"x":6200,"y":2000},{"x":4200,"y":2000}]'::jsonb,
      'coordinates', '[{"x":4200,"y":0},{"x":6200,"y":0},{"x":6200,"y":2000},{"x":4200,"y":2000}]'::jsonb,
      'fillColor', '#38BDF8', 'strokeColor', '#38BDF8',
      'name', CASE WHEN v_is_en THEN 'Bathroom' ELSE 'Badrum' END
    ));

  v_room_id := gen_random_uuid();
  v_room_ids := array_append(v_room_ids, v_room_id);
  INSERT INTO rooms (id, project_id, name, description, status, ceiling_height_mm)
  VALUES (v_room_id, v_project_id,
    CASE WHEN v_is_en THEN 'Hallway' ELSE 'Hall' END,
    CASE WHEN v_is_en THEN 'Entry hallway' ELSE 'Entréhall' END,
    'to_be_renovated', 2600);

  INSERT INTO floor_map_shapes (id, project_id, room_id, shape_type, shape_data)
  VALUES (gen_random_uuid(), v_project_id, v_room_id, 'room',
    jsonb_build_object(
      'points', '[{"x":0,"y":2200},{"x":5000,"y":2200},{"x":5000,"y":3300},{"x":0,"y":3300}]'::jsonb,
      'coordinates', '[{"x":0,"y":2200},{"x":5000,"y":2200},{"x":5000,"y":3300},{"x":0,"y":3300}]'::jsonb,
      'fillColor', '#FBBF24', 'strokeColor', '#FBBF24',
      'name', CASE WHEN v_is_en THEN 'Hallway' ELSE 'Hall' END
    ));

  -- Create tasks with dynamic dates
  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL,
    CASE WHEN v_is_en THEN 'Preparation and protection' ELSE 'Förberedelse och skydd' END,
    CASE WHEN v_is_en THEN 'Cover floors, move furniture, tape windows and trim.' ELSE 'Täck golv, flytta möbler, tejpa fönster och lister.' END,
    'completed', 'high', 'preparation', 3000, v_today - 21, v_today - 19, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1],
    CASE WHEN v_is_en THEN 'Wall spackling' ELSE 'Spackling av väggar' END,
    CASE WHEN v_is_en THEN 'Fill cracks and imperfections in the living room.' ELSE 'Spackla sprickor och ojämnheter i vardagsrummet.' END,
    'completed', 'high', 'walls', 8000, v_today - 19, v_today - 16, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1],
    CASE WHEN v_is_en THEN 'Wall & ceiling painting' ELSE 'Målning väggar & tak' END,
    CASE WHEN v_is_en THEN 'Paint walls and ceiling in the living room. Color: NCS S 0502-Y.' ELSE 'Måla väggar och tak i vardagsrummet. Kulör: NCS S 0502-Y.' END,
    'completed', 'medium', 'painting', 12000, v_today - 16, v_today - 13, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[2],
    CASE WHEN v_is_en THEN 'Feature wall wallpapering' ELSE 'Tapetsering fondvägg' END,
    CASE WHEN v_is_en THEN 'Wallpaper the feature wall in the bedroom.' ELSE 'Tapetsera fondvägg i sovrummet med mönstrad tapet.' END,
    'in_progress', 'medium', 'walls', 6000, v_today - 5, v_today + 1, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[1],
    CASE WHEN v_is_en THEN 'Floor sanding and lacquering' ELSE 'Slipning och lackning av golv' END,
    CASE WHEN v_is_en THEN 'Sand and lacquer parquet flooring.' ELSE 'Slipa och lacka parkettgolv i vardagsrum och hall.' END,
    'to_do', 'high', 'flooring', 18000, v_today + 2, v_today + 6, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3],
    CASE WHEN v_is_en THEN 'Countertop and backsplash' ELSE 'Bänkskiva och stänkskydd' END,
    CASE WHEN v_is_en THEN 'Install new countertop and tile backsplash.' ELSE 'Montera ny bänkskiva och kakel som stänkskydd.' END,
    'to_do', 'medium', 'kitchen', 25000, v_today + 7, v_today + 10, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[4],
    CASE WHEN v_is_en THEN 'Bathroom tiling' ELSE 'Kakelsättning badrum' END,
    CASE WHEN v_is_en THEN 'Install new wall tiles and floor tiles.' ELSE 'Sätt nytt kakel på väggar och klinker på golv i badrummet.' END,
    'to_do', 'high', 'bathroom', 35000, v_today + 10, v_today + 15, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL,
    CASE WHEN v_is_en THEN 'Install trim and moldings' ELSE 'Montering av lister' END,
    CASE WHEN v_is_en THEN 'Install floor and ceiling trim.' ELSE 'Montera golv- och taklister i hela lägenheten.' END,
    'to_do', 'low', 'finishing', 8000, v_today + 16, v_today + 18, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, v_room_ids[3],
    CASE WHEN v_is_en THEN 'Outlets and lighting' ELSE 'Eluttag och belysning' END,
    CASE WHEN v_is_en THEN 'Install new outlets and LED spotlights.' ELSE 'Installera nya eluttag och LED-spots i köket.' END,
    'to_do', 'medium', 'electrical', 15000, v_today + 5, v_today + 7, p_owner_id);

  v_task_id := gen_random_uuid();
  v_task_ids := array_append(v_task_ids, v_task_id);
  INSERT INTO tasks (id, project_id, room_id, title, description, status, priority, cost_center, budget, start_date, finish_date, created_by_user_id)
  VALUES (v_task_id, v_project_id, NULL,
    CASE WHEN v_is_en THEN 'Final cleaning' ELSE 'Slutstädning' END,
    CASE WHEN v_is_en THEN 'Professional cleaning after the renovation.' ELSE 'Professionell städning efter renoveringen.' END,
    'to_do', 'low', 'other', 4000, v_today + 19, v_today + 20, p_owner_id);

  -- Create materials with statuses
  INSERT INTO materials (id, project_id, room_id, task_id, name, quantity, unit, price_per_unit, vendor_name, status, created_by_user_id)
  VALUES
    (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[2],
      CASE WHEN v_is_en THEN 'Fine filler (Gyproc)' ELSE 'Spackel fin (Gyproc)' END,
      5, CASE WHEN v_is_en THEN 'pcs' ELSE 'st' END, 350, 'Byggmax', 'paid', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3],
      CASE WHEN v_is_en THEN 'Wall paint Beckers Scotte 7' ELSE 'Väggfärg Beckers Scotte 7' END,
      25, CASE WHEN v_is_en THEN 'liters' ELSE 'liter' END, 85, 'Colorama', 'paid', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[3],
      CASE WHEN v_is_en THEN 'Ceiling paint Beckers' ELSE 'Takfärg Beckers Takfärg' END,
      10, CASE WHEN v_is_en THEN 'liters' ELSE 'liter' END, 95, 'Colorama', 'paid', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[2], v_task_ids[4],
      CASE WHEN v_is_en THEN 'Wallpaper Boråstapeter Linen' ELSE 'Tapet Boråstapeter Linen' END,
      6, CASE WHEN v_is_en THEN 'rolls' ELSE 'rullar' END, 890, 'Boråstapeter', 'approved', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[1], v_task_ids[5],
      CASE WHEN v_is_en THEN 'Floor lacquer Bona Traffic HD' ELSE 'Golvlack Bona Traffic HD' END,
      5, CASE WHEN v_is_en THEN 'liters' ELSE 'liter' END, 520, 'Bona', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6],
      CASE WHEN v_is_en THEN 'Countertop IKEA Ekbacken' ELSE 'Bänkskiva IKEA Ekbacken' END,
      1, 'st', 8500, 'IKEA', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[6],
      CASE WHEN v_is_en THEN 'Backsplash tile white 10x20' ELSE 'Kakel stänkskydd vit 10x20' END,
      2, CASE WHEN v_is_en THEN 'sqm' ELSE 'kvm' END, 650, 'Kakel Direkt', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7],
      CASE WHEN v_is_en THEN 'Wall tile white 20x25' ELSE 'Kakel vägg vit blank 20x25' END,
      12, CASE WHEN v_is_en THEN 'sqm' ELSE 'kvm' END, 490, 'Bauhaus', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[4], v_task_ids[7],
      CASE WHEN v_is_en THEN 'Grey grout' ELSE 'Fogmassa grå' END,
      8, 'kg', 65, 'Bauhaus', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, NULL, v_task_ids[8],
      CASE WHEN v_is_en THEN 'Floor trim white 12x56mm' ELSE 'Golvlist vitmålad 12x56mm' END,
      45, CASE WHEN v_is_en THEN 'meters' ELSE 'meter' END, 89, 'Byggmax', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, NULL, v_task_ids[8],
      CASE WHEN v_is_en THEN 'Ceiling trim classic 45mm' ELSE 'Taklist klassisk 45mm' END,
      25, CASE WHEN v_is_en THEN 'meters' ELSE 'meter' END, 125, 'Byggmax', 'to_order', p_owner_id),
    (gen_random_uuid(), v_project_id, v_room_ids[3], v_task_ids[9],
      CASE WHEN v_is_en THEN 'LED spots recessed 6W' ELSE 'LED-spots inbyggnad 6W' END,
      6, 'st', 299, 'Elgiganten', 'to_order', p_owner_id);

  RETURN v_project_id;
END;
$$;
