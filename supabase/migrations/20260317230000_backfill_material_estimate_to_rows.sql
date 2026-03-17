-- Backfill tasks.material_estimate and tasks.material_items JSONB to the materials table.
-- After this migration the materials table is the single source of truth for planned
-- material costs. The tasks.material_estimate and tasks.material_items columns are kept
-- dormant (still written by the app during a transition period, never read for display).

-- Step 1: Tasks that only have a flat material_estimate (no JSONB items, no planned rows yet).
-- LATERAL JOIN ensures we only insert when a valid profile can be resolved (avoids NOT NULL).
INSERT INTO public.materials (
  id, name, price_total, task_id, project_id, status, exclude_from_budget, created_by_user_id
)
SELECT
  gen_random_uuid(),
  'Material',
  t.material_estimate,
  t.id,
  t.project_id,
  'planned',
  false,
  owners.profile_id
FROM tasks t
JOIN LATERAL (
  SELECT shared_with_user_id AS profile_id
  FROM project_shares
  WHERE project_id = t.project_id
    AND shared_with_user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1
) owners ON true
WHERE
  t.material_estimate IS NOT NULL
  AND t.material_estimate > 0
  AND (t.material_items IS NULL OR jsonb_array_length(t.material_items) = 0)
  AND NOT EXISTS (
    SELECT 1 FROM materials m WHERE m.task_id = t.id AND m.status = 'planned'
  );

-- Step 2: Tasks with material_items JSONB but no planned rows yet.
INSERT INTO public.materials (
  id, name, quantity, unit, price_per_unit, price_total, markup_percent,
  task_id, project_id, status, exclude_from_budget, created_by_user_id
)
SELECT
  gen_random_uuid(),
  COALESCE(NULLIF(TRIM((item->>'name')), ''), 'Material'),
  CASE WHEN (item->>'quantity') ~ '^\d+(\.\d+)?$' THEN (item->>'quantity')::numeric ELSE NULL END,
  COALESCE(NULLIF(TRIM((item->>'unit')), ''), 'st'),
  CASE WHEN (item->>'unit_price') ~ '^\d+(\.\d+)?$' THEN (item->>'unit_price')::numeric ELSE NULL END,
  CASE WHEN (item->>'amount') ~ '^\d+(\.\d+)?$' THEN (item->>'amount')::numeric ELSE NULL END,
  CASE WHEN (item->>'markup_percent') ~ '^-?\d+(\.\d+)?$' THEN (item->>'markup_percent')::numeric ELSE NULL END,
  t.id,
  t.project_id,
  'planned',
  false,
  owners.profile_id
FROM tasks t
CROSS JOIN LATERAL jsonb_array_elements(t.material_items) AS item
JOIN LATERAL (
  SELECT shared_with_user_id AS profile_id
  FROM project_shares
  WHERE project_id = t.project_id
    AND shared_with_user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1
) owners ON true
WHERE
  t.material_items IS NOT NULL
  AND jsonb_array_length(t.material_items) > 0
  AND NOT EXISTS (
    SELECT 1 FROM materials m WHERE m.task_id = t.id AND m.status = 'planned'
  );
