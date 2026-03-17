-- Add source_material_id to link a real purchase order back to its planned budget row.
-- Used by the "Materialposter från offert" section: when a builder clicks "Skapa order"
-- on a planned material, the resulting to_order row gets source_material_id = planned_row.id.
-- This lets us compute consumed amount per planned budget entry.

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS source_material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL;
