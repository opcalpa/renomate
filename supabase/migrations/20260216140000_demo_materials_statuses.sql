-- Fix materials status constraint and add varied statuses to demo project
-- The UI uses: submitted, declined, approved, billed, paid, paused
-- But the DB constraint only allows: new, declined, done

-- Step 1: Drop the old constraint
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_status_check;

-- Step 2: Add new constraint with all valid UI statuses
ALTER TABLE materials
ADD CONSTRAINT materials_status_check
CHECK (status IN ('submitted', 'declined', 'approved', 'billed', 'paid', 'paused', 'new', 'done'));

-- Step 3: Update any 'new' status to 'submitted' for consistency
UPDATE materials SET status = 'submitted' WHERE status = 'new';

-- Step 4: Add varied statuses to demo project materials
DO $$
DECLARE
  v_public_demo_id UUID := '00000000-0000-0000-0000-000000000001';
  v_material_ids UUID[];
BEGIN
  -- Get all material IDs for the demo project, ordered by created_at
  SELECT ARRAY_AGG(id ORDER BY created_at)
  INTO v_material_ids
  FROM materials
  WHERE project_id = v_public_demo_id;

  -- Exit if no materials found
  IF v_material_ids IS NULL OR array_length(v_material_ids, 1) IS NULL THEN
    RAISE NOTICE 'No materials found for demo project';
    RETURN;
  END IF;

  -- Update materials with varied statuses to show realistic project state
  -- Material 1: Spackel - paid (completed purchase)
  IF array_length(v_material_ids, 1) >= 1 THEN
    UPDATE materials SET status = 'paid' WHERE id = v_material_ids[1];
  END IF;

  -- Material 2: Väggfärg - paid
  IF array_length(v_material_ids, 1) >= 2 THEN
    UPDATE materials SET status = 'paid' WHERE id = v_material_ids[2];
  END IF;

  -- Material 3: Takfärg - paid
  IF array_length(v_material_ids, 1) >= 3 THEN
    UPDATE materials SET status = 'paid' WHERE id = v_material_ids[3];
  END IF;

  -- Material 4: Tapet - approved (ready to order)
  IF array_length(v_material_ids, 1) >= 4 THEN
    UPDATE materials SET status = 'approved' WHERE id = v_material_ids[4];
  END IF;

  -- Material 5: Golvlack - submitted (awaiting approval)
  IF array_length(v_material_ids, 1) >= 5 THEN
    UPDATE materials SET status = 'submitted' WHERE id = v_material_ids[5];
  END IF;

  -- Material 6: Bänkskiva IKEA - billed (invoice received)
  IF array_length(v_material_ids, 1) >= 6 THEN
    UPDATE materials SET status = 'billed' WHERE id = v_material_ids[6];
  END IF;

  -- Material 7: Kakel stänkskydd - approved
  IF array_length(v_material_ids, 1) >= 7 THEN
    UPDATE materials SET status = 'approved' WHERE id = v_material_ids[7];
  END IF;

  -- Material 8: Kakel vägg - submitted
  IF array_length(v_material_ids, 1) >= 8 THEN
    UPDATE materials SET status = 'submitted' WHERE id = v_material_ids[8];
  END IF;

  -- Material 9: Fogmassa - submitted
  IF array_length(v_material_ids, 1) >= 9 THEN
    UPDATE materials SET status = 'submitted' WHERE id = v_material_ids[9];
  END IF;

  -- Material 10: Golvlist - submitted
  IF array_length(v_material_ids, 1) >= 10 THEN
    UPDATE materials SET status = 'submitted' WHERE id = v_material_ids[10];
  END IF;

  -- Material 11: Taklist - paused (on hold)
  IF array_length(v_material_ids, 1) >= 11 THEN
    UPDATE materials SET status = 'paused' WHERE id = v_material_ids[11];
  END IF;

  -- Material 12: LED-spots - submitted
  IF array_length(v_material_ids, 1) >= 12 THEN
    UPDATE materials SET status = 'submitted' WHERE id = v_material_ids[12];
  END IF;

  RAISE NOTICE 'Updated % materials with varied statuses', array_length(v_material_ids, 1);
END $$;
