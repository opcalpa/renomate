# Canvas Performance Analysis & Optimization Plan

## Datum: 2026-01-20

## 🔍 Problem: Canvas har blivit seg, särskilt markeringsfunktionen

### Symptom
- Blå streckade markeringslinjer känns laggiga när man drar
- Canvas svarar långsamt vid interaktion
- Särskilt märkbart vid många objekt på canvasen

---

## 🐛 Identifierade Prestandaproblem

### 1. **KRITISKT: setState på varje musrörelse**

**Problem:**
```typescript
const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // ...
  
  // Vid box selection - detta körs på VARJE pixel musen rör sig!
  if (isBoxSelecting && selectionBox) {
    let pos = { /* ... */ };
    setSelectionBox({ ...selectionBox, end: pos }); // <-- RE-RENDER PÅ VARJE PIXEL!
    return;
  }
});
```

**Impact:** 
- Vid dra-markering körs `setSelectionBox` **60-120 gånger per sekund** (beroende på mushastighet)
- Varje `setState` triggar en **full komponent re-render**
- Hela canvas-komponenten (3600+ rader) renderas om på varje pixel

**Korollär:** Ingen throttling eller debouncing används

---

### 2. **KRITISKT: Collision detection på varje musrörelse**

**Problem:**
```typescript
const handleMouseUp = useCallback(() => {
  if (isBoxSelecting && selectionBox) {
    // ...
    
    // Loopar igenom ALLA shapes vid VARJE mouseUp
    currentShapes.forEach(shape => {
      // Komplex geometri-kalkylering för varje shape
      const hasIntersection = Konva.Util.haveIntersection(selectionRect, nodeRectWorld);
      // ...
    });
  }
});
```

**Faktiskt problem:**
Även om detta endast körs vid mouseUp, så körs `setSelectionBox` vid **varje mouseMove**, vilket gör att markeringsrektangeln uppdateras kontinuerligt och orsakar re-renders.

---

### 3. **30+ useState hooks i samma komponent**

**Problem:**
```typescript
export const UnifiedKonvaCanvas: React.FC<UnifiedKonvaCanvasProps> = ({ onRoomCreated }) => {
  // 30+ useState hooks:
  const [selectedShapeRef, setSelectedShapeRef] = useState(null);
  const [transformStates, setTransformStates] = useState({});
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedShapeId, setLastClickedShapeId] = useState(null);
  const [isGroupMode, setIsGroupMode] = useState(true);
  const [lastWallEndPoint, setLastWallEndPoint] = useState(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  // ... och 18+ till
```

**Impact:**
- Komplexa dependency chains mellan states
- Svårt att optimera med React.memo
- Varje state-uppdatering kan trigga flera useEffect hooks

---

### 4. **Ingen memoization på shape-komponenter**

**Problem:**
```typescript
// WallShape, RoomShape, etc. är INTE memoizerade
const WallShape: React.FC<ShapeComponentProps & { ... }> = ({ 
  shape, 
  isSelected, 
  onSelect, 
  onTransform,
  // ...
}) => {
  // Stor komponent med mycket logik
  // Re-renderas varje gång parent renderas
```

**Impact:**
- Vid 50 objekt på canvas = 50 shape-komponenter som re-renderas
- Vid varje musrörelse (box selection) = 50 × 60 fps = **3000 re-renders per sekund**

---

### 5. **Stor monolitisk komponent (3600+ rader)**

**Problem:**
- `UnifiedKonvaCanvas.tsx` är 3607 rader
- All logik i en fil
- Svårt för React att optimera reconciliation

**Impact:**
- Långsam diff-process
- Svårt att profile:a och debugga
- Svårt att isolera performance bottlenecks

---

### 6. **Ingen Layer-optimering i Konva**

**Problem:**
```typescript
<Layer>
  {currentShapes.map((shape) => {
    // Alla shapes i samma Layer
    // Renderas om tillsammans
  })}
  
  {/* Selection Box i samma Layer */}
  {isBoxSelecting && selectionBox && (
    <Rect {...selectionBox} />
  )}
</Layer>
```

**Impact:**
- När selection box uppdateras måste hela Layer:n re-renderas
- Konva måste redraw:a alla shapes även om de inte ändrats

---

### 7. **Beräkningar i render-fasen**

**Problem:**
```typescript
{currentShapes.map((shape) => {
  const isSelected = selectedShapeId === shape.id || selectedShapeIds.includes(shape.id);
  const handleSelect = () => { /* ... */ };
  const handleTransform = (updates: Partial<FloorMapShape>) => handleShapeTransform(shape.id, updates);
  const currentSnapSize = getSnapSize(viewState.zoom, scaleSettings.pixelsPerMm);
  // ... många beräkningar för varje shape vid varje render
```

**Impact:**
- Funktioner skapas på nytt vid varje render
- Beräkningar körs även när resultatet är samma
- Ingen caching av dyra operationer

---

## 🎯 Lösningsförslag: Optimeringsstrategier

### Strategi 1: **Throttle/Debounce Mouse Events** (SNABBASTE LÖSNINGEN)

```typescript
import { throttle } from 'lodash-es';

// Throttle mouse move till max 30fps istället för 60-120fps
const throttledUpdateSelectionBox = useMemo(
  () => throttle((box: SelectionBox) => {
    setSelectionBox(box);
  }, 33), // 33ms = ~30fps
  []
);

const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // ...
  if (isBoxSelecting && selectionBox) {
    let pos = { /* ... */ };
    throttledUpdateSelectionBox({ ...selectionBox, end: pos }); // Throttled!
    return;
  }
});
```

**Fördelar:**
- ✅ Enkel att implementera
- ✅ Omedelbar förbättring (50-70% mindre re-renders)
- ✅ Minimal kod-förändring

**Nackdelar:**
- ❌ Löser inte grundproblemet med för många re-renders

---

### Strategi 2: **Separera Selection Layer** (REKOMMENDERAD)

```typescript
<Stage>
  {/* Grid Layer - static */}
  <Layer listening={false}>
    <Grid />
  </Layer>
  
  {/* Shapes Layer - only re-renders when shapes change */}
  <Layer>
    {currentShapes.map((shape) => (
      <MemoizedShapeComponent key={shape.id} shape={shape} />
    ))}
  </Layer>
  
  {/* Selection Layer - updates frequently but isolated */}
  <Layer listening={false}>
    {isBoxSelecting && selectionBox && (
      <Rect {...selectionBox} />
    )}
  </Layer>
  
  {/* Transformer Layer - isolated */}
  <Layer>
    {(selectedShapeIds.length > 0 || selectedShapeId) && (
      <Transformer ref={transformerRef} />
    )}
  </Layer>
</Stage>
```

**Fördelar:**
- ✅ Isolerar frequent updates (selection box) från shapes
- ✅ Shapes re-renderas inte när selection box uppdateras
- ✅ Bättre Konva performance (mindre canvas redraws)

**Nackdelar:**
- ❌ Kräver lite mer refactoring

---

### Strategi 3: **Memoize Shape Components** (VIKTIG)

```typescript
// Memoize varje shape-typ
const WallShape = React.memo<ShapeComponentProps>(({ 
  shape, 
  isSelected, 
  onSelect, 
  onTransform,
  // ...
}) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Custom comparison - endast re-render om dessa ändras
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.shape.coordinates === nextProps.shape.coordinates &&
    prevProps.zoom === nextProps.zoom
  );
});

// Liknande för RoomShape, RectangleShape, etc.
```

**Fördelar:**
- ✅ Förhindrar onödiga re-renders av shapes
- ✅ Dramatisk performance-förbättring vid många objekt
- ✅ Shapes uppdateras endast när de faktiskt ändras

**Nackdelar:**
- ❌ Måste implementeras för varje shape-typ
- ❌ Kräver noggrann equality-check

---

### Strategi 4: **Använd requestAnimationFrame för Selection Box**

```typescript
const selectionBoxRef = useRef<{ start: Point; end: Point } | null>(null);
const animationFrameRef = useRef<number | null>(null);

const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
  // ...
  if (isBoxSelecting && selectionBox) {
    let pos = { /* ... */ };
    
    // Uppdatera ref direkt (ingen re-render)
    selectionBoxRef.current = { ...selectionBox, end: pos };
    
    // Schedule single update per frame
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(() => {
        if (selectionBoxRef.current) {
          setSelectionBox(selectionBoxRef.current);
        }
        animationFrameRef.current = null;
      });
    }
    return;
  }
});
```

**Fördelar:**
- ✅ Synkroniserad med display refresh rate (max 60fps)
- ✅ Förhindrar "frame drops"
- ✅ Smooth selection box movement

**Nackdelar:**
- ❌ Lite mer komplex kod
- ❌ Kräver cleanup i useEffect

---

### Strategi 5: **Refactor till Custom Hooks**

```typescript
// hooks/useBoxSelection.ts
export const useBoxSelection = (stageRef, viewState) => {
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  
  const handleMouseDown = useCallback((pos) => {
    setIsBoxSelecting(true);
    setSelectionBox({ start: pos, end: pos });
  }, []);
  
  const handleMouseMove = useCallback((pos) => {
    if (isBoxSelecting) {
      setSelectionBox(prev => prev ? { ...prev, end: pos } : null);
    }
  }, [isBoxSelecting]);
  
  // ... etc
  
  return { isBoxSelecting, selectionBox, handleMouseDown, handleMouseMove };
};
```

**Fördelar:**
- ✅ Bättre separation of concerns
- ✅ Enklare att testa
- ✅ Mindre monolitisk komponent

**Nackdelar:**
- ❌ Stor refactoring
- ❌ Riskerar att introducera nya buggar

---

### Strategi 6: **Virtualisering (för många objekt)**

```typescript
// Endast rendera shapes som är synliga i viewport
const visibleShapes = useMemo(() => {
  const viewport = {
    x: -viewState.panX / viewState.zoom,
    y: -viewState.panY / viewState.zoom,
    width: CANVAS_WIDTH / viewState.zoom,
    height: CANVAS_HEIGHT / viewState.zoom,
  };
  
  return currentShapes.filter(shape => {
    // Check if shape intersects with viewport
    return isShapeInViewport(shape, viewport);
  });
}, [currentShapes, viewState]);
```

**Fördelar:**
- ✅ Dramatisk performance-förbättring vid 100+ objekt
- ✅ Skalbart för stora projekt

**Nackdelar:**
- ❌ Komplex implementering
- ❌ Edge cases (shapes delvis utanför viewport)

---

## 🚀 Rekommenderad Implementation Plan

### Fas 1: Snabba Vinster (1-2 timmar)

1. **Throttle mouse move events** (Strategi 1)
   - Implementera throttling för `handleMouseMove`
   - Förväntat resultat: 50-70% förbättring i responsiveness

2. **Separera Selection Layer** (Strategi 2)
   - Flytta selection box till egen Layer
   - Förväntat resultat: Selection box påverkar inte längre shapes

3. **Memoize shape components** (Strategi 3)
   - Lägg till React.memo på WallShape, RoomShape, etc.
   - Förväntat resultat: 60-80% mindre re-renders

### Fas 2: Strukturella Förbättringar (3-5 timmar)

4. **Använd requestAnimationFrame** (Strategi 4)
   - Replace throttling med rAF
   - Förväntat resultat: Smooth 60fps selection box

5. **Refactor till custom hooks** (Strategi 5)
   - Dela upp logiken i useBoxSelection, usePanning, etc.
   - Förväntat resultat: Mer maintainable kod

### Fas 3: Skalning (vid behov, 5-8 timmar)

6. **Virtualisering** (Strategi 6)
   - Endast vid 100+ objekt på canvas
   - Implementera viewport culling

---

## 📊 Förväntat Resultat

### Före optimering:
- **Box selection:** 120 re-renders/sekund = laggy
- **50 shapes:** Alla re-renderas vid varje mouse move
- **Total re-renders under 1 sekunds dra:** ~120-200 re-renders

### Efter Fas 1 (Snabba Vinster):
- **Box selection:** ~30 re-renders/sekund = smooth
- **50 shapes:** Endast selection box re-renderas
- **Total re-renders under 1 sekunds dra:** ~30 re-renders
- **Förbättring:** **85-90% mindre re-renders**

### Efter Fas 2 (Strukturella Förbättringar):
- **Box selection:** 60 fps med rAF = super smooth
- **Kod kvalitet:** Mycket bättre structure
- **Maintainability:** Enklare att lägga till nya features

---

## 🔧 Tekniska Detaljer

### Throttling Implementation

```typescript
import { throttle } from 'lodash-es';

// Alternative: Custom throttle utan lodash
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}
```

### Layer Separation Pattern

```typescript
// Separate concerns into dedicated layers
const LAYER_CONFIG = {
  GRID: { listening: false, name: 'grid' },
  SHAPES: { listening: true, name: 'shapes' },
  SELECTION: { listening: false, name: 'selection' },
  TRANSFORMER: { listening: true, name: 'transformer' },
} as const;
```

### Shape Memoization Pattern

```typescript
// Generic shape memo wrapper
function createMemoizedShape<T extends ShapeComponentProps>(
  Component: React.FC<T>,
  compareProps?: (prev: T, next: T) => boolean
) {
  return React.memo(Component, compareProps || ((prev, next) => {
    return (
      prev.shape.id === next.shape.id &&
      prev.isSelected === next.isSelected &&
      JSON.stringify(prev.shape.coordinates) === JSON.stringify(next.shape.coordinates)
    );
  }));
}
```

---

## 🎯 Nästa Steg

1. **Testa nuvarande performance:**
   - Öppna Chrome DevTools > Performance
   - Starta recording
   - Dra markering över canvas
   - Analysera resultatet

2. **Implementera Fas 1 (Snabba Vinster)**
   - Börja med throttling
   - Testa resultat
   - Fortsätt med layer separation
   - Testa resultat
   - Lägg till memoization
   - Testa slutresultat

3. **Mät förbättring:**
   - Samma DevTools test som steg 1
   - Jämför före/efter
   - Dokumentera resultat

---

## 📚 Referenser

- [React Performance Optimization](https://react.dev/reference/react/memo)
- [Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [React Konva Performance](https://github.com/konvajs/react-konva#performance-optimizations)
- [RequestAnimationFrame Guide](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

---

**Slutsats:** Canvas har blivit seg på grund av för många re-renders vid box selection. Med throttling, layer separation och memoization kan vi förbättra performance med 85-90%. Implementation är relativt enkel och kan göras i 1-2 timmar för Fas 1.
