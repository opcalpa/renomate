# ✅ Fix: Väggritning & Snap-to-Grid

## Datum: 2026-01-19

### Problem som fixades:

1. **❌ Kunde inte rita väggar utan att markera befintliga väggar**
2. **❌ Väggar snappade INTE till gridlines**

---

## ✅ Lösning 1: Rita väggar utan att markera dem

### Problem
När väggverktyget var aktivt, markerades befintliga väggar när man försökte rita nya väggar från deras slutpunkter. Detta gjorde det omöjligt att kedja ihop väggar smidigt.

### Fix
```typescript
// I WallShape-komponenten:
const isDrawingWalls = activeTool === 'wall';
const canSelect = !isDrawingWalls;

// Uppdaterad Line-komponent:
<Line
  draggable={canSelect}          // Endast dragbar när INTE i ritläge
  onClick={canSelect ? onSelect : undefined}   // Endast klickbar när INTE i ritläge
  onTap={canSelect ? onSelect : undefined}     // Endast tappbar när INTE i ritläge
  listening={canSelect}           // Ignorera ALL interaktion när väggverktyget är aktivt
/>
```

### Resultat
✅ När väggverktyget är aktivt:
- Befintliga väggar är **inte klickbara**
- Befintliga väggar är **inte dragbara**
- Befintliga väggar **ignoreras helt**
- Du kan rita nya väggar direkt från gamla väggars slutpunkter
- **Perfekt för att kedja ihop väggar!**

✅ När markeringsverktyget är aktivt:
- Väggar är klickbara och dragbara som vanligt
- Fullständig redigering möjlig

---

## ✅ Lösning 2: Väggar snappar ALLTID till gridlines

### Problem
Väggar snappade inte korrekt till gridlines under ritning, vilket gjorde det omöjligt att rita exakta väggar.

### Fix
```typescript
// I handleMouseMove (under drawing):
// Snap to grid (ALWAYS enabled for walls for precision)
const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm);
const shouldSnap = activeTool === 'wall' || gridSettings.snap;
pos = snapToGrid(pos, currentSnapSize, shouldSnap);
```

### Snap-storlekar baserat på zoom:
```typescript
Zoom < 0.5:   Snap till 2m   (byggnadsöversikt)
Zoom 0.5-1.2: Snap till 1m   (lägenhet/hus)
Zoom 1.2-2.5: Snap till 50cm (rumslayout)
Zoom 2.5-5.0: Snap till 25cm (möbelplacering)
Zoom > 5.0:   Snap till 10cm (precision)
```

### Resultat
✅ Väggar snappar **automatiskt och alltid** till gridlines
✅ Snap-storlek anpassar sig efter zoom-nivå
✅ Mer precision när du zoomar in
✅ Snabbare skissning när du är utzoomed

---

## 🎯 Så här fungerar det nu:

### Rita väggar (kedjelogik):
1. **Välj väggverktyget** 🔨
2. **Klicka** för startpunkt → Snappas till grid
3. **Dra och klicka** för slutpunkt → Snappas till grid
4. **Vägg skapas** med exakt längd (visas på väggen)
5. **Nästa klick** fortsätter från slutpunkten → Kedjar ihop väggar!
6. **Tryck Escape** för att avbryta kedjan

### Fördelar:
✅ **Inga oavsiktliga markeringar** av befintliga väggar
✅ **Exakta mått** tack vare snap-to-grid
✅ **Snabb kedjeritning** - väggar kopplas automatiskt
✅ **Visuell feedback** - se mått på varje vägg direkt

---

## 🔍 Teknisk detalj: Varför det inte funkade förut

### Problem 1 - Väggmarkering:
```typescript
// TIDIGARE (DÅLIGT):
<Line
  draggable={true}  // Alltid dragbar
  onClick={onSelect}  // Alltid klickbar
  listening={true}  // Alltid aktivt
/>
// → Väggar markerades även när man försökte rita nya väggar
```

```typescript
// NU (BRA):
<Line
  draggable={canSelect}  // Endast när INTE ritläge
  onClick={canSelect ? onSelect : undefined}  // Endast när INTE ritläge
  listening={canSelect}  // Ignorera helt i ritläge
/>
// → Väggar ignoreras helt när väggverktyget är aktivt
```

### Problem 2 - Snap-to-grid:
```typescript
// TIDIGARE (DÅLIGT):
pos = snapToGrid(pos, currentSnapSize, gridSettings.snap);
// → Beroende på inställning som kunde vara avstängd
```

```typescript
// NU (BRA):
const shouldSnap = activeTool === 'wall' || gridSettings.snap;
pos = snapToGrid(pos, currentSnapSize, shouldSnap);
// → Väggar snappar ALLTID, andra verktyg följer inställning
```

---

## ✅ Sammanfattning

**Båda problemen är nu fixade:**

1. ✅ **Väggverktyget ignorerar befintliga väggar** → Rita fritt utan oavsiktliga markeringar
2. ✅ **Väggar snappar alltid till gridlines** → Exakta mått automatiskt
3. ✅ **Kedjeritning fungerar perfekt** → Bygg ihop väggar smidigt
4. ✅ **Dynamisk snap-storlek** → Precision ökar med zoom

**Nu kan du rita planritningar precis som du vill!** 🎉
