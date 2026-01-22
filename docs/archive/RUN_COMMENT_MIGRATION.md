# 🔧 Fix Comments Error - Add Drawing Object Support

## Problem
Får fel när man försöker posta kommentarer på drawing objects (väggar, rum, etc.):
```
New row for relation "comments" violates check constraint "cpomments_target_check"
POST https://...supabase.co/rest/v1/comments?select=* 400 (Bad Request)
```

## Rot-orsak
`comments`-tabellen i Supabase stöder endast kommentarer på:
- ✅ `tasks` (via `task_id`)
- ✅ `materials` (via `material_id`)
- ❌ `drawing_objects` (saknas!)

Check constraint:
```sql
CONSTRAINT comments_target_check CHECK (
  (task_id IS NOT NULL AND material_id IS NULL) OR 
  (task_id IS NULL AND material_id IS NOT NULL)
)
```

Detta tillåter INTE `drawing_object_id`.

---

## Lösning

### SQL-migration skapad: `supabase/add_drawing_object_comments.sql`

Denna migration gör följande:

#### 1. Lägger till ny kolumn
```sql
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS drawing_object_id UUID;
```

#### 2. Uppdaterar check constraint
```sql
-- Tillåter task_id, material_id, ELLER drawing_object_id
ALTER TABLE public.comments 
ADD CONSTRAINT comments_target_check CHECK (
  (task_id IS NOT NULL AND material_id IS NULL AND drawing_object_id IS NULL) OR 
  (task_id IS NULL AND material_id IS NOT NULL AND drawing_object_id IS NULL) OR
  (task_id IS NULL AND material_id IS NULL AND drawing_object_id IS NOT NULL)
);
```

#### 3. Uppdaterar RLS policies
```sql
-- Tillåter autentiserade användare att kommentera drawing objects
CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (
  ... OR
  (drawing_object_id IS NOT NULL AND auth.uid() IS NOT NULL)
);
```

---

## Kör Migration

### Alternativ 1: Via Supabase Dashboard (Rekommenderat)

1. **Öppna Supabase Dashboard:**
   ```
   https://app.supabase.com/project/pfyxywuchbakuphxhgec/editor
   ```

2. **Gå till SQL Editor:**
   - Klicka på "SQL Editor" i vänstermenyn

3. **Kör SQL:**
   - Klicka "New query"
   - Kopiera hela innehållet från `supabase/add_drawing_object_comments.sql`
   - Klistra in i SQL-editorn
   - Klicka "Run" (eller Cmd+Enter)

4. **Verifiera:**
   ```
   ✅ Drawing object comments support added successfully!
   ✅ Comments can now be added to: tasks, materials, and drawing_objects
   ```

### Alternativ 2: Via Terminal

Om du har Supabase CLI installerad:

```bash
# Navigera till projektmappen
cd /Users/calpa/Desktop/Renomate

# Kör migrationen
supabase db execute --file supabase/add_drawing_object_comments.sql

# Eller med psql direkt
psql $DATABASE_URL -f supabase/add_drawing_object_comments.sql
```

---

## Efter Migration

### Testa Kommentarer:

1. **Öppna appen:** http://localhost:5175/
2. **Dubbelklicka på en vägg**
3. **Scrolla ner till "Kommentarer & Diskussion"**
4. **Skriv en kommentar:** "Denna vägg ska rivas"
5. **Klicka "Lägg till kommentar"**
6. **✅ Kommentar ska nu sparas utan fel!**

### Verifiera i Databas:

```sql
-- Kolla att kolumnen finns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments' 
  AND column_name = 'drawing_object_id';

-- Kolla constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'comments_target_check';

-- Testa skapa kommentar
INSERT INTO comments (content, created_by_user_id, drawing_object_id)
VALUES ('Test comment', (SELECT id FROM profiles LIMIT 1), gen_random_uuid());
-- Ska fungera! ✅
```

---

## Schema Efter Migration

### `comments` tabell:

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| `id` | UUID | Primary key |
| `content` | TEXT | Kommentar-text |
| `created_at` | TIMESTAMPTZ | När skapad |
| `created_by_user_id` | UUID | Vem skapade |
| `task_id` | UUID | Task (optional) |
| `material_id` | UUID | Material (optional) |
| `drawing_object_id` | UUID | Drawing object (optional) ✨ **NY** |

### Check Constraint:
```sql
-- Exakt EN av dessa måste vara satt:
- task_id
- material_id  
- drawing_object_id ✨ **NY**
```

---

## Vad CommentsSection Skickar

I `PropertyPanel.tsx`:

```typescript
<CommentsSection
  entityId={shape.id}           // ← Drawing object ID
  entityType="drawing_object"   // ← Type
  projectId={projectId}         // ← Project context
/>
```

CommentsSection konverterar detta till:
```typescript
{
  content: "Min kommentar",
  created_by_user_id: currentUserId,
  drawing_object_id: shape.id  // ✅ Nu fungerar det!
}
```

---

## Troubleshooting

### Om du fortfarande får fel efter migration:

1. **Kolla att migration kördes:**
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'comments' 
     AND column_name = 'drawing_object_id';
   ```
   Ska returnera 1 rad.

2. **Kolla constraint:**
   ```sql
   SELECT check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name = 'comments_target_check';
   ```
   Ska innehålla `drawing_object_id`.

3. **Ladda om sidan:**
   - Tryck Cmd+Shift+R för hard refresh
   - Eller starta om servern: `npm run dev`

4. **Kolla browser console:**
   - Öppna DevTools (Cmd+Opt+J)
   - Försök kommentera igen
   - Se om felet ändrats

---

## Framtida Förbättring (Optional)

För bättre säkerhet, länka drawing objects till projects:

```sql
-- Lägg till project_id i floor_map_shapes
ALTER TABLE floor_map_shapes 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Uppdatera RLS policy för drawing object comments
CREATE POLICY "Users can view drawing comments"
ON public.comments
FOR SELECT
USING (
  drawing_object_id IS NOT NULL 
  AND drawing_object_id IN (
    SELECT id FROM floor_map_shapes 
    WHERE user_has_project_access(project_id)
  )
);
```

Men detta är INTE nödvändigt för att kommentarer ska fungera nu.

---

## ✅ Sammanfattning

1. **Migration skapad:** `supabase/add_drawing_object_comments.sql`
2. **Kör migration:** Via Supabase Dashboard eller CLI
3. **Testa:** Dubbelklicka vägg → Kommentera
4. **✅ Kommentarer fungerar!**

**Kör migrationen så fungerar kommentarerna! 🎉**
