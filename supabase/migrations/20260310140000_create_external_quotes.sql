-- External quotes: homeowner-imported quotes from builders (received outside the app)
-- These are NOT cloned during RFQ flow — they belong to the homeowner's planning project only.

-- 1. Main table: one row per imported quote document
CREATE TABLE IF NOT EXISTS external_quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  builder_name text NOT NULL DEFAULT '',
  total_amount numeric NOT NULL DEFAULT 0,
  file_path   text,
  file_name   text,
  notes       text,
  color       text NOT NULL DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_quotes_project ON external_quotes(project_id);

-- 2. Assignment table: links a quote to a task with an allocated amount
CREATE TABLE IF NOT EXISTS external_quote_assignments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_quote_id  uuid NOT NULL REFERENCES external_quotes(id) ON DELETE CASCADE,
  task_id            uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  allocated_amount   numeric NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (external_quote_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_eqa_quote ON external_quote_assignments(external_quote_id);
CREATE INDEX IF NOT EXISTS idx_eqa_task  ON external_quote_assignments(task_id);

-- 3. RLS policies
ALTER TABLE external_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_quote_assignments ENABLE ROW LEVEL SECURITY;

-- external_quotes: project owner or shared users
CREATE POLICY "external_quotes_select" ON external_quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = external_quotes.project_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "external_quotes_insert" ON external_quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = external_quotes.project_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "external_quotes_update" ON external_quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = external_quotes.project_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "external_quotes_delete" ON external_quotes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = external_quotes.project_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

-- external_quote_assignments: same access as parent quote
CREATE POLICY "eqa_select" ON external_quote_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      JOIN projects p ON p.id = eq.project_id
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "eqa_insert" ON external_quote_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      JOIN projects p ON p.id = eq.project_id
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "eqa_update" ON external_quote_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      JOIN projects p ON p.id = eq.project_id
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );

CREATE POLICY "eqa_delete" ON external_quote_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM external_quotes eq
      JOIN projects p ON p.id = eq.project_id
      WHERE eq.id = external_quote_assignments.external_quote_id
        AND (p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM project_shares ps
               WHERE ps.project_id = p.id
                 AND ps.shared_with_user_id = auth.uid()
             ))
    )
  );
