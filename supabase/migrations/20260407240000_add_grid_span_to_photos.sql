-- Add grid span columns for free-form moodboard resize
-- Replaces display_size + crop_shape presets with direct col/row span control
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS grid_col_span smallint NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS grid_row_span smallint NOT NULL DEFAULT 2;

-- Migrate existing data: map old display_size + crop_shape to spans
UPDATE photos SET
  grid_col_span = CASE
    WHEN crop_shape = 'portrait' AND display_size = 'lg' THEN 4
    WHEN crop_shape = 'portrait' THEN 2
    WHEN crop_shape = 'square' AND display_size = 'lg' THEN 4
    WHEN crop_shape = 'square' OR crop_shape = 'circle' THEN 2
    WHEN display_size = 'lg' THEN 6
    WHEN display_size = 'sm' THEN 3
    ELSE 3
  END,
  grid_row_span = CASE
    WHEN crop_shape = 'portrait' AND display_size = 'lg' THEN 6
    WHEN crop_shape = 'portrait' THEN 3
    WHEN crop_shape = 'square' AND display_size = 'lg' THEN 4
    WHEN crop_shape = 'square' OR crop_shape = 'circle' THEN 2
    WHEN display_size = 'lg' THEN 4
    WHEN display_size = 'sm' THEN 2
    ELSE 2
  END
WHERE linked_to_type IN ('room', 'project');
