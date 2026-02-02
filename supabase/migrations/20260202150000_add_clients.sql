CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own clients" ON clients FOR ALL
  USING (owner_id = get_user_profile_id());

-- Add client_id FK to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_id_ref UUID REFERENCES clients(id) ON DELETE SET NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();
