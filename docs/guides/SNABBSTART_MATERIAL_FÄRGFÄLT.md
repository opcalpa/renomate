# 🚀 Snabbstart: Material- och Färgfält

## ✨ Vad Är Nytt?

4 nya fält i Rumsdetaljer för att specificera material och färger:

- 📦 **Material** - Golv, väggar, allmänt
- 🎨 **Väggfärg** - Kulör för väggarna
- ☁️ **Takfärg** - Kulör för taket
- 🪵 **Snickerifärg** - Kulör för snickerier/karmar

## ⚡ Setup (2 minuter)

### Steg 1: Kör SQL (1 minut)
```bash
# Supabase Dashboard → SQL Editor
# Kör: supabase/add_room_material_fields.sql
```

### Steg 2: Refresha (10 sekunder)
```bash
# Refresha browsern (F5)
```

### Steg 3: Testa! (30 sekunder)
```
1. Dubbelklicka på rum
2. Scrolla ner under "Bilder"
3. Se de 4 nya fälten
4. Fyll i och spara!
✅ Klart!
```

## 📍 Var Finns Det?

```
Projekt → Canvas → Dubbelklicka rum → Rumsdetaljer
                                           ↓
                                    Under "Bilder"
                                           ↓
                              Material- och färgfält
```

## 💡 Snabbexempel

### Vardagsrum
```
Material:      Trägolv, ek
Väggfärg:      NCS S 0502-Y
Takfärg:       Vit
Snickerifärg:  Alcro Silkesvit
```

### Kök
```
Material:      Klinker, ljusgrå
Väggfärg:      NCS S 0300-N
Takfärg:       Vit
Snickerifärg:  Vit
```

### Sovrum
```
Material:      Parkettgolv
Väggfärg:      NCS S 2010-Y90R (rosa)
Takfärg:       Vit
Snickerifärg:  Vit
```

## 🎯 Tips

### Tip 1: Använd NCS-koder
```
✅ "NCS S 0502-Y" (exakt kulör)
❌ "Vit" (för vagt)
```

### Tip 2: Ange Varumärke
```
✅ "Alcro Silkesvit"
✅ "Beckers Finess"
```

### Tip 3: Beskriv Material Detaljerat
```
✅ "Trägolv, ek, mattlackerad"
❌ "Trä" (för vagt)
```

## 📊 Layout

```
┌──────────────────────────┐
│ Rumsnamn *               │
│ Rumsbeskrivning          │
│ Bilder                   │
│                          │
│ Material                 │ ← NYT!
│ Väggfärg                 │ ← NYT!
│ Takfärg                  │ ← NYT!
│ Snickerifärg             │ ← NYT!
│                          │
│ Rumsfärg på ritning      │
└──────────────────────────┘
```

## 🔧 Vad Har Implementerats?

**Databas:**
- ✅ `material` kolumn
- ✅ `wall_color` kolumn
- ✅ `ceiling_color` kolumn
- ✅ `trim_color` kolumn

**UI:**
- ✅ 4 input-fält
- ✅ Placeholders med exempel
- ✅ Auto-spara med Save-knapp

**Dokumentation:**
- ✅ `MATERIAL_FÄRGFÄLT_RUM.md` - Detaljerad guide
- ✅ `SNABBSTART_MATERIAL_FÄRGFÄLT.md` - Denna fil

## ✅ Sammanfattning

**Nya fält:**
1. Material - Golv/väggar
2. Väggfärg - Kulör väggar
3. Takfärg - Kulör tak
4. Snickerifärg - Kulör snickerier

**Setup:**
1. Kör SQL (1 minut)
2. Refresha (10 sek)
3. Fyll i fält! (direkt)

**Användning:**
- Dokumentera material/färger
- Planera renovering
- Shopping-lista
- Instruktioner till hantverkare

---

**Börja dokumentera dina rum med exakta specifikationer!** 🎨

**Detaljerad guide:** `MATERIAL_FÄRGFÄLT_RUM.md`
