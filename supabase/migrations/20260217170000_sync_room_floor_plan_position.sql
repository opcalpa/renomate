-- Sync room.floor_plan_position with floor_map_shapes
-- This ensures the room's "is placed" indicator stays in sync with actual shapes

-- 1. Create trigger function to sync room.floor_plan_position when shapes change
CREATE OR REPLACE FUNCTION sync_room_floor_plan_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points JSONB;
BEGIN
  -- Handle INSERT: Update room's floor_plan_position with shape coordinates
  IF TG_OP = 'INSERT' THEN
    IF NEW.room_id IS NOT NULL AND NEW.shape_type = 'room' THEN
      -- Extract points from shape_data
      v_points := NEW.shape_data->'points';
      IF v_points IS NOT NULL THEN
        UPDATE rooms
        SET floor_plan_position = jsonb_build_object('points', v_points)
        WHERE id = NEW.room_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE: Update room's floor_plan_position if coordinates changed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.room_id IS NOT NULL AND NEW.shape_type = 'room' THEN
      v_points := NEW.shape_data->'points';
      IF v_points IS NOT NULL THEN
        UPDATE rooms
        SET floor_plan_position = jsonb_build_object('points', v_points)
        WHERE id = NEW.room_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE: Clear room's floor_plan_position when shape is deleted
  IF TG_OP = 'DELETE' THEN
    IF OLD.room_id IS NOT NULL AND OLD.shape_type = 'room' THEN
      -- Check if there are any other shapes for this room (shouldn't be, but just in case)
      IF NOT EXISTS (
        SELECT 1 FROM floor_map_shapes
        WHERE room_id = OLD.room_id
        AND shape_type = 'room'
        AND id != OLD.id
      ) THEN
        UPDATE rooms
        SET floor_plan_position = NULL
        WHERE id = OLD.room_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 2. Create trigger on floor_map_shapes
DROP TRIGGER IF EXISTS trg_sync_room_floor_plan_position ON floor_map_shapes;
CREATE TRIGGER trg_sync_room_floor_plan_position
AFTER INSERT OR UPDATE OR DELETE ON floor_map_shapes
FOR EACH ROW
EXECUTE FUNCTION sync_room_floor_plan_position();

-- 3. Fix existing inconsistencies: Clear floor_plan_position for rooms without shapes
UPDATE rooms r
SET floor_plan_position = NULL
WHERE r.floor_plan_position IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM floor_map_shapes s
  WHERE s.room_id = r.id
  AND s.shape_type = 'room'
);

-- 4. Fix existing inconsistencies: Set floor_plan_position for rooms WITH shapes but missing position
UPDATE rooms r
SET floor_plan_position = jsonb_build_object('points', s.shape_data->'points')
FROM floor_map_shapes s
WHERE s.room_id = r.id
AND s.shape_type = 'room'
AND s.shape_data->'points' IS NOT NULL
AND (r.floor_plan_position IS NULL OR r.floor_plan_position->'points' IS NULL);

-- Comment
COMMENT ON FUNCTION sync_room_floor_plan_position IS
'Keeps room.floor_plan_position in sync with floor_map_shapes.
When a room shape is created/updated, copies points to the room record.
When a room shape is deleted, clears the room floor_plan_position.';
