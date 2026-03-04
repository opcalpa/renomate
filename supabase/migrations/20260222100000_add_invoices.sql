-- ============================================================================
-- Invoice system: invoices + invoice_items tables
-- ============================================================================

-- invoices (mirrors quotes table structure)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  client_id_ref UUID,  -- references clients table (not FK enforced, same as quotes)
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12,2) DEFAULT 0,
  total_rot_deduction NUMERIC(12,2) DEFAULT 0,
  total_after_rot NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  payment_terms_days INTEGER DEFAULT 30,
  ocr_reference TEXT,
  bankgiro TEXT,
  notes TEXT,
  free_text TEXT,
  is_ata BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Check constraint on status
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'cancelled'));

-- invoice_items (mirrors quote_items)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'st',
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (
    quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100)
  ) STORED,
  is_rot_eligible BOOLEAN DEFAULT false,
  rot_deduction NUMERIC(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  comment TEXT,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_creator_id ON public.invoices(creator_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON public.invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoices_updated_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- invoices: owner can do everything
DROP POLICY IF EXISTS "Users can view invoices for their projects" ON public.invoices;
CREATE POLICY "Users can view invoices for their projects"
  ON public.invoices FOR SELECT
  USING (
    creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT project_id FROM project_shares
      WHERE shared_with_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR client_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert invoices for their projects" ON public.invoices;
CREATE POLICY "Users can insert invoices for their projects"
  ON public.invoices FOR INSERT
  WITH CHECK (
    creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update invoices they created" ON public.invoices;
CREATE POLICY "Users can update invoices they created"
  ON public.invoices FOR UPDATE
  USING (
    creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete draft invoices" ON public.invoices;
CREATE POLICY "Users can delete draft invoices"
  ON public.invoices FOR DELETE
  USING (
    status = 'draft'
    AND (
      creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR project_id IN (
        SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );

-- invoice_items: follow invoice access
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;
CREATE POLICY "Users can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices)
  );

DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;
CREATE POLICY "Users can insert invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR project_id IN (
          SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Users can update invoice items" ON public.invoice_items;
CREATE POLICY "Users can update invoice items"
  ON public.invoice_items FOR UPDATE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR project_id IN (
          SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete invoice items" ON public.invoice_items;
CREATE POLICY "Users can delete invoice items"
  ON public.invoice_items FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE creator_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR project_id IN (
          SELECT id FROM projects WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    )
  );

-- Activity log trigger for invoice status changes
CREATE OR REPLACE FUNCTION public.handle_invoice_activity_log()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  _actor_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get the current authenticated user; fall back to creator_id
    BEGIN
      SELECT id INTO _actor_id FROM profiles WHERE user_id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      _actor_id := NEW.creator_id;
    END;
    IF _actor_id IS NULL THEN
      _actor_id := NEW.creator_id;
    END IF;

    INSERT INTO public.activity_log (project_id, actor_id, action, entity_type, entity_id, entity_name, changes)
    VALUES (
      NEW.project_id,
      _actor_id,
      CASE NEW.status
        WHEN 'sent' THEN 'sent'
        WHEN 'paid' THEN 'paid'
        WHEN 'partially_paid' THEN 'partially_paid'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'updated'
      END,
      'invoice',
      NEW.id,
      NEW.title,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_activity_log ON public.invoices;
CREATE TRIGGER invoice_activity_log
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_activity_log();
