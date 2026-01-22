# 🔧 Fixa: Objekt Försvinner Efter Refresh

## Problemet
Du ritar objekt på canvas-ytan och trycker Save, men när du refreshar sidan så försvinner objekten.

## Orsaken
Det finns två vanliga orsaker:

1. **Databas-kolumner saknas**: Tabellen `floor_map_shapes` saknar `color` och `stroke_color` kolumner
2. **RLS-policies saknas**: Databasen tillåter inte INSERT/UPDATE/DELETE på `floor_map_shapes`

## 🚀 Snabbfix (2 minuter)

### Alternativ 1: Använd Supabase Dashboard (Rekommenderat)

1. Gå till din **Supabase Dashboard**
2. Klicka på **SQL Editor** (till vänster i menyn)
3. Klicka på **New Query**
4. Kopiera **hela innehållet** från filen `fix-canvas-save.sql` i projektet
5. Klistra in i SQL Editor
6. Klicka på **Run** (eller tryck Cmd/Ctrl+Enter)
7. Vänta tills du ser ✅ meddelanden i resultatet

### Alternativ 2: Använd Node-skriptet

```bash
node fix-canvas-save.js
```

**OBS:** Om du får fel med detta alternativ, använd Alternativ 1 istället.

## 🧪 Testa Att Det Fungerar

Efter att du kört fixen:

1. **Refresha** din app (F5)
2. **Rita** ett objekt på canvas (tex en vägg eller ett rum)
3. **Tryck Save** (eller Cmd/Ctrl+S)
4. **Öppna Developer Console** (F12 eller högerklick → "Inspect" → Console)
5. **Leta efter**:
   ```
   💾 Manuell sparning... X shapes
   ✅ Saved to localStorage
   ✅ Successfully inserted X shapes to database
   ✅ Shapes sparade!
   ```
6. **Refresha sidan** (F5)
7. **Objektet ska finnas kvar!** ✅

## 🔍 Felsökning

### Problem: Objektet sparas fortfarande inte

**Steg 1: Kolla Developer Console**

Öppna Developer Console (F12) och rita ett objekt, tryck Save. Leta efter fel-meddelanden:

- ❌ `Error inserting shapes` → RLS-policies är inte korrekta
- ❌ `column "color" does not exist` → Kolumner saknas
- ⚠️ `Offline mode, skipping database save` → Databas-anslutningen fungerar inte

**Steg 2: Verifiera Databas-kolumner**

Gå till Supabase Dashboard → SQL Editor och kör:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'floor_map_shapes'
ORDER BY ordinal_position;
```

Du ska se dessa kolumner:
- ✅ `id`
- ✅ `project_id`
- ✅ `plan_id`
- ✅ `shape_type`
- ✅ `shape_data`
- ✅ `room_id`
- ✅ `color` ← Viktigt!
- ✅ `stroke_color` ← Viktigt!
- ✅ `created_at`
- ✅ `updated_at`

**Steg 3: Verifiera RLS-policies**

Gå till Supabase Dashboard → SQL Editor och kör:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'floor_map_shapes'
ORDER BY cmd;
```

Du ska se dessa policies:
- ✅ `Users can view shapes in accessible projects` (SELECT)
- ✅ `Users can create shapes in manageable projects` (INSERT)
- ✅ `Users can update shapes in manageable projects` (UPDATE)
- ✅ `Users can delete shapes in manageable projects` (DELETE)

### Problem: "Plan not found or missing project_id"

Detta betyder att ingen floor plan finns för projektet.

**Fix:**
1. Gå till projektet
2. Canvas kommer automatiskt skapa en default plan
3. Rita ett objekt och tryck Save igen

### Problem: Objektet sparas till localStorage men inte databasen

Leta i Developer Console efter:
```
✅ Saved to localStorage
⚠️ Offline mode, skipping database save
```

**Fix:**
1. Kolla din internet-anslutning
2. Verifiera att Supabase URL och keys är korrekta i `.env`
3. Kolla Supabase Dashboard att projektet är aktivt

## 📋 Vad Gör Fix-Skriptet?

Skriptet `fix-canvas-save.sql` gör följande:

1. **Lägger till kolumner** (om de saknas):
   - `color` → Färgen på objektet
   - `stroke_color` → Kantens färg

2. **Skapar RLS-policies** för att tillåta:
   - SELECT → Visa objekt
   - INSERT → Skapa nya objekt
   - UPDATE → Uppdatera objekt
   - DELETE → Ta bort objekt

3. **Verifierar** att allt är korrekt

## 💡 Teknisk Förklaring

### Varför Försvinner Objekten?

När du ritar på canvas:
1. Objektet skapas i Zustand store (i minnet)
2. När du trycker Save → sparas till `localStorage` OCH databas
3. När du refreshar → laddas objekt från databasen

Om databasen inte tillåter INSERT (p.g.a. saknade RLS-policies) eller om kolumner saknas, så misslyckas databas-sparningen. Objektet finns bara i localStorage, som är per browser-session.

### Hur Fungerar Sparningen?

```
Canvas → Store → saveShapesForPlan()
                      ↓
              localStorage (instant)
                      ↓
              Supabase (async)
                      ↓
              floor_map_shapes tabell
```

## 🆘 Behöver Du Mer Hjälp?

Om problemet kvarstår efter att ha provat alla steg:

1. Exportera Developer Console output:
   - Högerklick i Console → "Save as..."
   
2. Kolla Supabase Logs:
   - Dashboard → Logs → Filter på "floor_map_shapes"

3. Öppna ett issue med:
   - Console output
   - Supabase logs
   - Stegen du tagit

## ✅ Framgång!

Om du ser detta i Console efter Save + Refresh:
```
📥 loadShapesForPlan called with planId: xxx
✅ Fetched X shapes from database
✅ Loaded X shapes from database for plan: xxx
```

Då fungerar sparningen! 🎉
