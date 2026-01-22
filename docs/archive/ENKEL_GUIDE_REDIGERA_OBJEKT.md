# 🎨 ENKEL GUIDE: Redigera Objekt (Steg-för-Steg)

## 📍 Steg 1: Hitta Settings-Knappen

**Var är den?**
På vänster sida, under "Objekt"-sektionen i toolbaren:

```
TOOLBAR (Vänster sida av skärmen):
┌─────────────┐
│             │
│   [🖱️]      │ ← Markera
│   [✏️]      │ ← Rita
│   [—]       │ ← Vägg
│   [🚪]      │ ← Dörr
│   [◯]       │ ← Rum
│   [🗑️]      │ ← Radera
│             │
│   Objekt:   │
│   [🏠 🛋️ 💡] │ ← Objekt-väljare (SymbolSelector)
│   [⚙️]      │ ← **KLICKA HÄR!** (Settings-ikon)
│             │    "Hantera Objektbibliotek"
│   ...       │
└─────────────┘
```

**👆 KLICKA PÅ KUGGHJULET (⚙️)!**

---

## 📍 Steg 2: Objektbibliotek Öppnas

En stor dialog öppnas med två delar:

```
┌────────────────────────────────────────────────────────────────┐
│  Objektbibliotek                                        [✕]    │
├──────────────────┬─────────────────────────────────────────────┤
│  VÄNSTER PANEL   │  HÖGER PANEL (Tomt först)                   │
│  (Objektlista)   │                                             │
│                  │                                             │
│  [🔍 Sök...]     │  Välj ett objekt till vänster              │
│                  │  för att se detaljer här →                 │
│  🚽 Toalett      │                                             │
│  🚰 Handfat      │                                             │
│  🛁 Badkar       │                                             │
│  🚿 Dusch        │                                             │
│  🍳 Spis         │                                             │
│  🧊 Kylskåp      │                                             │
│  ...             │                                             │
│                  │                                             │
│  [+ Skapa nytt]  │                                             │
│  [⬇️ Exportera]  │                                             │
│  [⬆️ Importera]  │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

---

## 📍 Steg 3: Välj ett Objekt

**Klicka på ett objekt i vänsterpanelen**, t.ex. **"🚽 Toalett"**

```
┌────────────────────────────────────────────────────────────────┐
│  Objektbibliotek                                        [✕]    │
├──────────────────┬─────────────────────────────────────────────┤
│  🚽 Toalett ←────┼─ ✅ MARKERAT (blå bakgrund)                 │
│  🚰 Handfat      │                                             │
│  🛁 Badkar       │  📦 Toalett (Standard)                      │
│  🚿 Dusch        │  🏷️ Kategori: bathroom                      │
│  ...             │  📏 Storlek: 500×700mm                      │
│                  │                                             │
│                  │  🔧 [Redigera]  [📋 Duplicera]  [🗑️ Radera]│ ← KLICKA "Redigera"!
│                  │                                             │
│                  │  Beskrivning:                               │
│                  │  Standard toalett för planlösning...        │
│                  │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

**👆 KLICKA PÅ "Redigera"-KNAPPEN!**

---

## 📍 Steg 4: Visuell Editor Öppnas!

Nu ser du **2 FLIKAR** högst upp:

```
┌────────────────────────────────────────────────────────────────┐
│  Redigera: Toalett                                      [✕]    │
├──────────────────┬─────────────────────────────────────────────┤
│  🚽 Toalett      │  ┌────────────────────────────────────────┐ │
│  🚰 Handfat      │  │ [Visuell Editor] │ [JSON (Avancerat)] │ │ ← FLIKAR!
│  ...             │  └────────────────────────────────────────┘ │
│                  │                                             │
│                  │  🛠️ VERKTYG:                                │
│                  │  [👆Markera] [─Linje] [○Cirkel] [□Rekt]   │
│                  │  [Ångra] [Gör om] [Radera]                │
│                  │                                             │
│                  │  🎨 CANVAS (Rita här!):                    │
│                  │  ┌────────────────────┬────────────────┐   │
│                  │  │   Grid 50mm        │  Egenskaper    │   │
│                  │  │                    │  ────────────  │   │
│                  │  │    (Toaletten      │  Typ: ellipse  │   │
│                  │  │     visas här)     │  X: 250mm      │   │
│                  │  │                    │  Y: 400mm      │   │
│                  │  │                    │  Radie: 200mm  │   │
│                  │  │                    │  Färg: [■]     │   │
│                  │  └────────────────────┴────────────────┘   │
│                  │                                             │
│                  │  [💾 Spara]  [❌ Avbryt]                   │
└──────────────────┴─────────────────────────────────────────────┘
```

**Detta är den VISUELLA EDITORN!** ✨

---

## 🎨 Steg 5: RITA eller REDIGERA!

### **Alternativ A: Redigera Befintlig Form**

**1. Klicka på verktyget "👆 Markera"** (eller tryck **V**)

**2. Klicka på en form på canvasen**
```
Canvas:
┌─────────────────┐
│                 │
│    ● ← Klicka!  │  (t.ex. toalettskålen)
│                 │
└─────────────────┘
```

**3. Högerpanelen visar egenskaper:**
```
Egenskaper:
─────────────────
Typ: ellipse
Center X: 250 mm  ← Ändra genom att skriva nytt värde
Center Y: 400 mm
Radie: 200 mm     ← Ändra storlek här!

Linjefärg: [■] ← Klicka för att välja färg
Linjetjocklek: 2px [──────●───] ← Dra slider
Fyllnadsfärg: [Tom] [■]
Genomskinlighet: 100% [────────●]
```

**4. Klicka "💾 Spara" längst ner!**

---

### **Alternativ B: Rita Nya Former**

**1. Välj ett ritverktyg:**

#### **Linje** (─)
```
1. Klicka verktyget "─ Linje" (eller tryck L)
2. Klicka på canvas där linjen ska börja
3. Dra musen till slutpunkt
4. Släpp musknappen
✅ Linje skapad!
```

#### **Cirkel** (○)
```
1. Klicka verktyget "○ Cirkel" (eller tryck C)
2. Klicka på canvas där centrum ska vara
3. Dra musen utåt för radie
4. Släpp musknappen
✅ Cirkel skapad!
```

#### **Rektangel** (□)
```
1. Klicka verktyget "□ Rektangel" (eller tryck R)
2. Klicka på canvas (ett hörn)
3. Dra diagonalt till motsatt hörn
4. Släpp musknappen
✅ Rektangel skapad!
```

**2. Klicka "💾 Spara" längst ner!**

---

## 🔧 Steg 6: Ändra Utseende

### **Ändra Färg:**
```
1. Markera formen (klicka på den)
2. I högerpanelen: Klicka på färgrutan [■]
3. Välj ny färg i color picker
4. Färgen ändras LIVE på canvas!
```

### **Ändra Tjocklek:**
```
1. Markera formen
2. I högerpanelen: Dra slider "Linjetjocklek"
3. Tjockleken ändras LIVE!
```

### **Flytta Form:**
```
1. Klicka "👆 Markera" (V)
2. Klicka på formen
3. DRAR den till ny position
4. Släpp
✅ Form flyttad!
```

### **Radera Form:**
```
1. Markera formen
2. Tryck Delete eller Backspace
ELLER
2. Klicka knappen "🗑️ Radera" i toolbar
✅ Form raderad!
```

---

## 💾 Steg 7: Spara Dina Ändringar

**VIKTIGT:** Klicka **"💾 Spara"** längst ner i dialogen!

```
┌────────────────────────────────────────┐
│                                        │
│  ... Canvas och redigering ...        │
│                                        │
├────────────────────────────────────────┤
│  [💾 Spara]  [❌ Avbryt]               │ ← KLICKA "Spara"!
└────────────────────────────────────────┘
```

**Efter sparning:**
- ✅ Objektet uppdateras i biblioteket
- ✅ Alla framtida placements använder din design
- ✅ Sparas i localStorage (persistent)

---

## 🎯 KOMPLETT EXEMPEL: Ändra Eluttag till Röd Färg

### **Steg-för-steg:**

**1. Öppna Objektbibliotek**
```
Toolbar → Klicka ⚙️ (Settings-ikon under "Objekt")
```

**2. Hitta Eluttag**
```
I sökrutan: Skriv "eluttag"
ELLER
Scrolla i listan tills du ser: ⚡ Eluttag (Standard)
```

**3. Klicka på "⚡ Eluttag (Standard)"**
```
Listan → Höger panel visar info
```

**4. Klicka "Redigera"**
```
Höger panel → [🔧 Redigera] knapp
```

**5. Se Visuell Editor**
```
Flikar → "Visuell Editor" (redan vald)
```

**6. Markera yttre cirkeln**
```
Toolbar → Klicka [👆 Markera] (eller tryck V)
Canvas → Klicka på den stora cirkeln
→ Höger panel visar egenskaper
```

**7. Ändra färg till röd**
```
Högerpanel → "Linjefärg" → Klicka färgrutan [■]
Color picker → Välj röd (#FF0000)
→ Cirkeln blir röd DIREKT på canvas!
```

**8. Spara**
```
Längst ner → [💾 Spara]
→ Toast-meddelande: "Objekt sparat!"
```

**9. Stäng dialogen**
```
Klicka [✕] uppe till höger
```

**10. Använd objektet**
```
Toolbar → Objekt-väljare → Välj "Eluttag"
Klicka på canvas → Placera objektet
✅ Eluttaget är nu RÖTT!
```

**KLART!** 🎉

---

## 🆘 "Jag ser inget på Canvas!"

### **Problem:** Canvas är tom eller grå

**Lösning 1: Zooma ut**
```
Toolbar i Visual Editor → Klicka [⟲] (Återställ zoom)
ELLER
Klicka [-] flera gånger för att zooma ut
```

**Lösning 2: Objektet har inga former än**
```
Om du skapade ett NYTT objekt:
→ Rita former med ritverktygen först!

Om du redigerar BEFINTLIGT objekt:
→ Det ska synas direkt. Zooma ut för att hitta det.
```

**Lösning 3: Former är utanför viewport**
```
Objektet kan vara ritat utanför synligt område.
→ Klicka [⟲] för att återställa zoom och pan.
```

---

## 🆘 "Jag kan inte flytta former!"

**Problem:** Former rör sig inte när jag drar dem

**Lösning:**
```
1. Klicka verktyget [👆 Markera] (eller tryck V)
2. NU kan du markera och dra former!

OBS: Om du har t.ex. "─ Linje" aktiverat, då RITAR du linjer istället.
```

---

## 🆘 "Jag råkade radera något!"

**Lösning:**
```
Tryck Cmd+Z (Mac) eller Ctrl+Z (Windows)
→ Ångra!

Du kan ångra obegränsat antal gånger.
```

---

## 🆘 "Vad är Grid?"

**Grid = Rutnät**
```
Canvas har ett 50mm × 50mm rutnät (ljusgrå linjer).
Hjälper dig:
- Rita rakt
- Hålla symmetri
- Positionera exakt

Du ser det som:
┌───┬───┬───┬───┐
│   │   │   │   │
├───┼───┼───┼───┤
│   │   │   │   │
└───┴───┴───┴───┘
```

---

## 🆘 "Vad är Origo (0,0)?"

**Origo = Startpunkt**
```
Röd prick i övre vänstra hörnet.
Alla koordinater räknas från denna punkt:

(0,0) ──────→ X ökar åt höger
 │
 │
 ↓
 Y ökar nedåt
```

---

## 🆘 "Vad är Objektgränser?"

**Objektgränser = Blå streckad rektangel**
```
┌ ─ ─ ─ ─ ─ ─ ─ ┐  ← Blå streckad box
│               │
│   Ditt objekt │  Rita INUTI denna box
│               │  (Storlek = defaultWidth × defaultHeight)
│               │
└ ─ ─ ─ ─ ─ ─ ─ ┘

Om du ritar UTANFÖR, funkar det fortfarande,
men objektet kan se konstigt ut när du placerar det.
```

---

## 🎯 Snabbkommandon

### **Ritverktyg:**
```
V = Markera
L = Linje
C = Cirkel
R = Rektangel
E = Ellips
```

### **Åtgärder:**
```
Delete / Backspace = Radera markerad form
Cmd+Z / Ctrl+Z = Ångra
Cmd+Shift+Z / Ctrl+Shift+Z = Gör om
```

---

## 📝 Sammanfattning

### **För att REDIGERA ett objekt:**
```
1. Toolbar → Klicka ⚙️ (Settings-ikon)
2. Välj objekt i listan
3. Klicka "Redigera"
4. Fliken "Visuell Editor" (redan vald)
5. Markera form → Ändra i höger panel
6. ELLER: Rita nya former med ritverktyg
7. Klicka "💾 Spara"
✅ KLART!
```

### **För att SKAPA nytt objekt:**
```
1. Toolbar → Klicka ⚙️
2. Klicka "Skapa nytt"
3. Fyll i namn, kategori, storlek
4. Klicka "Redigera"
5. Rita former med ritverktyg
6. Klicka "💾 Spara"
✅ KLART!
```

---

## 🎉 Du är redo!

**Nu vet du:**
- ✅ Var Settings-knappen är (⚙️ under "Objekt")
- ✅ Hur du öppnar Objektbibliotek
- ✅ Hur du väljer ett objekt
- ✅ Hur du öppnar Visuell Editor
- ✅ Hur du använder ritverktyg
- ✅ Hur du ändrar färg och storlek
- ✅ Hur du sparar dina ändringar

**Prova nu!** 🚀

*Har du fortfarande frågor? Läs:*
- *Detaljerad guide: `VISUAL_OBJECT_EDITOR_GUIDE.md`*
- *Systemöversikt: `COMPLETE_OBJECT_LIBRARY_SYSTEM.md`*
