-- Add fake team members to the demo project
-- Makes shared_with_user_id nullable and uses display_name for demo members

-- Step 1: Add display columns to project_shares
ALTER TABLE public.project_shares
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS display_email TEXT;

COMMENT ON COLUMN public.project_shares.display_name IS 'Display name (used when shared_with_user_id is NULL or for override)';
COMMENT ON COLUMN public.project_shares.display_email IS 'Display email (used when shared_with_user_id is NULL or for override)';

-- Step 2: Make shared_with_user_id nullable (for demo members without real accounts)
ALTER TABLE public.project_shares
ALTER COLUMN shared_with_user_id DROP NOT NULL;

-- Step 3: Drop the unique constraint and recreate it to allow NULL
ALTER TABLE public.project_shares
DROP CONSTRAINT IF EXISTS project_shares_project_id_shared_with_user_id_key;

-- Recreate with a partial unique index (only for non-null shared_with_user_id)
CREATE UNIQUE INDEX IF NOT EXISTS project_shares_project_user_unique
ON public.project_shares (project_id, shared_with_user_id)
WHERE shared_with_user_id IS NOT NULL;

-- Step 4: Create demo team members
DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_demo_owner_profile_id UUID;
BEGIN
  -- Get demo project owner profile ID
  SELECT owner_id INTO v_demo_owner_profile_id FROM projects WHERE id = v_public_demo_id;

  IF v_demo_owner_profile_id IS NULL THEN
    RAISE NOTICE 'Demo project not found, skipping team member creation';
    RETURN;
  END IF;

  -- Clean up any existing demo team members (those without shared_with_user_id)
  DELETE FROM project_shares
  WHERE project_id = v_public_demo_id
  AND shared_with_user_id IS NULL;

  -- ============================================================
  -- CREATE DEMO TEAM MEMBERS (with NULL shared_with_user_id)
  -- ============================================================

  -- 1. Målare (Painter) - Erik Lindström
  INSERT INTO project_shares (
    project_id, shared_with_user_id, role,
    display_name, display_email,
    role_type, contractor_category, phone, company,
    timeline_access, tasks_access, tasks_scope,
    space_planner_access, purchases_access, purchases_scope,
    overview_access, teams_access, budget_access, files_access
  ) VALUES (
    v_public_demo_id, NULL, 'editor',
    'Erik Lindström', 'erik.lindstrom@demo.renofine.se',
    'contractor', 'painter', '070-123 45 67', 'Lindströms Måleri AB',
    'view', 'edit', 'assigned',
    'view', 'edit', 'assigned',
    'view', 'none', 'none', 'view'
  );

  -- 2. Golvläggare (Floor specialist) - Anna Bergqvist
  INSERT INTO project_shares (
    project_id, shared_with_user_id, role,
    display_name, display_email,
    role_type, contractor_category, phone, company,
    timeline_access, tasks_access, tasks_scope,
    space_planner_access, purchases_access, purchases_scope,
    overview_access, teams_access, budget_access, files_access
  ) VALUES (
    v_public_demo_id, NULL, 'editor',
    'Anna Bergqvist', 'anna.bergqvist@demo.renofine.se',
    'contractor', 'flooring', '073-234 56 78', 'Bergqvist Golv & Parkett',
    'view', 'edit', 'assigned',
    'view', 'edit', 'assigned',
    'view', 'none', 'none', 'view'
  );

  -- 3. Snickare (Carpenter) - Johan Karlsson
  INSERT INTO project_shares (
    project_id, shared_with_user_id, role,
    display_name, display_email,
    role_type, contractor_category, phone, company,
    timeline_access, tasks_access, tasks_scope,
    space_planner_access, purchases_access, purchases_scope,
    overview_access, teams_access, budget_access, files_access
  ) VALUES (
    v_public_demo_id, NULL, 'editor',
    'Johan Karlsson', 'johan.karlsson@demo.renofine.se',
    'contractor', 'carpenter', '076-345 67 89', 'JK Snickeri & Kök',
    'view', 'edit', 'assigned',
    'view', 'edit', 'assigned',
    'view', 'none', 'none', 'view'
  );

  -- 4. Plattsättare (Tiler) - Maria Nilsson
  INSERT INTO project_shares (
    project_id, shared_with_user_id, role,
    display_name, display_email,
    role_type, contractor_category, phone, company,
    timeline_access, tasks_access, tasks_scope,
    space_planner_access, purchases_access, purchases_scope,
    overview_access, teams_access, budget_access, files_access
  ) VALUES (
    v_public_demo_id, NULL, 'editor',
    'Maria Nilsson', 'maria.nilsson@demo.renofine.se',
    'contractor', 'tiler', '072-456 78 90', 'Nilssons Kakel & Klinker',
    'view', 'edit', 'assigned',
    'view', 'edit', 'assigned',
    'view', 'none', 'none', 'view'
  );

  -- 5. Elektriker (Electrician) - Peter Andersson
  INSERT INTO project_shares (
    project_id, shared_with_user_id, role,
    display_name, display_email,
    role_type, contractor_category, phone, company,
    timeline_access, tasks_access, tasks_scope,
    space_planner_access, purchases_access, purchases_scope,
    overview_access, teams_access, budget_access, files_access
  ) VALUES (
    v_public_demo_id, NULL, 'editor',
    'Peter Andersson', 'peter.andersson@demo.renofine.se',
    'contractor', 'electrician', '070-567 89 01', 'Anderssons El & Installation',
    'view', 'edit', 'assigned',
    'view', 'edit', 'assigned',
    'view', 'none', 'none', 'view'
  );

  RAISE NOTICE 'Created 5 demo team members for project %', v_public_demo_id;
END $$;
