-- Invite admin user to demo project with full access
-- This allows easy editing of demo content without special system admin rules
-- All other users (anonymous and logged-in) retain view-only access via existing RLS policies

DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_admin_profile_id UUID;
BEGIN
  -- Find the admin profile
  SELECT p.id INTO v_admin_profile_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = 'carl.palmquist@gmail.com'
  LIMIT 1;

  -- Only proceed if admin profile exists
  IF v_admin_profile_id IS NOT NULL THEN
    -- Remove any existing share for this user on demo project
    DELETE FROM project_shares
    WHERE project_id = v_public_demo_id
    AND shared_with_user_id = v_admin_profile_id;

    -- Add full access share
    INSERT INTO project_shares (
      project_id,
      shared_with_user_id,
      display_name,
      role,
      overview_access,
      timeline_access,
      tasks_access,
      tasks_scope,
      space_planner_access,
      purchases_access,
      purchases_scope,
      budget_access,
      files_access,
      teams_access
    ) VALUES (
      v_public_demo_id,
      v_admin_profile_id,
      'Carl Palmquist',
      'admin',
      'edit',
      'edit',
      'edit',
      'all',
      'edit',
      'edit',
      'all',
      'edit',
      'edit',
      'invite'
    );

    RAISE NOTICE 'Added full access for admin to demo project';
  ELSE
    RAISE NOTICE 'Admin profile not found - skipping demo project invite';
  END IF;
END $$;
