-- Add 'material' to the photos.linked_to_type constraint if not already present
-- This is idempotent: drops and recreates the constraint

DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'photos' AND constraint_name = 'photos_linked_to_type_check'
  ) THEN
    ALTER TABLE photos DROP CONSTRAINT photos_linked_to_type_check;
  END IF;

  -- Add updated constraint with 'material' included
  ALTER TABLE photos ADD CONSTRAINT photos_linked_to_type_check
    CHECK (linked_to_type IN ('project', 'room', 'task', 'shape', 'material'));
END $$;
