# 🎨 KÖR RUMSFÄRG DATABAS-MIGRATION

**Snabbguide för att aktivera rumsfärg-funktionen**

---

## 🚀 STEG-FÖR-STEG

### **Metod 1: Via Supabase Dashboard (Rekommenderat)**

```
1. Gå till https://supabase.com/dashboard
2. Välj ditt projekt
3. Klicka på "SQL Editor" i sidomenyn
4. Klicka "New query"
5. Kopiera innehållet från filen: supabase/add_room_color.sql
6. Klistra in i SQL-editorn
7. Klicka "Run" (gröna knappen)
8. ✅ Klart! Kolumnerna är tillagda
```

---

### **Metod 2: Via Supabase CLI**

```bash
# 1. Navigera till projektmappen
cd /Users/calpa/Desktop/Renomate

# 2. Kör migrationen
supabase db push

# Eller kör SQL-filen direkt:
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/add_room_color.sql
```

---

### **Metod 3: Manuellt SQL (Kopiera & Klistra)**

```sql
-- Kopiera denna SQL och kör i Supabase SQL Editor

-- Add color column to rooms table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'color'
  ) THEN
    ALTER TABLE rooms ADD COLUMN color TEXT DEFAULT 'rgba(59, 130, 246, 0.2)';
    COMMENT ON COLUMN rooms.color IS 'RGBA color string for room fill on canvas';
  END IF;
END $$;

-- Add color columns to floor_map_shapes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'floor_map_shapes' AND column_name = 'color'
  ) THEN
    ALTER TABLE floor_map_shapes ADD COLUMN color TEXT;
    COMMENT ON COLUMN floor_map_shapes.color IS 'Fill color for shapes on canvas';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'floor_map_shapes' AND column_name = 'stroke_color'
  ) THEN
    ALTER TABLE floor_map_shapes ADD COLUMN stroke_color TEXT;
    COMMENT ON COLUMN floor_map_shapes.stroke_color IS 'Stroke/border color for shapes';
  END IF;
END $$;
```

---

## ✅ VERIFIERA ATT DET FUNGERAR

### **1. Kontrollera i Supabase Dashboard:**
```
1. Gå till "Table Editor"
2. Välj "rooms" tabellen
3. Verifiera att kolumnen "color" finns
4. Välj "floor_map_shapes" tabellen
5. Verifiera att kolumnerna "color" och "stroke_color" finns
```

### **2. Testa i applikationen:**
```
1. Öppna applikationen (npm run dev)
2. Skapa eller öppna ett rum
3. Dubbelklicka på rummet
4. Se efter "Rumsfärg på ritning" sektionen
5. ✅ Om färgväljaren visas → Migrationen lyckades!
```

### **3. Test-scenario:**
```
1. Välj en färg (t.ex. grön)
2. Klicka "Spara ändringar"
3. ✅ Toast: "Rum uppdaterat!"
4. ✅ Rummet på canvas blir grönt
5. ✅ Kantlinjen blir mörkare grön
```

---

## 🔍 FELSÖKNING

### **Fel: "permission denied for table rooms"**
```
Lösning:
- Du har inte rätt behörigheter
- Logga in som database admin
- Eller kör via Supabase Dashboard istället
```

### **Fel: "column already exists"**
```
Detta är OK!
- Migrationen är idempotent
- Den kollar om kolumnen redan finns
- Ingen skada sker om du kör den flera gånger
```

### **Färgväljare visas inte i UI**
```
Lösning:
1. Hard refresh: Cmd+Shift+R
2. Kontrollera console för fel
3. Verifiera att migrationen kördes
4. Restart dev server (npm run dev)
```

---

## 📝 VAD MIGRATIONEN GÖR

### **Tabell: `rooms`**
```sql
+ color: TEXT (default: 'rgba(59, 130, 246, 0.2)')
  └─ Rumsfärg för fyllning på canvas
```

### **Tabell: `floor_map_shapes`**
```sql
+ color: TEXT
  └─ Fyllningsfärg för shape

+ stroke_color: TEXT
  └─ Kantlinjefärg för shape (mörkare än fill)
```

### **Säkerhetscheck:**
```
Migrationen använder DO-block med IF NOT EXISTS
→ Säkert att köra flera gånger
→ Skapar bara kolumner om de inte redan finns
→ Ingen data förloras
```

---

## 🎉 EFTER MIGRATION

**Nu kan du:**
- ✅ Öppna Rumsdetaljer för vilket rum som helst
- ✅ Välja färg med färgväljare
- ✅ Se live preview av fyllning och kantlinje
- ✅ Spara och se rummet uppdateras direkt
- ✅ Ge varje rum sin egen unika färg
- ✅ Skapa visuell kategorisering av rum

**Standard färger:**
- Nya rum: Ljusblå (default)
- Befintliga rum: Behåller sin färg eller får default

**Nästa steg:**
1. Se `ROOM_COLOR_CUSTOMIZATION.md` för fullständig guide
2. Testa funktionen med olika färger
3. Skapa färgschema för dina projekt
4. **Anpassa rumsfärger efter funktion! 🎨**

---

## 💡 SNABBA KOMMANDON

```bash
# Restart dev server
npm run dev

# Öppna Supabase Dashboard
open https://supabase.com/dashboard

# Kör SQL-fil
supabase db push
```

---

**Migration klar? Testa funktionen genom att:**
1. Dubbelklicka på ett rum
2. Välj en färg
3. Spara
4. **Se rummet få ny färg! 🌈**
