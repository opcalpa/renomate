# 🗄️ Setup Template Database

## Kör SQL-Migration

Du behöver köra SQL-migrationen för att skapa `templates`-tabellen i Supabase.

### **Steg 1: Öppna Supabase Dashboard**

```
1. Gå till: https://supabase.com/dashboard
2. Välj ditt projekt
3. Klicka på "SQL Editor" i vänster menyn
```

### **Steg 2: Kör SQL-Skriptet**

```
1. I SQL Editor, klicka "+ New query"
2. Kopiera innehållet från: supabase/create_templates_table.sql
3. Klistra in i editorn
4. Klicka "Run" eller tryck Cmd+Enter
```

**Eller via kommandorad:**

```bash
# Om du har Supabase CLI installerat:
supabase db push

# Eller kör direkt från filen:
psql "postgresql://..." < supabase/create_templates_table.sql
```

### **Steg 3: Verifiera**

Kör detta för att kontrollera att tabellen skapades:

```sql
SELECT * FROM public.templates LIMIT 1;
```

Om du får ett resultat (tom tabell är OK), så fungerar det! ✅

---

## Vad Skapas?

SQL-migrationen skapar:

### **1. Templates-Tabell**
```sql
- id (UUID, primary key)
- user_id (UUID, referens till auth.users)
- project_id (UUID, optional, referens till projects)
- name (TEXT, mallens namn)
- description (TEXT, optional)
- category (TEXT, kategori)
- tags (TEXT[], array av taggar)
- shapes (JSONB, alla shapes som JSON)
- bounds (JSONB, bounding box för preview)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### **2. Index för Prestanda**
- Index på `user_id` (snabba queries per användare)
- Index på `project_id` (snabba queries per projekt)
- Index på `category` (snabb filtrering)
- Index på `created_at` (sortering)

### **3. RLS Policies (Row Level Security)**
- Användare kan **läsa** sina egna mallar
- Användare kan **skapa** egna mallar
- Användare kan **uppdatera** sina egna mallar
- Användare kan **radera** sina egna mallar

### **4. Triggers**
- `updated_at` uppdateras automatiskt vid ändringar

---

## Felsökning

### **Problem: "Could not find the table 'public.templates'"**

**Orsak:** SQL-skriptet har inte körts än.

**Lösning:**
1. Följ Steg 1-2 ovan
2. Kör SQL-skriptet i Supabase Dashboard
3. Refresha sidan

### **Problem: "permission denied for table templates"**

**Orsak:** RLS policies är inte aktiverade korrekt.

**Lösning:**
Kör detta i SQL Editor:
```sql
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Re-create policies
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;

-- Kör sedan hela create_templates_table.sql igen
```

### **Problem: "User not authenticated" när du sparar mall**

**Orsak:** Användaren är inte inloggad.

**Lösning:**
1. Logga ut och in igen
2. Kontrollera att du är inloggad: 
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log(user); // Ska visa användaren
   ```

---

## Nästa Steg

Efter att SQL-migrationen är klar:

1. ✅ Refresha sidan
2. ✅ Testa att spara en mall
3. ✅ Kontrollera att den dyker upp i Template Gallery
4. ✅ Testa att placera mallen på canvas

---

**Klar!** Nu sparas alla mallar i Supabase-databasen istället för localStorage! 🎉
