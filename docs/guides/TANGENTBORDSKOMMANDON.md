# 🎹 TANGENTBORDSKOMMANDON - FLOOR MAP EDITOR

**Komplett guide för alla keyboard shortcuts på både Windows och Mac**

---

## 📋 ÖVERSIKT

Alla kommandon fungerar både på **Windows (Ctrl)** och **Mac (⌘ Cmd)** tangentbord.

---

## ⌨️ FULLSTÄNDIG KOMMANDO-LISTA

### 🔄 REDIGERING

| Funktion | Windows | Mac | Beskrivning |
|----------|---------|-----|-------------|
| **Ångra** | `Ctrl + Z` | `⌘ + Z` | Ångra senaste ändring |
| **Gör om** | `Ctrl + Y` | `⌘ + Shift + Z` | Återställ ångrad ändring |
| **Kopiera** | `Ctrl + C` | `⌘ + C` | Kopiera markerade objekt till clipboard |
| **Klistra in** | `Ctrl + V` | `⌘ + V` | Klistra in från clipboard (20px offset) |
| **Duplicera** | `Ctrl + D` | `⌘ + D` | Duplicera markerade objekt (20px offset) |
| **Ta bort** | `Delete` / `Backspace` | `Delete` / `Backspace` | Ta bort markerade objekt |

---

### 🎯 MARKERING

| Funktion | Windows | Mac | Beskrivning |
|----------|---------|-----|-------------|
| **Markera allt** | `Ctrl + A` | `⌘ + A` | Markera alla objekt på canvas |
| **Box-markering** | Dra med musen | Dra med musen | Dra för att markera flera objekt |
| **Multi-markering** | `Shift + Klick` | `Shift + Klick` | Lägg till/ta bort från markering |
| **Avmarkera** | `Klick på tom yta` | `Klick på tom yta` | Avmarkera alla objekt |
| **Escape** | `Esc` | `Esc` | Avbryt vägg-chaining eller ritning |

---

### 🔍 NAVIGATION & ZOOM

| Funktion | Windows | Mac | Beskrivning |
|----------|---------|-----|-------------|
| **Zooma in** | `Ctrl + +` | `⌘ + +` | Zooma in på canvas |
| **Zooma ut** | `Ctrl + -` | `⌘ + -` | Zooma ut från canvas |
| **Scroll-zoom** | `Ctrl + Scroll` | `⌘ + Scroll` | Zooma med mushjul |
| **Panorera** | `Mellanmusknapp` | `Mellanmusknapp` | Dra för att panorera |
| **Panorera (space)** | `Space + Dra` | `Space + Dra` | Håll space och dra för att panorera |
| **Tvåfinger-scroll** | `Tvåfinger-scroll` | `Tvåfinger-scroll` | Panorera i alla riktningar |

---

### 🎨 RITNING & VERKTYG

| Funktion | Windows | Mac | Beskrivning |
|----------|---------|-----|-------------|
| **Visa/dölj rutnät** | `G` | `G` | Växla rutnäts-synlighet |
| **Snap till grid** | *Toolbar-knapp* | *Toolbar-knapp* | Aktivera/avaktivera snap-to-grid |
| **Rotation snap** | `Shift + Rotera` | `Shift + Rotera` | Snäpp till 45° vid rotation |
| **Avbryt ritning** | `Esc` | `Esc` | Avbryt pågående vägg/form-ritning |

---

### 💾 SPARA

| Funktion | Windows | Mac | Beskrivning |
|----------|---------|-----|-------------|
| **Spara** | `Ctrl + S` | `⌘ + S` | Spara ritning till databas |
| *Auto-save* | *Automatiskt* | *Automatiskt* | Sparas automatiskt efter varje ändring |

---

## 🔧 TEKNISK IMPLEMENTATION

### OS-Detection
```typescript
const isMac = typeof navigator !== 'undefined' 
  && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey;
```

### Key Detection
- **Mac**: Använder `e.metaKey` (⌘ Command-tangenten)
- **Windows**: Använder `e.ctrlKey` (Ctrl-tangenten)
- **Shift**: Använder `e.shiftKey` för modifierare (t.ex. Redo på Mac)
- **Lowercase**: Alla bokstäver konverteras till lowercase: `e.key.toLowerCase()`

### Redo-logik
```typescript
// Mac: Cmd + Shift + Z
if (isMac && e.shiftKey && e.key.toLowerCase() === 'z')

// Windows: Ctrl + Y
if (!isMac && e.key.toLowerCase() === 'y')
```

---

## 📝 EXEMPEL: WORKFLOW

### Skapa och redigera rum
```
1. Välj vägg-verktyg
2. Rita väggar (klicka för varje punkt)
3. Tryck Esc för att avsluta
4. Ctrl/Cmd + D för att duplicera
5. Ctrl/Cmd + Z om du gjorde fel
6. Ctrl/Cmd + A för att markera allt
7. Shift + Rotera för exakt 45° rotation
8. Ctrl/Cmd + S för att spara
```

### Kopiera rum-layout
```
1. Markera alla väggar (Ctrl/Cmd + A eller box-selection)
2. Kopiera (Ctrl/Cmd + C)
3. Klistra in (Ctrl/Cmd + V)
4. Objekten placeras 20px till höger/ner
5. Upprepa för att skapa grid av rum
```

---

## 🎯 TIPS & TRICKS

### Multi-Selection
```
• Box-selection: Dra över flera objekt
• Shift-click: Lägg till individuella objekt
• Ctrl/Cmd + A: Markera allt på en gång
• Delete: Ta bort alla markerade samtidigt
```

### Precision Editing
```
• Grid Snap: Aktivera för exakta placeringar
• Shift + Rotate: Snäpp till 45° för symmetri
• Space + Dra: Panorera utan att ändra markering
• Escape: Avbryt pågående operation
```

### Snabbt arbetsflöde
```
• Ctrl/Cmd + D: Duplicera för repetitiva element
• Ctrl/Cmd + C/V: Kopiera mellan olika planer
• Ctrl/Cmd + Z: Ångra experimentella ändringar
• G: Växla rutnät snabbt för olika vyer
```

---

## ⚠️ KONFLIKT-HANTERING

### Input-fält
Alla shortcuts är **automatiskt inaktiverade** när du skriver i:
- Text-input fält
- Textarea
- Dialog-formulär
- Room naming

### Ctrl på Mac
På Mac kontrollerar vi att **endast Cmd fungerar**, inte Ctrl:
```typescript
const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey;
```

Detta förhindrar att både Cmd och Ctrl triggar samma shortcut.

---

## 🧪 TESTNING

### Test 1: Undo/Redo
```bash
Windows:
1. Rita en vägg
2. Tryck Ctrl + Z (ångra)
3. Tryck Ctrl + Y (gör om)
✅ Väggen försvinner och återkommer

Mac:
1. Rita en vägg
2. Tryck ⌘ + Z (ångra)
3. Tryck ⌘ + Shift + Z (gör om)
✅ Väggen försvinner och återkommer
```

### Test 2: Copy/Paste
```bash
Windows:
1. Rita en fyrkant med Shapes
2. Markera alla (Ctrl + A)
3. Kopiera (Ctrl + C)
4. Klistra in (Ctrl + V)
✅ "4 objekt kopierade" → "4 objekt inklistrade"

Mac:
1. Rita en fyrkant med Shapes
2. Markera alla (⌘ + A)
3. Kopiera (⌘ + C)
4. Klistra in (⌘ + V)
✅ "4 objekt kopierade" → "4 objekt inklistrade"
```

### Test 3: Duplicate
```bash
Windows:
1. Skapa en cirkel-shape
2. Markera alla väggar
3. Tryck Ctrl + D
✅ "8 objekt duplicerade" (cirkel har 8 väggar)

Mac:
1. Skapa en cirkel-shape
2. Markera alla väggar
3. Tryck ⌘ + D
✅ "8 objekt duplicerade"
```

### Test 4: Select All
```bash
Windows:
1. Skapa flera objekt (väggar, rum, text)
2. Tryck Ctrl + A
✅ "X objekt markerade" (alla blir blå)

Mac:
1. Skapa flera objekt
2. Tryck ⌘ + A
✅ "X objekt markerade"
```

### Test 5: Rotation Snap
```bash
Både Windows & Mac:
1. Skapa en fyrkant-shape
2. Markera den (klicka på en vägg)
3. Håll Shift nedtryckt
4. Rotera med rotation-handlen
✅ Snäpper till 0°, 45°, 90°, 135°, 180°, etc.
```

---

## 📊 SUMMARY

| Feature | Windows | Mac | Status |
|---------|---------|-----|--------|
| **Undo** | Ctrl+Z | ⌘+Z | ✅ Working |
| **Redo** | Ctrl+Y | ⌘+Shift+Z | ✅ Working |
| **Copy** | Ctrl+C | ⌘+C | ✅ Working |
| **Paste** | Ctrl+V | ⌘+V | ✅ Working |
| **Duplicate** | Ctrl+D | ⌘+D | ✅ Working |
| **Select All** | Ctrl+A | ⌘+A | ✅ Working |
| **Delete** | Del/Backspace | Del/Backspace | ✅ Working |
| **Save** | Ctrl+S | ⌘+S | ✅ Working |
| **Zoom In** | Ctrl++ | ⌘++ | ✅ Working |
| **Zoom Out** | Ctrl+- | ⌘+- | ✅ Working |
| **Grid Toggle** | G | G | ✅ Working |
| **Escape** | Esc | Esc | ✅ Working |
| **Shift+Rotate** | Shift | Shift | ✅ Working |

---

## 🎉 ALLA KOMMANDON FUNGERAR!

Systemet detekterar automatiskt om användaren har **Windows** eller **Mac** och anpassar:
- Keyboard shortcuts (Ctrl vs Cmd)
- Tooltip-texter i UI
- Key event detection
- Modifier key logic

**Inget manuellt val behövs - fungerar automatiskt! 🚀**
