# Diagnos: Objekt Sparas Inte

## Problem
Objekt som ritas/placeras ut på canvas försvinner när sidan refreshas, även efter att ha tryckt på "Save".

## Möjliga Orsaker

### 1. RLS (Row Level Security) Policies Saknas
Tabellen `floor_map_shapes` kanske bara har SELECT-policy men inte INSERT/UPDATE/DELETE policies.

**Test:**
```sql
-- Kolla vilka policies som finns
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'floor_map_shapes';
```

**Fix:**
Kör filen: `supabase/fix_floor_map_shapes_rls.sql`

### 2. Kolumner Saknas (color, stroke_color)
Tabellen `floor_map_shapes` kanske saknar `color` och `stroke_color` kolumner som koden försöker spara till.

**Test:**
```sql
-- Kolla vilka kolumner som finns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'floor_map_shapes';
```

**Fix:**
Kör filen: `supabase/add_room_color_safe.sql`

### 3. currentPlanId är null
Om ingen plan är vald så kan inte shapes sparas.

**Debug:**
Öppna Developer Console (F12) och titta efter:
- `💾 Manuell sparning...` meddelanden
- `❌ Error` meddelanden
- `✅ Saved to localStorage` meddelanden

### 4. Databas-anslutning misslyckas
Om anslutningen till Supabase misslyckas så sparas shapes bara lokalt (localStorage).

**Test:**
Kolla i konsolen efter:
- `⚠️ Offline mode, skipping database save`
- `Using offline cache due to connection error`

## Snabbfix

Kör dessa två SQL-filer i ordning:

```bash
# 1. Lägg till saknade kolumner
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/add_room_color_safe.sql

# 2. Fixa RLS policies
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/fix_floor_map_shapes_rls.sql
```

Eller via Supabase Dashboard:
1. Gå till SQL Editor
2. Klistra in innehållet från `supabase/add_room_color_safe.sql`
3. Kör
4. Klistra in innehållet från `supabase/fix_floor_map_shapes_rls.sql`
5. Kör

## Verifiering

Efter att ha kört fixes:

1. Rita ett objekt på canvas
2. Tryck Save (eller Cmd/Ctrl+S)
3. Öppna Developer Console (F12)
4. Leta efter: `✅ Successfully inserted X shapes to database`
5. Refresha sidan (F5)
6. Objektet ska finnas kvar

Om objektet fortfarande försvinner, kolla konsolen för fel-meddelanden.
