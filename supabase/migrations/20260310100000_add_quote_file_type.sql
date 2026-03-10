-- Add 'quote' as a valid file_type for task_file_links
-- Used when homeowners attach builder quotes to planning tasks

ALTER TABLE task_file_links DROP CONSTRAINT IF EXISTS task_file_links_file_type_check;

ALTER TABLE task_file_links
ADD CONSTRAINT task_file_links_file_type_check
CHECK (file_type IN ('invoice', 'receipt', 'contract', 'quote', 'other'));
