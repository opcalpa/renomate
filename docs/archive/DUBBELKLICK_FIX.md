# 🔧 Dubbelklick Fix - PropertyPanel

## Problem
PropertyPanel visades INTE när man dubbelklickade på objekt (väggar, dörrar, etc.)

## Rot-orsak
Dubbelklick-logiken var för komplicerad med `clickCount` och `clickTimer`. Den gamla canvasen använder en **enklare timer-baserad approach**.

## Lösning

### Förut (Komplicerad logik):
```typescript
// ❌ Använde clickCount och clickTimer med setTimeout
const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
const [clickCount, setClickCount] = useState(0);

// Komplicerad nested if-statements...
if (clickCount === 0) { /* first click */ }
else if (clickCount === 1) { /* second click */ }
else if (clickCount === 2) { /* third click */ }
```

### Nu (Enkel logik från gamla canvasen):
```typescript
// ✅ Använder Date.now() och 300ms timeout (exakt som gamla canvasen)
const [lastClickTime, setLastClickTime] = useState(0);
const [lastClickedShapeId, setLastClickedShapeId] = useState<string | null>(null);

const handleShapeClick = useCallback(async (shapeId: string, shapeType: string) => {
  const now = Date.now();
  const isDoubleClick = now - lastClickTime < 300 && lastClickedShapeId === shapeId;
  
  if (isDoubleClick) {
    // DOUBLE-CLICK → Open Property Panel!
    console.log('🔵 Double-click detected');
    
    if (shapeType === 'room') {
      // Rooms → RoomDetailDialog
      setIsRoomDetailOpen(true);
    } else {
      // All other → PropertyPanel ✅
      setPropertyPanelShape(shape);
      setShowPropertyPanel(true);
      console.log('✅ PropertyPanel opened');
    }
    
    setLastClickTime(0);
  } else {
    // SINGLE CLICK
    setSelectedShapeId(shapeId);
    setLastClickTime(now);
    setLastClickedShapeId(shapeId);
  }
});
```

## Debug-loggar tillagda

Nu loggas allt i konsolen:
```
🔘 Single click on wall abc-123
🔵 Double-click detected on wall abc-123
✅ PropertyPanel opened for wall
📊 Shape data: {...}
```

## Test

1. Öppna konsolen (Cmd+Opt+J)
2. Rita en vägg
3. Klicka EN gång → Se "🔘 Single click"
4. Klicka IGEN inom 300ms → Se "🔵 Double-click detected"
5. Se "✅ PropertyPanel opened"
6. PropertyPanel ska visas till höger!

## Filer ändrade
- `src/components/floormap/UnifiedKonvaCanvas.tsx`
  - Förenklad dubbelklick-logik (rad ~900)
  - Tillagt debug-loggar
  - Använder samma approach som gamla canvasen
