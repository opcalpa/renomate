# 🚀 Snabbstart: Rita Professionell Planritning

## ✅ Ditt Verktyg Kan Detta IDAG

Baserat på din referensritning kan verktyget göra **allt** detta:

### ✅ Struktur
- Väggar med exakta tjocklekar (150mm, 200mm)
- Dörrar med svängradier (800mm, 900mm)
- Fönster och väggöppningar
- Rum med namn (VARDAGSRUM, KÖK, SOVRUM)

### ✅ Kök (Som i Din Ritning)
- Köksbänkar (600mm djup)
- Diskmaskin (DISHWASHER) 
- Tvättmaskin (WASHING MACHINE)
- Torktumlare (TUMBLE DRYER)
- Kylskåp, Spis, Ugn

### ✅ Badrum
- Badkar (700x1700mm)
- Dusch (900x900mm)
- Toalett (WC)
- Handfat

### ✅ Skalor
- **1:20** (Architectural) - Din ritning använder detta! ⭐
- 1:50 (Detailed)
- 1:100 (Standard)
- 1:500 (Overview)

### ✅ Precision
- Grid från 1cm till 5m
- Snap-to-grid
- Zoom upp till 25x
- Exakta måttangivelser

## 🎯 Rita Din Ritning (10 minuter)

### Steg 1: Setup (30 sek)
1. Öppna projektet i Canvas-läge
2. Klicka på ⚙️ (Settings)
3. Välj skala: **Architectural 1:20**
4. Aktivera Grid (⊞) och Snap (🧲)

### Steg 2: Ytterväggar (2 min)
```
1. Välj Vägg-verktyget (─)
2. Rita den yttre konturen
3. PropertyPanel → Tjocklek: 150mm
4. Färg: Svart

Tips: Använd grid-snap för perfekta mått
```

### Steg 3: Innerväggar (3 min)
```
1. Fortsätt med Vägg-verktyget
2. Dela upp i rum:
   - RUM 1, RUM 2, RUM 3
   - VARDAGSRUM
   - KÖK
   - HALL 1, HALL 2
   - KORRIDOR

3. PropertyPanel → Tjocklek: 100mm (lätta väggar)
```

### Steg 4: Dörrar & Fönster (2 min)
```
Dörrar (🚪):
- Huvudingång: 900mm
- Innerdörrar: 800mm
- Klicka på vägg där dörr ska vara

Fönster (▭):
- Standard: 1200-1400mm
- Klicka på yttervägg
```

### Steg 5: Markera Rum (1 min)
```
1. Välj Rum-verktyget (⌂)
2. Dra rektangel över varje rum
3. Dubbelklicka → Ge namn
4. Välj färg (valfritt)
```

### Steg 6: Kök & Badrum (2 min)
```
Kök:
1. Högerklicka på canvas → Symbols Library
2. Välj Kitchen-tab
3. Placera ut:
   - Floor Cabinet (köksbänk, 600mm djup)
   - Dishwasher
   - Fridge
   - Stove
   - Washing Machine + Dryer (under bänk)

Badrum:
1. Välj Bathroom-tab
2. Placera:
   - Bathtub (badkar, 700x1700mm)
   - Toilet (WC)
   - Sink (handfat)
   - Shower (dusch) om önskad
```

### Steg 7: Text & Mått (30 sek)
```
1. Välj Text-verktyget (T)
2. Klicka där du vill ha text
3. Skriv:
   - Rumsnamn: "VARDAGSRUM"
   - Mått: "3590" (mm)
   - Noteringar: "WASHING MACHINE + TUMBLE DRYER"
```

### Steg 8: Spara! (10 sek)
```
Cmd/Ctrl + S
```

## 📐 Måttexempel från Din Ritning

### Rum (från ritningen)
```
RUM 1:  2000mm x 2630mm
RUM 2:  3590mm x 2630mm
RUM 3:  2080mm x 2630mm
KORRIDOR: Full längd
KÖK: Höger del
VARDAGSRUM: Övre höger
```

### Hur Rita Detta i Verktyget:

```typescript
// 1. Ställ in skala
Skala: Architectural 1:20
Grid: 10cm, 25cm, 50cm, 1m

// 2. Rita väggar
Verktyg: Vägg
Tjocklek: 150mm (yttervägg)
Färg: Svart

// 3. Grid-snap hjälper:
2000mm = 2m = 4 rutor (om grid = 50cm)
3590mm = 3.59m ≈ 7 rutor
2080mm = 2.08m ≈ 4 rutor
```

## 🎨 Färgschema (Som i Din Ritning)

```typescript
VARDAGSRUM:  Vit/ljusgrå  rgba(255, 255, 255, 0.1)
KÖK:         Vit/ljusgrå  rgba(255, 255, 255, 0.1)  
SOVRUM:      Vit/ljusgrå  rgba(255, 255, 255, 0.1)
BADRUM:      Vit/ljusgrå  rgba(255, 255, 255, 0.1)
KORRIDOR:    Vit/ljusgrå  rgba(255, 255, 255, 0.1)

Väggar:      Svart        rgba(0, 0, 0, 1)
Text:        Svart        rgba(0, 0, 0, 1)
```

## ⌨️ Snabbkommandon

```
Shift + Dra vägg  → Perfekt horisontell/vertikal
Space + Dra       → Pan (flytta vy)
Cmd/Ctrl + +/-    → Zooma
Cmd/Ctrl + S      → Spara
Delete            → Ta bort markerat
```

## 🔥 Pro Tips

### 1. Börja Alltid Med Ytterväggar
Rita den yttre konturen först, fyll sedan i innerväggar.

### 2. Använd Grid-Snap
Med Architectural 1:20 skala:
- 1 grid-ruta = 50cm eller 25cm
- Perfekt för svenska standardmått

### 3. Organisera Logiskt
```
Ordning:
1. Ytterväggar
2. Innerväggar
3. Dörrar och fönster
4. Rum-markeringar
5. Inredning
6. Text och mått
```

### 4. Kolla Proportioner
Zooma ut (Cmd -) för att se helheten.
Zooma in (Cmd +) för att verifiera detaljer.

### 5. Spara Ofta
Efter varje större ändring: **Cmd/Ctrl + S**

## 🆚 Din Ritning vs Verktyget

| Element i Din Ritning | Hur Rita Det |
|----------------------|--------------|
| Yttre konturen | Vägg-verktyg (150mm) |
| RUM 1, 2, 3 | Innerväggar (100mm) + Rum-verktyg |
| Dörrar med bågar | Dörr-verktyg (auto-båge) |
| Fönster | Väggöppning-verktyg |
| KORRIDOR text | Text-verktyg (T) |
| 2000, 3590 mått | Text-verktyg (T) |
| WASHING MACHINE | Symbols → Kitchen → Washing Machine |
| TUMBLE DRYER | Symbols → Kitchen → Dryer |
| Badkar | Symbols → Bathroom → Bathtub |
| WC | Symbols → Bathroom → Toilet |
| Handfat | Symbols → Bathroom → Sink |
| Köksbänkar | Symbols → Kitchen → Floor Cabinet |
| Titelblock | ⚠️ Lägg till manuellt (framtida feature) |

## 🎬 Nästa Steg

1. **Fixa Sparning-problemet** (om ej klart):
   ```bash
   Kör: fix-canvas-save.sql i Supabase Dashboard
   ```

2. **Rita en testritning**:
   - Börja enkelt: En rektangel med 2 rum
   - Lägg till en dörr
   - Spara och refresha
   - Verifiera att allt finns kvar

3. **Rita din riktiga ritning**:
   - Följ stegen ovan
   - Ta det lugnt
   - Spara ofta!

## ✅ Du Är Redo!

Ditt verktyg har **alla funktioner** som behövs för att rita professionella planritningar på samma nivå som din referensritning.

**Börja rita nu!** 🚀

---

**Problem?** → Kolla `FIXA_SPARNING.md`
**Mer detaljer?** → Kolla `PROFESSIONELLA_RITNINGAR.md`
