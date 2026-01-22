# 🚀 SNABBSTART: Templates i Databas

## ⚠️ FEL: "Could not find the table 'public.templates'"

Detta betyder att du behöver köra SQL-migrationen först!

---

## ✅ 3-STEGS LÖSNING

### **Steg 1: Öppna Supabase Dashboard**
```
https://supabase.com/dashboard
```
1. Välj ditt projekt: **Renomate** (eller vad det nu heter)
2. Klicka **"SQL Editor"** i vänster menyn

### **Steg 2: Kör SQL-Skriptet**

**Kopiera detta och klistra in i SQL Editor:**

```sql
-- ============================================================================
-- CREATE TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[],
  
  shapes JSONB NOT NULL,
  bounds JSONB NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT templates_category_not_empty CHECK (length(trim(category)) > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_project_id ON public.templates(project_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON public.templates(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
CREATE POLICY "Users can view own templates"
  ON public.templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
DROP POLICY IF EXISTS "Users can insert own templates" ON public.templates;
CREATE POLICY "Users can insert own templates"
  ON public.templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
CREATE POLICY "Users can update own templates"
  ON public.templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;
CREATE POLICY "Users can delete own templates"
  ON public.templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS templates_updated_at_trigger ON public.templates;
CREATE TRIGGER templates_updated_at_trigger
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
```

**Klicka "Run" (eller Cmd+Enter)**

### **Steg 3: Verifiera**

Kör detta för att kontrollera:
```sql
SELECT * FROM public.templates LIMIT 1;
```

Om du får ett resultat (tom tabell är OK), så fungerar det! ✅

---

## 🔄 Efter SQL-Migration

1. **Refresha sidan** (Cmd+R)
2. **Öppna Space Planner** → Inga error-meddelanden!
3. **Testa Template-funktionen:**
   - Rita 2 väggar
   - Markera dem
   - Klicka 💾 (Bookmark-ikon)
   - Spara som mall
   - Öppna Template Gallery (📋-ikon)
   - ✅ Se din mall med miniatyr!

---

## ❓ Felsökning

### **"permission denied for table templates"**
**Lösning:** Kör hela SQL-skriptet igen, speciellt RLS-delen.

### **Fortfarande "Could not find table"**
**Lösning:** 
1. Kolla att du körde SQL i rätt projekt
2. Verifiera med: `SELECT * FROM public.templates;`
3. Refresha webbläsaren (Cmd+R)

### **"User not authenticated"**
**Lösning:** Logga ut och in igen i appen.

---

## 📋 Vad Skapades?

- ✅ `templates`-tabell i Supabase
- ✅ Indexes för snabba queries
- ✅ RLS policies (säkerhet)
- ✅ Auto-update trigger för `updated_at`
- ✅ Permissions för authenticated users

---

**Klar!** Nu kan du spara och återanvända mallar i Space Planner! 🎨✨
