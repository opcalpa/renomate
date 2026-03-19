-- Change floor_map_shapes.room_id FK from SET NULL to CASCADE.
-- When a room is deleted from the rooms list, its canvas shape is also deleted.
-- The reverse (deleting a shape) still only clears floor_plan_position on the room,
-- leaving the room record intact in the list (handled by the sync trigger).
--
-- Revert SQL:
-- ALTER TABLE public.floor_map_shapes
--   DROP CONSTRAINT floor_map_shapes_room_id_fkey,
--   ADD CONSTRAINT floor_map_shapes_room_id_fkey
--     FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.floor_map_shapes
  DROP CONSTRAINT IF EXISTS floor_map_shapes_room_id_fkey,
  ADD CONSTRAINT floor_map_shapes_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
