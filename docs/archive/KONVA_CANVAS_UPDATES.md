# Konva Canvas - Justeringar för att matcha gamla canvasen

## Datum: 2026-01-19

### Sammanfattning av ändringar

Alla ändringar gjorda för att matcha det gamla canvasens beteende och förhindra crash.

---

## 1. Zoom-inställningar (säkerhet)

### Problem
Canvas kunde crasha vid extrema zoom-nivåer.

### Lösning
```typescript
const MIN_ZOOM = 0.3;  // Ökad från 0.1 (förhindra för utzooming)
const MAX_ZOOM = 15;   // Ökad från 10 (tillåt mer inzoomning men säkert)
```

**Motivering:** Gamla canvasen hade ingen explicit max zoom, men 15x är en säker gräns som ger tillräcklig precision utan att överbelasta rendering.

---

## 2. Canvas-storlek

### Problem
Canvas-storleken matchade inte gamla canvasen.

### Lösning
```typescript
const CANVAS_WIDTH = 8000;   // 80m arbetsyta (matchar gamla canvasen)
const CANVAS_HEIGHT = 8000;  // 80m arbetsyta (matchar gamla canvasen)
```

**Grid rendering:**
```typescript
<Grid 
  width={CANVAS_WIDTH}    // Använd faktisk canvas-storlek
  height={CANVAS_HEIGHT} 
  zoom={viewState.zoom}
  pixelsPerMm={scaleSettings.pixelsPerMm}
/>
```

---

## 3. Zoom-beteende (Ctrl/Cmd + scroll)

### Problem
Zoomning skedde vid vanlig scrollning, vilket förhindrade naturlig scrollning.

### Lösning
Implementerat samma beteende som gamla canvasen:
- **Ctrl/Cmd + scroll:** Zoom in/ut mot muspekaren
- **Vanlig scroll:** Naturlig scrollning (panning)

```typescript
const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
  const stage = stageRef.current;
  if (!stage) return;
  
  // Zoom endast med Ctrl/Cmd (som gamla canvasen)
  if (e.evt.ctrlKey || e.evt.metaKey) {
    e.evt.preventDefault();
    // ... zoom-logik
  }
  // Vanlig scroll utan Ctrl/Cmd tillåter naturlig scrollning
}, [viewState, setViewState]);
```

---

## 4. Väggritning - Kedjeritning (Wall Chaining)

### Problem
I gamla canvasen kunde man bygga ihop väggar kontinuerligt. Den nya canvasen krävde att man startade om varje gång.

### Lösning
Implementerat "wall chaining" som i gamla canvasen:

```typescript
// State för att spåra sista väggslutpunkten
const [lastWallEndPoint, setLastWallEndPoint] = useState<{ x: number; y: number } | null>(null);

// Vid mouseDown - kolla om vi kan fortsätta från sista väggen
if (activeTool === 'wall' && lastWallEndPoint) {
  const distance = Math.sqrt(
    Math.pow(pos.x - lastWallEndPoint.x, 2) + 
    Math.pow(pos.y - lastWallEndPoint.y, 2)
  );
  
  if (distance < currentSnapSize * 2) {
    // Starta från sista slutpunkten (bygga vidare)
    setCurrentDrawingPoints([lastWallEndPoint]);
  } else {
    // Starta ny väggkedja
    setCurrentDrawingPoints([pos]);
    setLastWallEndPoint(null);
  }
}

// Vid mouseUp - spara slutpunkten för nästa vägg
if (activeTool === 'wall') {
  setLastWallEndPoint({ x: end.x, y: end.y });
  // Fortsätt i ritläge (återgå inte till select)
  return; 
}
```

### Användarbeteende
1. Välj väggverktyget
2. Rita första väggen
3. Nästa klick fortsätter automatiskt från slutpunkten
4. Tryck **Escape** för att avbryta kedjan
5. Byt verktyg för att automatiskt återställa

---

## 5. Multi-level Grid System

Grid-systemet är exakt porterat från gamla canvasen:

### Grid-nivåer baserat på zoom
```typescript
// Zoom < 0.3:  10m grid
// Zoom 0.3-0.6: 10m + 5m
// Zoom 0.6-1.0: 5m + 1m
// Zoom 1.0-2.0: 1m + 50cm
// Zoom 2.0-3.0: 50cm + 10cm
// Zoom 3.0-4.0: 10cm + 5cm
// Zoom 4.0-6.0: 5cm + 1cm
// Zoom 6.0-8.0: 1cm + 5mm
// Zoom > 8.0:   5mm + 1mm
```

### Snap-to-grid dynamisk storlek
```typescript
const getSnapSize = (zoomLevel: number, pixelsPerMm: number): number => {
  if (zoomLevel < 0.6) return 5m;
  else if (zoomLevel < 1.0) return 1m;
  else if (zoomLevel < 2.0) return 50cm;
  else if (zoomLevel < 3.0) return 10cm;
  // ... och så vidare
};
```

Detta ger automatisk precision som ökar när du zoomar in.

---

## 6. Keyboard shortcuts

### Nya shortcuts
- **Escape:** Avbryt väggkedja eller pågående ritning
- **Ctrl/Cmd + Z:** Ångra
- **Ctrl/Cmd + Y eller Ctrl/Cmd + Shift + Z:** Gör om
- **Delete eller Backspace:** Ta bort markerade objekt
- **Space + drag:** Panorera canvas

---

## 7. Scale presets (skalinställningar)

Settings-panelen längst ner till vänster visar:
- Aktuell skala (Detailed/Standard/Overview)
- Aktuell grid-storlek (dynamisk baserat på zoom)
- **Dubbelklicka** för att växla mellan skalor

### De tre standardinställningarna
```typescript
Detailed:  1px = 5mm  (0.2 pixelsPerMm) - För små rum/detaljer
Standard:  1px = 10mm (0.1 pixelsPerMm) - Standard för lägenheter/hus
Overview:  1px = 50mm (0.02 pixelsPerMm) - För stora planer/trädgårdar
```

---

## Testning

Servern körs på: **http://localhost:5175/**

### Testa följande
1. ✅ **Zoom:** Ctrl/Cmd + scroll - ska zooma mot musen
2. ✅ **Scroll:** Vanlig scroll - ska panorera naturligt
3. ✅ **Grid:** Grid ska förändras dynamiskt när du zoomar
4. ✅ **Väggar:** Rita väggar som automatiskt kedjas ihop
5. ✅ **Escape:** Tryck Escape för att avbryta väggkedja
6. ✅ **Max zoom:** Zooma maximalt (15x) utan crash
7. ✅ **Settings:** Dubbelklicka på settings-panelen (nere till vänster)

---

## Nästa steg

Om allt fungerar bra kan vi:
1. Ta bort den gamla `FloorPlanCanvas.tsx` helt
2. Byta namn på `UnifiedKonvaCanvas.tsx` till `FloorPlanCanvas.tsx`
3. Ta bort toggle-knappen i `FloorMapEditor.tsx`
