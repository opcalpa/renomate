-- Rename task statuses to match construction industry terminology
UPDATE tasks SET status = 'planned' WHERE status = 'ideas';
UPDATE tasks SET status = 'waiting' WHERE status = 'on_hold';
UPDATE tasks SET status = 'cancelled' WHERE status = 'scrapped';

-- Also update activity_log references
UPDATE activity_log SET changes = jsonb_set(changes, '{old}', '"planned"')
  WHERE changes->>'old' = 'ideas';
UPDATE activity_log SET changes = jsonb_set(changes, '{new}', '"planned"')
  WHERE changes->>'new' = 'ideas';
UPDATE activity_log SET changes = jsonb_set(changes, '{old}', '"waiting"')
  WHERE changes->>'old' = 'on_hold';
UPDATE activity_log SET changes = jsonb_set(changes, '{new}', '"waiting"')
  WHERE changes->>'new' = 'on_hold';
UPDATE activity_log SET changes = jsonb_set(changes, '{old}', '"cancelled"')
  WHERE changes->>'old' = 'scrapped';
UPDATE activity_log SET changes = jsonb_set(changes, '{new}', '"cancelled"')
  WHERE changes->>'new' = 'scrapped';
