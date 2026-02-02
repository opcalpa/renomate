-- quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12,2) DEFAULT 0,
  total_rot_deduction NUMERIC(12,2) DEFAULT 0,
  total_after_rot NUMERIC(12,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- quote_items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'st',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_rot_eligible BOOLEAN DEFAULT false,
  rot_deduction NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_creator_id ON quotes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own quotes" ON quotes FOR ALL
  USING (creator_id = get_user_profile_id());

CREATE POLICY "Client can view received quotes" ON quotes FOR SELECT
  USING (client_id = get_user_profile_id());

CREATE POLICY "Project members can view quotes" ON quotes FOR SELECT
  USING (user_has_project_access(project_id));

CREATE POLICY "Users can manage quote items via quote" ON quote_items FOR ALL
  USING (quote_id IN (SELECT id FROM quotes WHERE creator_id = get_user_profile_id()));

CREATE POLICY "Users can view quote items" ON quote_items FOR SELECT
  USING (quote_id IN (SELECT id FROM quotes WHERE user_has_project_access(project_id)));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_quotes_updated_at();

-- Activity log trigger
CREATE OR REPLACE FUNCTION log_quote_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_actor UUID;
BEGIN
  SELECT get_user_profile_id() INTO v_actor;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name)
    VALUES (NEW.project_id, v_actor, 'created', 'quote', NEW.id, NEW.title);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name, changes)
    VALUES (NEW.project_id, v_actor, 'status_changed', 'quote', NEW.id, NEW.title,
            jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER quote_activity AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION log_quote_activity();
