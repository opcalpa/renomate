-- Add 'shape' to the allowed linked_to_type values in photos table
-- This allows photos to be attached to floor map shapes (walls, etc.)

-- Drop the existing constraint
ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_linked_to_type_check;

-- Add the new constraint with 'shape' included
ALTER TABLE photos ADD CONSTRAINT photos_linked_to_type_check
  CHECK (linked_to_type IN ('project', 'room', 'task', 'shape'));
