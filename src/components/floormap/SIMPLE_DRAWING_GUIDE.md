# Förenklat Space Planner Ritverktyg

## 📐 Översikt

Ett intuitivt och enkelt ritverktyg för att skapa planlösningar av renoveringsobjekt. Fokus på enkelhet och användarvänlighet.

## 🎨 Verktyg

### 1. **Markera (Select)** - Tangent: `V`
- Välj och flytta ritade objekt
- Ändra storlek genom att dra i handtagen vid start/slut
- Klicka på ett objekt för att markera det
- Dra objekt för att flytta dem

### 2. **Penna (Freehand)** - Tangent: `P`
- Rita frihandslinjer
- Håll in musknappen och dra över canvas
- Perfekt för snabba skisser och kurvor
- Linjer följer din musrörelse

### 3. **Vägg (Wall)** - Tangent: `W`
- Rita raka väggar
- Klicka och dra för att skapa en rak linje
- Tjockare linjer (6px) för tydliga väggar
- Perfekt för att rita grundplaner

### 4. **Sudd (Eraser)** - Tangent: `E`
- Radera ritade objekt
- Klicka på ett objekt för att ta bort det
- Snabbt sätt att radera misstag
- Alternativt: markera med V och tryck Delete

## 📏 Grid System

### Skalenligt Rutnät
- **1 ruta = 50cm** (500mm)
- **Varje 5:e linje = 2.5m** (tjockare, grå linje)
- Skalalabels visas automatiskt

### Grid-funktioner
- **Visa/Dölj rutnät**: Tangent `G` eller klicka på rutnätsikonen
- **Snäpp till rutnät**: Aktivera med magneten-ikonen
- Rutnätet hjälper till att rita raka linjer och exakta mått

## ⌨️ Tangentbordsgenvägar

| Tangent | Funktion |
|---------|----------|
| `V` | Markera-verktyg |
| `P` | Penna-verktyg |
| `W` | Vägg-verktyg |
| `E` | Sudd-verktyg |
| `G` | Visa/dölj rutnät |
| `Ctrl/Cmd + Z` | Ångra |
| `Ctrl/Cmd + Y` | Gör om |
| `Ctrl/Cmd + S` | Spara |
| `Ctrl/Cmd + Scroll` | Zooma in/ut |
| `Delete` / `Backspace` | Ta bort markerat objekt |

## 🎯 Användning

### Rita en vägg:
1. Tryck `W` eller klicka på vägg-ikonen
2. Klicka där väggen ska börja
3. Dra musen till där väggen ska sluta
4. Släpp musknappen

### Rita frihandslinjer:
1. Tryck `P` eller klicka på penna-ikonen
2. Håll in musknappen
3. Rita genom att dra musen
4. Släpp musknappen när du är klar

### Flytta och ändra storlek:
1. Tryck `V` eller klicka på markera-ikonen
2. **Single-click**: Klicka på ett objekt för att markera det
   - En dimension-popup visas med objektets längd
   - Dra objektet för att flytta det
   - Dra i de blå handtagen för att ändra storlek
3. **Double-click**: Dubbelklicka på objektet
   - Öppnar detaljerad properties panel till höger
   - Visa exakta dimensioner (m, cm, mm)
   - Lägg till beskrivning och anteckningar
   - Kommentera och diskutera med teamet

### Ta bort objekt:
**Alternativ 1 - Med Sudd:**
1. Tryck `E` för sudd-verktyget
2. Klicka på objektet du vill ta bort

**Alternativ 2 - Med Markera:**
1. Markera objektet med `V`-verktyget
2. Tryck `Delete` eller `Backspace`

### Zooma:
- **Zooma in/ut**: Håll `Ctrl/Cmd` och scrolla med musen
- **Zoomcentrum**: Zoomen centreras kring muspekaren
- **Zoomnivå**: Visas nere till vänster (10% - 500%)
- **Pan**: Dra med mellanmusknappen (eller håll Space + dra)

## 💾 Sparning

- **Auto-sparar** var 2:e sekund efter ändringar
- **Manuell sparning**: Tryck `Ctrl/Cmd + S` eller klicka på spara-ikonen
- Sparindikator visas nere till höger när sparning pågår

## 🎨 Visuella Indikatorer

- **Blå markering**: Visar markerat objekt
- **Blå handtag**: Visa var du kan ändra storlek
- **Dimension-popup**: Vit popup med objektets längd (visas vid single-click)
- **Properties panel**: Höger sidopanel med alla detaljer (öppnas vid double-click)
- **Tjocka grå linjer**: Väggar (6px)
- **Tunna svarta linjer**: Frihandslinjer (2px)
- **Grå rutnät**: Hjälper med precision
- **Tjockare rutnätslinjer**: Varje 2.5m för skala
- **Zoomindikator**: Nere till vänster, visar aktuell zoom (%)
- **"Dubbelklicka för detaljer"**: Hint i dimension-popup

## 🔧 Teknisk Information

### Koordinatsystem
- **1 pixel = 10mm** vid standard zoom
- **50px grid = 500mm = 50cm**
- Alla koordinater lagras i millimeter för precision

### Snap-to-Grid
- Aktivt by default
- Snappar till närmaste 50px (50cm)
- Kan inaktiveras med magneten-ikonen

### Performance
- Lättviktig canvas-rendering
- Minimal minnesanvändning
- Snabb responsivitet

## 📝 Anteckningar per Objekt

Varje ritat objekt kan ha egna anteckningar:
- Instruktioner för hantverkare
- Material specifikationer  
- Viktiga detaljer
- Team-diskussioner och kommentarer

**✅ Implementerat!** Dubbelklicka på ett objekt för att öppna properties panel där du kan:
- Lägga till beskrivning och anteckningar
- Se exakta dimensioner
- Kommentera och tagga teammedlemmar

## ✅ Implementerade Funktioner

✅ **4 Ritverktyg** - Markera, Penna, Vägg, Sudd  
✅ **Skalenligt grid** - 50cm rutor med 2.5m markeringar  
✅ **Snap-to-grid** - Precision utan ansträngning (kan togglas)  
✅ **Drag-to-draw** - Rita genom att dra musen  
✅ **Select & Resize** - Markera objekt och ändra storlek via handtag  
✅ **Dimension popup** - Single-click visar objektets längd i m/cm/mm  
✅ **Properties panel** - Double-click öppnar detaljerad panel  
✅ **Beskrivning & Anteckningar** - Lägg till text per objekt med auto-save  
✅ **Kommentarssystem** - Diskutera objekt med teamet, tagga medlemmar  
✅ **Visual feedback** - Blå markeringar och handtag  
✅ **Auto-sparning** - Sparar automatiskt var 2:e sekund  
✅ **Keyboard shortcuts** - V, P, W, E, G för snabbt arbetsflöde  
✅ **Eraser tool** - Radera objekt direkt med E-verktyget  
✅ **Delete support** - Ta bort objekt med Delete eller Backspace  
✅ **Undo/Redo** - Fullständig historik (Ctrl+Z / Ctrl+Y)  
✅ **Zoom & Pan** - Zooma med Ctrl+Scroll, panorera med mellanmusknappen  
✅ **Zoomindikator** - Se aktuell zoomnivå (10% - 500%)  
✅ **Smart koordinatsystem** - Millimeter-baserat för precision

## 🚀 Kommande Funktioner

- [ ] Objektbibliotek (dörrar, fönster, möbler)
- [ ] Måttangivelser direkt på canvas (permanenta labels)
- [ ] Export till PDF/PNG
- [ ] Rum-etiketter och area-beräkning
- [ ] Flera ritningsplan (våningsplan)
- [ ] Lager-system (layers)
- [ ] Objektfärger och stilar
- [ ] 3D-förhandsgranskning
