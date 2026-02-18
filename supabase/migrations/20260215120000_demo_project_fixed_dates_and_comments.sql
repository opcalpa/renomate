-- Public Demo Project: Fixed dates and realistic comments
-- This migration updates the demo project with:
-- 1. Fixed dates (not relative to CURRENT_DATE) so timeline always looks consistent
-- 2. author_display_name column on comments for demo authors
-- 3. Comments with realistic Swedish names
-- 4. Activity log entries

-- ============================================================
-- ADD author_display_name COLUMN TO COMMENTS
-- This allows showing fake author names for demo content
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'author_display_name'
  ) THEN
    ALTER TABLE comments ADD COLUMN author_display_name TEXT;
    COMMENT ON COLUMN comments.author_display_name IS 'Optional display name override for demo comments';
  END IF;
END $$;

-- ============================================================
-- MAIN MIGRATION
-- ============================================================
DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_system_admin_profile_id UUID;
  v_task_id UUID;
  v_room_id UUID;

  -- Fixed dates for the project timeline (Feb 1 - Feb 21, 2026)
  v_project_start DATE := '2026-02-01';
  v_project_end DATE := '2026-02-21';
BEGIN
  -- Get the system admin profile
  SELECT p.id INTO v_system_admin_profile_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'carl.palmquist@gmail.com'
  LIMIT 1;

  -- If no system admin found, try to get any profile (demo will still work)
  IF v_system_admin_profile_id IS NULL THEN
    SELECT id INTO v_system_admin_profile_id FROM profiles LIMIT 1;
  END IF;

  -- Exit if no profiles exist
  IF v_system_admin_profile_id IS NULL THEN
    RAISE NOTICE 'No profiles found, skipping demo content creation';
    RETURN;
  END IF;

  -- ============================================================
  -- DELETE EXISTING COMMENTS AND ACTIVITY LOG FOR DEMO PROJECT
  -- ============================================================
  DELETE FROM comments WHERE project_id = v_public_demo_id;
  DELETE FROM activity_log WHERE project_id = v_public_demo_id;

  -- ============================================================
  -- UPDATE TASK DATES TO FIXED VALUES
  -- ============================================================

  -- Task: Förberedelse (Feb 1-3, completed)
  UPDATE tasks SET
    start_date = '2026-02-01',
    finish_date = '2026-02-03',
    progress = 100,
    status = 'completed'
  WHERE project_id = v_public_demo_id AND title ILIKE '%Förberedelse%';

  -- Task: Spackling (Feb 3-6, completed)
  UPDATE tasks SET
    start_date = '2026-02-03',
    finish_date = '2026-02-06',
    progress = 100,
    status = 'completed'
  WHERE project_id = v_public_demo_id AND title ILIKE '%Spackling%';

  -- Task: Målning (Feb 6-9, completed)
  UPDATE tasks SET
    start_date = '2026-02-06',
    finish_date = '2026-02-09',
    progress = 100,
    status = 'completed'
  WHERE project_id = v_public_demo_id AND title ILIKE '%Målning%';

  -- Task: Tapetsering (Feb 12-14, in_progress 60%)
  UPDATE tasks SET
    start_date = '2026-02-12',
    finish_date = '2026-02-14',
    progress = 60,
    status = 'in_progress'
  WHERE project_id = v_public_demo_id AND title ILIKE '%Tapetsering%';

  -- Task: Golvslipning (Feb 16-19, to_do)
  UPDATE tasks SET
    start_date = '2026-02-16',
    finish_date = '2026-02-19',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND (title ILIKE '%Slipning%' OR title ILIKE '%lackning%golv%');

  -- Task: Köksbänk (Feb 18-20, to_do)
  UPDATE tasks SET
    start_date = '2026-02-18',
    finish_date = '2026-02-20',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND (title ILIKE '%Bänkskiva%' OR title ILIKE '%kök%stänkskydd%');

  -- Task: Badrumskakel (Feb 19-21, to_do)
  UPDATE tasks SET
    start_date = '2026-02-19',
    finish_date = '2026-02-21',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND (title ILIKE '%Kakelsättning%' OR title ILIKE '%kakel%badrum%');

  -- Task: Lister (Feb 20-21, to_do)
  UPDATE tasks SET
    start_date = '2026-02-20',
    finish_date = '2026-02-21',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND title ILIKE '%lister%';

  -- Task: El-arbete (Feb 17-18, to_do)
  UPDATE tasks SET
    start_date = '2026-02-17',
    finish_date = '2026-02-18',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND (title ILIKE '%Eluttag%' OR title ILIKE '%belysning%');

  -- Task: Slutstädning (Feb 21, to_do)
  UPDATE tasks SET
    start_date = '2026-02-21',
    finish_date = '2026-02-21',
    progress = 0,
    status = 'to_do'
  WHERE project_id = v_public_demo_id AND title ILIKE '%Slutstädning%';

  -- ============================================================
  -- ADD COMMENTS WITH DEMO AUTHOR NAMES
  -- Using author_display_name to show realistic names
  -- ============================================================

  -- Comments on Förberedelse task
  SELECT id INTO v_task_id FROM tasks
  WHERE project_id = v_public_demo_id AND title ILIKE '%Förberedelse%' LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Erik Johansson', 'Golven täckta med byggplast. Möblerna flyttade till förrådet.', '2026-02-01 09:15:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Anna Lindström', 'Perfekt! Glöm inte att tejpa runt fönsterkarmar också.', '2026-02-01 10:30:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Erik Johansson', 'Noterat, gör det imorgon bitti.', '2026-02-01 11:45:00+01');
  END IF;

  -- Comments on Spackling task
  SELECT id INTO v_task_id FROM tasks
  WHERE project_id = v_public_demo_id AND title ILIKE '%Spackling%' LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Johan Målare AB', 'Hittade en större spricka bakom bokhyllan. Behöver extra spackel.', '2026-02-04 08:20:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Anna Lindström', 'Ok, beställ det som behövs. Går det att hinna klart ändå?', '2026-02-04 09:05:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Johan Målare AB', 'Ja absolut, klar som planerat. Spacklet torkar över natten.', '2026-02-04 14:30:00+01');
  END IF;

  -- Comments on Målning task
  SELECT id INTO v_task_id FROM tasks
  WHERE project_id = v_public_demo_id AND title ILIKE '%Målning%' LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Maria Svensson', 'Kulören NCS S 0502-Y ser fantastisk ut! Precis rätt nyans.', '2026-02-07 11:00:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Johan Målare AB', 'Tack! Första strykningen klar. Andra strykningen imorgon.', '2026-02-07 16:45:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Anna Lindström', 'Så fint det blev! Verkligen nöjd med valet.', '2026-02-09 10:00:00+01');
  END IF;

  -- Comments on Tapetsering task
  SELECT id INTO v_task_id FROM tasks
  WHERE project_id = v_public_demo_id AND title ILIKE '%Tapetsering%' LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Maria Svensson', 'Börjar med fondväggen idag. Mönstret kräver noggrann mönsterpassning.', '2026-02-12 08:00:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Anna Lindström', 'Vad spännande! Kan du skicka en bild när första våden är uppe?', '2026-02-12 09:30:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Maria Svensson', 'Självklart! Första halvan klar nu, ser fantastiskt ut. 🎨', '2026-02-13 14:00:00+01');
  END IF;

  -- Comments on Golvslipning task
  SELECT id INTO v_task_id FROM tasks
  WHERE project_id = v_public_demo_id AND (title ILIKE '%Slipning%' OR title ILIKE '%lackning%') LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Erik Johansson', 'Golvsliparen är bokad. Kommer 16 februari kl 08:00.', '2026-02-10 14:00:00+01'),
      (v_public_demo_id, 'task', v_task_id, v_system_admin_profile_id, 'Anna Lindström', 'Toppen! Då behöver vi ha möblerna ur vägen dagen innan.', '2026-02-10 15:30:00+01');
  END IF;

  -- Comments on rooms
  -- Vardagsrum
  SELECT id INTO v_room_id FROM rooms
  WHERE project_id = v_public_demo_id AND name = 'Vardagsrum' LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Maria Svensson', 'Tänker vi behålla taklisten eller byta ut den också?', '2026-02-05 13:00:00+01'),
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Anna Lindström', 'Vi byter till ny klassisk list, samma som i hallen.', '2026-02-05 14:20:00+01');
  END IF;

  -- Kök
  SELECT id INTO v_room_id FROM rooms
  WHERE project_id = v_public_demo_id AND name = 'Kök' LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Erik Johansson', 'Måtten för bänkskivan stämmer. IKEA levererar 17 februari.', '2026-02-10 10:00:00+01'),
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Anna Lindström', 'Toppen! Då hinner vi montera innan golvet.', '2026-02-10 11:15:00+01');
  END IF;

  -- Sovrum
  SELECT id INTO v_room_id FROM rooms
  WHERE project_id = v_public_demo_id AND name = 'Sovrum' LIMIT 1;

  IF v_room_id IS NOT NULL THEN
    INSERT INTO comments (project_id, entity_type, entity_id, created_by_user_id, author_display_name, content, created_at)
    VALUES
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Maria Svensson', 'Tapeten jag valde är Boråstapeter Linen. Kommer i grå/blå nyans.', '2026-02-08 09:00:00+01'),
      (v_public_demo_id, 'room', v_room_id, v_system_admin_profile_id, 'Anna Lindström', 'Perfekt val! Det kommer bli så fint mot det ljusa golvet.', '2026-02-08 10:15:00+01');
  END IF;

  -- ============================================================
  -- ADD ACTIVITY LOG ENTRIES
  -- Using correct column names: actor_id, entity_type, entity_name (not profile_id, description)
  -- ============================================================
  INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_name, created_at)
  VALUES
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'project', 'Lägenhet Vasastan', '2026-01-28 14:00:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'room', 'Vardagsrum', '2026-01-28 14:15:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'room', 'Sovrum', '2026-01-28 14:20:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'room', 'Kök', '2026-01-28 14:25:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'room', 'Badrum', '2026-01-28 14:30:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'task', 'Förberedelse och skydd', '2026-01-29 09:00:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'status_changed', 'task', 'Förberedelse och skydd', '2026-02-03 16:00:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'status_changed', 'task', 'Spackling av väggar', '2026-02-06 15:30:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'material', 'Väggfärg Beckers Scotte 7', '2026-02-06 08:00:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'status_changed', 'task', 'Målning väggar & tak', '2026-02-09 17:00:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'status_changed', 'task', 'Tapetsering fondvägg', '2026-02-12 08:30:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'comment', 'Tapetsering fondvägg', '2026-02-13 14:05:00+01'),
    (v_public_demo_id, v_system_admin_profile_id, 'created', 'material', 'Bänkskiva IKEA Ekbacken', '2026-02-10 09:00:00+01');

  -- Note: Project-level dates are not used - dates come from tasks
  -- The timeline view calculates dates from the task start/finish dates

END $$;
