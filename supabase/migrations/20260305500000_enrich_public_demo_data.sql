-- Enrich public demo project with quotes and invoices for the demo experience
-- Also adds RLS policies so anonymous users can view them

-- ============================================================================
-- 1. RLS POLICIES for anonymous access to quotes/invoices in public demo
-- ============================================================================

-- Quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public demo quotes' AND tablename = 'quotes'
  ) THEN
    CREATE POLICY "Anyone can view public demo quotes" ON public.quotes
      FOR SELECT USING (is_public_demo_project(project_id));
  END IF;
END $$;

-- Quote items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public demo quote items' AND tablename = 'quote_items'
  ) THEN
    CREATE POLICY "Anyone can view public demo quote items" ON public.quote_items
      FOR SELECT USING (quote_id IN (SELECT id FROM quotes WHERE is_public_demo_project(project_id)));
  END IF;
END $$;

-- Invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public demo invoices' AND tablename = 'invoices'
  ) THEN
    CREATE POLICY "Anyone can view public demo invoices" ON public.invoices
      FOR SELECT USING (is_public_demo_project(project_id));
  END IF;
END $$;

-- Invoice items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public demo invoice items' AND tablename = 'invoice_items'
  ) THEN
    CREATE POLICY "Anyone can view public demo invoice items" ON public.invoice_items
      FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE is_public_demo_project(project_id)));
  END IF;
END $$;

-- Task dependencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public demo task dependencies' AND tablename = 'task_dependencies'
  ) THEN
    CREATE POLICY "Anyone can view public demo task dependencies" ON public.task_dependencies
      FOR SELECT USING (task_id IN (SELECT id FROM tasks WHERE is_public_demo_project(project_id)));
  END IF;
END $$;

-- ============================================================================
-- 2. SEED DATA — quotes, quote items, invoices, invoice items
-- ============================================================================

DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_system_admin_profile_id UUID;
  v_main_quote_id UUID;
  v_ata_quote_id UUID;
  v_invoice_id UUID;
BEGIN
  -- Find system admin profile (same pattern as existing demo migration)
  SELECT p.id INTO v_system_admin_profile_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'carl.palmquist@gmail.com'
  LIMIT 1;

  -- Fallback to system user profile
  IF v_system_admin_profile_id IS NULL THEN
    SELECT id INTO v_system_admin_profile_id
    FROM profiles
    WHERE user_id = '00000000-0000-0000-0000-000000000099'
    LIMIT 1;
  END IF;

  -- If still no profile, skip seeding
  IF v_system_admin_profile_id IS NULL THEN
    RAISE NOTICE 'No system admin profile found, skipping demo quote/invoice seeding';
    RETURN;
  END IF;

  -- Clean up existing demo quotes & invoices (idempotent)
  DELETE FROM invoice_items WHERE invoice_id IN (
    SELECT id FROM invoices WHERE project_id = v_public_demo_id
  );
  DELETE FROM invoices WHERE project_id = v_public_demo_id;
  DELETE FROM quote_items WHERE quote_id IN (
    SELECT id FROM quotes WHERE project_id = v_public_demo_id
  );
  DELETE FROM quotes WHERE project_id = v_public_demo_id;

  -- ========================================
  -- Main quote (accepted)
  -- ========================================
  v_main_quote_id := gen_random_uuid();

  INSERT INTO quotes (id, project_id, creator_id, title, description, status, total_amount, quote_number, created_at, updated_at)
  VALUES (
    v_main_quote_id,
    v_public_demo_id,
    v_system_admin_profile_id,
    'Offert - Ytskiktsrenovering Vasastan 3:a',
    'Komplett offert för ytskiktsrenovering av 3-rumslägenhet i Vasastan. Inkluderar alla ytor, material och arbete.',
    'accepted',
    134000,
    'OFF-2026-001',
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '7 days'
  );

  -- 10 quote items matching demo tasks
  INSERT INTO quote_items (quote_id, description, quantity, unit, unit_price, sort_order) VALUES
    (v_main_quote_id, 'Skydda och förbereda - täckning av golv och möbler', 1, 'st', 4000, 1),
    (v_main_quote_id, 'Spackling och slipning av väggar', 85, 'm²', 120, 2),
    (v_main_quote_id, 'Målning vardagsrum - väggar och tak', 45, 'm²', 180, 3),
    (v_main_quote_id, 'Tapetsering sovrum', 32, 'm²', 250, 4),
    (v_main_quote_id, 'Slipning och lackning av trägolv', 55, 'm²', 350, 5),
    (v_main_quote_id, 'Köksytor - bänkskiva och stänkskydd', 1, 'st', 18000, 6),
    (v_main_quote_id, 'Kakling badrum - golv och väggar', 22, 'm²', 850, 7),
    (v_main_quote_id, 'Lister och snickerier', 45, 'lm', 200, 8),
    (v_main_quote_id, 'Elarbete - nya uttag och belysning', 1, 'st', 12000, 9),
    (v_main_quote_id, 'Slutstädning och besiktning', 1, 'st', 5000, 10);

  -- ========================================
  -- ATA quote (sent, change order)
  -- ========================================
  v_ata_quote_id := gen_random_uuid();

  INSERT INTO quotes (id, project_id, creator_id, title, description, status, total_amount, quote_number, is_ata, created_at, updated_at)
  VALUES (
    v_ata_quote_id,
    v_public_demo_id,
    v_system_admin_profile_id,
    'ÄTA - Extra elarbete badrum',
    'Tillkommande elarbete upptäckt vid rivning av befintlig kakel. Ny dragning av el till spotlights och golvvärme.',
    'sent',
    8000,
    'OFF-2026-002',
    true,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  );

  INSERT INTO quote_items (quote_id, description, quantity, unit, unit_price, sort_order) VALUES
    (v_ata_quote_id, 'Extra eldragning badrum - spotlights och golvvärme', 1, 'st', 8000, 1);

  -- ========================================
  -- Invoice (partially paid)
  -- ========================================
  v_invoice_id := gen_random_uuid();

  INSERT INTO invoices (id, project_id, creator_id, quote_id, title, description, invoice_number, status, total_amount, paid_amount, due_date, payment_terms_days, created_at, updated_at, sent_at)
  VALUES (
    v_invoice_id,
    v_public_demo_id,
    v_system_admin_profile_id,
    v_main_quote_id,
    'Delbetalning 1',
    'Första delbetalning för ytskiktsrenovering - 50% av totalt offertbelopp.',
    'FAK-2026-001',
    'partially_paid',
    67000,
    40000,
    NOW() + INTERVAL '14 days',
    30,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '5 days'
  );

  INSERT INTO invoice_items (invoice_id, description, quantity, unit, unit_price, sort_order) VALUES
    (v_invoice_id, 'Delbetalning 1 - Ytskiktsrenovering (50%)', 1, 'st', 67000, 1);

  RAISE NOTICE 'Demo quotes and invoices seeded successfully';
END $$;
