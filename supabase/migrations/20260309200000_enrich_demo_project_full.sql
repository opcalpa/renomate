-- Enrich public demo project with realistic data across ALL features
-- Makes every tab and column show meaningful content for demo visitors
--
-- Updates: task estimation, progress, checklists, payment status,
--          material statuses/costs, room dimensions, comments, task dependencies
--
-- NOTE: Task assignment (assigned_to_stakeholder_id) requires profiles FK.
-- Demo team members are project_shares with NULL shared_with_user_id, so they
-- don't have profile entries. Assignment is skipped here — would need profile
-- creation for fake users to work.

DO $$
DECLARE
  v_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_owner_id UUID;
  -- Task IDs (looked up by title)
  t_forberedelse UUID;
  t_spackling UUID;
  t_malning UUID;
  t_tapetsering UUID;
  t_golv UUID;
  t_kok UUID;
  t_badrum UUID;
  t_lister UUID;
  t_el UUID;
  t_stad UUID;
  -- Room IDs (looked up by name)
  r_vardagsrum UUID;
  r_sovrum UUID;
  r_kok UUID;
  r_badrum UUID;
  r_hall UUID;
BEGIN
  -- Get project owner
  SELECT owner_id INTO v_owner_id FROM projects WHERE id = v_demo_id;
  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'Demo project not found, skipping enrichment';
    RETURN;
  END IF;

  -- ============================================================
  -- Look up task IDs by title
  -- ============================================================
  SELECT id INTO t_forberedelse FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Förberedelse%' LIMIT 1;
  SELECT id INTO t_spackling    FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Spackling%' LIMIT 1;
  SELECT id INTO t_malning      FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Målning%' LIMIT 1;
  SELECT id INTO t_tapetsering  FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Tapetsering%' LIMIT 1;
  SELECT id INTO t_golv         FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Slipning%' LIMIT 1;
  SELECT id INTO t_kok          FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Bänkskiva%' LIMIT 1;
  SELECT id INTO t_badrum       FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Kakelsättning%' LIMIT 1;
  SELECT id INTO t_lister       FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Montering av lister%' LIMIT 1;
  SELECT id INTO t_el           FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Eluttag%' LIMIT 1;
  SELECT id INTO t_stad         FROM tasks WHERE project_id = v_demo_id AND title ILIKE 'Slutstädning%' LIMIT 1;

  -- ============================================================
  -- Look up room IDs by name
  -- ============================================================
  SELECT id INTO r_vardagsrum FROM rooms WHERE project_id = v_demo_id AND name = 'Vardagsrum' LIMIT 1;
  SELECT id INTO r_sovrum     FROM rooms WHERE project_id = v_demo_id AND name = 'Sovrum' LIMIT 1;
  SELECT id INTO r_kok        FROM rooms WHERE project_id = v_demo_id AND name = 'Kök' LIMIT 1;
  SELECT id INTO r_badrum     FROM rooms WHERE project_id = v_demo_id AND name = 'Badrum' LIMIT 1;
  SELECT id INTO r_hall       FROM rooms WHERE project_id = v_demo_id AND name = 'Hall' LIMIT 1;

  -- ============================================================
  -- 1. TASK ESTIMATION, PROGRESS, PAYMENT & CHECKLISTS
  -- ============================================================

  -- Förberedelse — own labor, completed, paid
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 6,
    hourly_rate = 380,
    material_estimate = 800,
    progress = 100,
    payment_status = 'paid',
    paid_amount = 3000,
    checklists = '[
      {"id":"cl-1","title":"Förberedelser","items":[
        {"id":"ci-1a","title":"Täck golv med byggplast","completed":true},
        {"id":"ci-1b","title":"Flytta möbler till mitten","completed":true},
        {"id":"ci-1c","title":"Tejpa fönster och lister","completed":true},
        {"id":"ci-1d","title":"Skydda köksbänk","completed":true}
      ]}
    ]'::jsonb
  WHERE id = t_forberedelse;

  -- Spackling — own labor, completed, paid
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 16,
    hourly_rate = 420,
    material_estimate = 1750,
    progress = 100,
    payment_status = 'paid',
    paid_amount = 8000,
    checklists = '[
      {"id":"cl-2","title":"Spackla väggar","items":[
        {"id":"ci-2a","title":"Rengör och grundbehandla ytor","completed":true},
        {"id":"ci-2b","title":"Första lagret spackel","completed":true},
        {"id":"ci-2c","title":"Slipa första lagret","completed":true},
        {"id":"ci-2d","title":"Andra lagret spackel","completed":true},
        {"id":"ci-2e","title":"Finslipning","completed":true}
      ]}
    ]'::jsonb
  WHERE id = t_spackling;

  -- Målning — own labor, completed, paid
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 20,
    hourly_rate = 450,
    material_estimate = 3075,
    progress = 100,
    payment_status = 'paid',
    paid_amount = 12000,
    checklists = '[
      {"id":"cl-3","title":"Målning","items":[
        {"id":"ci-3a","title":"Grundmåla tak","completed":true},
        {"id":"ci-3b","title":"Två lager takfärg","completed":true},
        {"id":"ci-3c","title":"Grundmåla väggar","completed":true},
        {"id":"ci-3d","title":"Två lager väggfärg NCS 0502-Y","completed":true},
        {"id":"ci-3e","title":"Detaljkontroll och rättning","completed":true}
      ]}
    ]'::jsonb
  WHERE id = t_malning;

  -- Tapetsering — own labor, in_progress, partially paid
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 10,
    hourly_rate = 480,
    material_estimate = 5340,
    progress = 65,
    payment_status = 'partially_paid',
    paid_amount = 3000,
    checklists = '[
      {"id":"cl-4","title":"Tapetsering fondvägg","items":[
        {"id":"ci-4a","title":"Slipa och grundbehandla fondvägg","completed":true},
        {"id":"ci-4b","title":"Limma och montera tapet","completed":true},
        {"id":"ci-4c","title":"Skarva och passa mönster","completed":false},
        {"id":"ci-4d","title":"Slutkontroll skarvar","completed":false}
      ]}
    ]'::jsonb
  WHERE id = t_tapetsering;

  -- Golvslipning — own labor, to_do
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 24,
    hourly_rate = 490,
    material_estimate = 2600,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_golv;

  -- Köksbänk — subcontractor, to_do
  UPDATE tasks SET
    task_cost_type = 'subcontractor',
    subcontractor_cost = 18500,
    markup_percent = 15,
    material_estimate = 9800,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_kok;

  -- Badrumskakel — subcontractor, to_do
  UPDATE tasks SET
    task_cost_type = 'subcontractor',
    subcontractor_cost = 22000,
    markup_percent = 12,
    material_estimate = 6400,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_badrum;

  -- Lister — own labor, to_do
  UPDATE tasks SET
    task_cost_type = 'own_labor',
    estimated_hours = 12,
    hourly_rate = 420,
    material_estimate = 7130,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_lister;

  -- El-arbete — subcontractor, to_do
  UPDATE tasks SET
    task_cost_type = 'subcontractor',
    subcontractor_cost = 12000,
    markup_percent = 10,
    material_estimate = 1794,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_el;

  -- Slutstädning — subcontractor, to_do
  UPDATE tasks SET
    task_cost_type = 'subcontractor',
    subcontractor_cost = 4000,
    markup_percent = 0,
    material_estimate = 0,
    progress = 0,
    payment_status = 'not_paid',
    paid_amount = 0
  WHERE id = t_stad;

  -- ============================================================
  -- 2. ROOM DIMENSIONS (JSONB with area_sqm, width_mm, length_mm)
  -- ============================================================

  UPDATE rooms SET dimensions = '{"area_sqm": 20.0, "width_mm": 5000, "length_mm": 4000}'::jsonb
  WHERE id = r_vardagsrum;

  UPDATE rooms SET dimensions = '{"area_sqm": 12.0, "width_mm": 3000, "length_mm": 4000}'::jsonb
  WHERE id = r_sovrum;

  UPDATE rooms SET dimensions = '{"area_sqm": 8.0, "width_mm": 4000, "length_mm": 2000}'::jsonb
  WHERE id = r_kok;

  UPDATE rooms SET dimensions = '{"area_sqm": 4.0, "width_mm": 2000, "length_mm": 2000}'::jsonb
  WHERE id = r_badrum;

  UPDATE rooms SET dimensions = '{"area_sqm": 5.5, "width_mm": 5000, "length_mm": 1100}'::jsonb
  WHERE id = r_hall;

  -- ============================================================
  -- 3. MATERIAL STATUS & COST ENRICHMENT
  -- ============================================================

  -- Valid statuses: submitted, declined, approved, billed, paid, paused, new, done

  -- Completed tasks → materials paid (fully purchased and used)
  UPDATE materials SET
    status = 'paid',
    price_total = quantity * price_per_unit,
    paid_amount = quantity * price_per_unit
  WHERE project_id = v_demo_id
    AND task_id IN (t_forberedelse, t_spackling, t_malning);

  -- In-progress task → materials approved (received, partially paid)
  UPDATE materials SET
    status = 'approved',
    price_total = quantity * price_per_unit,
    paid_amount = ROUND((quantity * price_per_unit) * 0.5)
  WHERE project_id = v_demo_id
    AND task_id = t_tapetsering;

  -- Near-future tasks → materials billed (ordered, invoice received)
  UPDATE materials SET
    status = 'billed',
    price_total = quantity * price_per_unit,
    paid_amount = 0,
    ordered_amount = quantity * price_per_unit
  WHERE project_id = v_demo_id
    AND task_id IN (t_golv, t_kok);

  -- Later tasks → materials submitted (requested, not yet ordered)
  UPDATE materials SET
    status = 'submitted',
    price_total = quantity * price_per_unit,
    paid_amount = 0
  WHERE project_id = v_demo_id
    AND task_id IN (t_badrum, t_lister, t_el);

  -- ============================================================
  -- 4. TASK DEPENDENCIES (realistic renovation sequence)
  -- ============================================================

  -- Clean up existing
  DELETE FROM task_dependencies WHERE task_id IN (
    SELECT id FROM tasks WHERE project_id = v_demo_id
  );

  -- Spackling → Målning (walls must be smooth before painting)
  IF t_spackling IS NOT NULL AND t_malning IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_malning, t_spackling);
  END IF;

  -- Målning → Golvslipning (protect fresh walls from sanding dust)
  IF t_malning IS NOT NULL AND t_golv IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_golv, t_malning);
  END IF;

  -- Badrumskakel → El (install spots after tiles are done)
  IF t_badrum IS NOT NULL AND t_el IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_el, t_badrum);
  END IF;

  -- Golvslipning → Lister (floor first, then baseboards)
  IF t_golv IS NOT NULL AND t_lister IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_lister, t_golv);
  END IF;

  -- Lister → Slutstädning
  IF t_lister IS NOT NULL AND t_stad IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_stad, t_lister);
  END IF;

  -- El → Slutstädning
  IF t_el IS NOT NULL AND t_stad IS NOT NULL THEN
    INSERT INTO task_dependencies (task_id, depends_on_task_id)
    VALUES (t_stad, t_el);
  END IF;

  -- ============================================================
  -- 5. COMMENTS (realistic builder notes on tasks)
  -- ============================================================

  -- Clean up existing demo comments
  DELETE FROM comments WHERE task_id IN (
    SELECT id FROM tasks WHERE project_id = v_demo_id
  );

  INSERT INTO comments (task_id, content, created_by_user_id, created_at)
  VALUES (
    t_spackling,
    'Hittade fler sprickor vid fönstret än väntat. Lade till extra spackling — ca 1 timme mer. Inget som påverkar budget nämnvärt.',
    v_owner_id,
    NOW() - INTERVAL '15 days'
  );

  INSERT INTO comments (task_id, content, created_by_user_id, created_at)
  VALUES (
    t_malning,
    'Kunden ändrade kulör i sista stund till NCS S 0502-Y (varmvit). Bra val — passar parketten perfekt. Ingen merkostnad.',
    v_owner_id,
    NOW() - INTERVAL '12 days'
  );

  INSERT INTO comments (task_id, content, created_by_user_id, created_at)
  VALUES (
    t_tapetsering,
    'Mönsterpassningen kräver lite extra tapet. Beställde 1 extra rulle från Boråstapeter, leverans imorgon.',
    v_owner_id,
    NOW() - INTERVAL '3 days'
  );

  INSERT INTO comments (task_id, content, created_by_user_id, created_at)
  VALUES (
    t_badrum,
    'Upptäckte fukt bakom befintligt kakel vid besiktning. Rekommenderar att vi lägger till fuktisolering innan nya plattor. Skickat ÄTA-offert till kund.',
    v_owner_id,
    NOW() - INTERVAL '2 days'
  );

  INSERT INTO comments (task_id, content, created_by_user_id, created_at)
  VALUES (
    t_el,
    'Peter bekräftar att befintliga kablar klarar LED-spotarna. Ingen extra dragning behövs — bra nyheter!',
    v_owner_id,
    NOW() - INTERVAL '1 day'
  );

  RAISE NOTICE 'Demo project enriched: tasks (estimation, progress, checklists, payment), rooms (dimensions), materials (status, costs), dependencies (6), comments (5)';
END $$;
