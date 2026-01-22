# Åtgärda kommentarer på rum och drawing objects

## Problem
Kommentarer fungerar inte på rum (RoomDetailDialog) och drawing objects (PropertyPanel - väggar, etc.)

Felmeddelande: `New row for relation "comments" violates check constraint "comments_target_check"`

## Lösning

### Steg 1: Kontrollera nuvarande constraint

Kör detta i Supabase SQL Editor för att se nuvarande constraint:

```sql
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE '%comments_target%'
AND conrelid = 'public.comments'::regclass;
```

### Steg 2: Ta bort gamla constraints MANUELLT

Om du ser gamla constraints, ta bort dem MANUELLT först:

```sql
-- Ta bort gamla constraints
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_target_check;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS cpomments_target_check;
```

### Steg 3: Kör hela migrationen

Nu kör du HELA innehållet från `supabase/add_drawing_object_comments.sql`

### Steg 4: Verifiera

Kör detta för att verifiera att den nya constraint är aktiv:

```sql
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'comments_target_check'
AND conrelid = 'public.comments'::regclass;
```

Du ska se att constraint tillåter:
- `task_id IS NOT NULL` (och andra är NULL)
- `material_id IS NOT NULL` (och andra är NULL)  
- `drawing_object_id IS NOT NULL` (och andra är NULL)
- `entity_id IS NOT NULL` (och andra är NULL) ← **DETTA ÄR NYTT för RUM!**

### Steg 5: Testa

1. **Testa rum-kommentarer:**
   - Öppna ett rum (dubbelklicka)
   - Gå till "Kommentarer & Diskussion"
   - Skriv en kommentar
   - Ska fungera utan fel!

2. **Testa drawing object-kommentarer:**
   - Markera en vägg
   - Dubbelklicka för att öppna PropertyPanel
   - Gå till "Kommentarer & Diskussion"
   - Skriv en kommentar
   - Ska fungera utan fel!

## Viktigt!

- **Rum-kommentarer** använder `entity_id` + `entity_type='room'`
- **Drawing object-kommentarer** använder `drawing_object_id`
- De är **separata** och blandas aldrig!

## Om det fortfarande inte fungerar

Kontakta mig och inkludera:
1. Output från steg 1 (nuvarande constraint)
2. Output från steg 4 (nya constraint)
3. Det exakta felmeddelandet från browser console
