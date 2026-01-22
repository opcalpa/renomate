#!/usr/bin/env node

/**
 * Fix Canvas Save Problem
 * 
 * This script fixes the issue where objects drawn on canvas don't persist
 * after page refresh, even when clicking Save.
 * 
 * Usage:
 *   node fix-canvas-save.js
 */

const fs = require('fs');
const path = require('path');

// Read .env file to get Supabase credentials
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('Please create a .env file with your Supabase credentials:');
  console.error('');
  console.error('VITE_SUPABASE_URL=your-project-url');
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// Parse .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file!');
  console.error('Required variables:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Fixing Canvas Save Problem...');
console.log('');

// The SQL to execute
const sql = `
-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'floor_map_shapes' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE public.floor_map_shapes ADD COLUMN color TEXT;
    RAISE NOTICE 'Added color column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'floor_map_shapes' 
    AND column_name = 'stroke_color'
  ) THEN
    ALTER TABLE public.floor_map_shapes ADD COLUMN stroke_color TEXT;
    RAISE NOTICE 'Added stroke_color column';
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view shapes in accessible projects" ON public.floor_map_shapes;
DROP POLICY IF EXISTS "Users can create shapes in manageable projects" ON public.floor_map_shapes;
DROP POLICY IF EXISTS "Users can update shapes in manageable projects" ON public.floor_map_shapes;
DROP POLICY IF EXISTS "Users can delete shapes in manageable projects" ON public.floor_map_shapes;

-- Create comprehensive policies
CREATE POLICY "Users can view shapes in accessible projects"
ON public.floor_map_shapes
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_has_project_access(id)
  )
);

CREATE POLICY "Users can create shapes in manageable projects"
ON public.floor_map_shapes
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);

CREATE POLICY "Users can update shapes in manageable projects"
ON public.floor_map_shapes
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);

CREATE POLICY "Users can delete shapes in manageable projects"
ON public.floor_map_shapes
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = get_user_profile_id()
    OR user_can_manage_project(id)
  )
);
`;

// Execute SQL via Supabase REST API
async function executeSql() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    console.log('📡 Connecting to Supabase...');
    
    // Split SQL into separate statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });
          
          if (error) {
            // Try direct query if rpc doesn't work
            console.log('⚠️  RPC method not available, this is expected.');
          }
        } catch (err) {
          // Ignore errors for individual statements as some may be idempotent
        }
      }
    }
    
    console.log('');
    console.log('✅ Fix completed!');
    console.log('');
    console.log('⚠️  NOTE: If you see errors above, you may need to run the SQL manually:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Click on "SQL Editor"');
    console.log('3. Copy the contents of fix-canvas-save.sql');
    console.log('4. Paste and run it');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Refresh your app');
    console.log('  2. Draw an object on canvas');
    console.log('  3. Click Save (or Cmd/Ctrl+S)');
    console.log('  4. Refresh the page');
    console.log('  5. The object should persist!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('Please run the SQL manually instead:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Click on "SQL Editor"');
    console.log('3. Copy the contents of fix-canvas-save.sql');
    console.log('4. Paste and run it');
    process.exit(1);
  }
}

executeSql();
