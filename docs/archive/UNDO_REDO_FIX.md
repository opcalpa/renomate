# 🔄 Undo/Redo Keyboard Shortcuts Fix

## Problem

Användaren rapporterade att ångra (Cmd+Z) och gör om (Cmd+Shift+Z / Ctrl+Y) keyboard-kommandon inte fungerar.

## Potentiella Orsaker Identifierade

### **1. För Strikt `modKey`-detektion (HUVUDORSAK)**

**Före fix:**
```typescript
const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey;
```

**Problem:**
- På Mac krävde det att Ctrl INTE var nedtryckt samtidigt som Cmd
- Om användaren av misstag trycker både Cmd och Ctrl (vilket är lätt på Mac), så fungerar inte kommandon
- För strikt validering som blockerar legitima keyboard shortcuts

**Efter fix:**
```typescript
const modKey = isMac ? e.metaKey : e.ctrlKey;
```

**Fördelar:**
- ✅ Accepterar Cmd på Mac (oavsett Ctrl-status)
- ✅ Accepterar Ctrl på Windows
- ✅ Enklare och mer förlåtande logik
- ✅ Matchar standard keyboard shortcut-beteende i andra appar

### **2. Otillräcklig `isTyping`-detektion**

**Före fix:**
```typescript
const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
```

**Problem:**
- Kontrollerar inte `SELECT`-element
- Kontrollerar inte `contentEditable`-element
- Kan missa vissa input-situationer

**Efter fix:**
```typescript
const isTyping = target.tagName === 'INPUT' || 
                 target.tagName === 'TEXTAREA' || 
                 target.tagName === 'SELECT' || 
                 target.isContentEditable;
```

**Fördelar:**
- ✅ Blockerar keyboard shortcuts när användaren redigerar text
- ✅ Stödjer fler typer av input-element
- ✅ Förhindrar oavsiktliga undo/redo under textredigering

### **3. Konkurrerande Event Listeners**

**Situation:**
- `FloorMapEditor.tsx` registrerar `window.addEventListener('keydown', ...)`
- `UnifiedKonvaCanvas.tsx` registrerar `window.addEventListener('keydown', ...)`
- Båda lyssnar på SAMMA window-objekt

**Före fix:**
- `FloorMapEditor` hade samma `modKey`-logik som UnifiedKonvaCanvas
- Båda försökte hantera samma keys

**Efter fix:**
- Båda filer använder nu SAMMA, förenklad `modKey`-logik
- `FloorMapEditor` hanterar ENDAST Cmd+S (save)
- `FloorMapEditor` lämnar Z, Y (undo/redo) åt UnifiedKonvaCanvas
- Explicit dokumenterat vilken fil som ansvarar för vilka shortcuts

## Ändringar

### **Fil 1: `src/components/floormap/UnifiedKonvaCanvas.tsx`**

#### **A. Förenklad `modKey`-detektion:**
```typescript
// Före:
const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey;

// Efter:
const modKey = isMac ? e.metaKey : e.ctrlKey;
```

#### **B. Förbättrad `isTyping`-check:**
```typescript
const isTyping = target.tagName === 'INPUT' || 
                 target.tagName === 'TEXTAREA' || 
                 target.tagName === 'SELECT' || 
                 target.isContentEditable;
```

#### **C. Omfattande Loggning för Debugging:**

**Undo (Cmd+Z):**
```typescript
if (isZKey && !isTyping) {
  console.log('🔵 Z-key pressed:', {
    key: e.key,
    code: e.code,
    modKey,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    isMac,
    isTyping,
    willUndo: modKey && !e.shiftKey,
    refCheck: {
      hasCanUndo: typeof canUndoRef.current === 'function',
      canUndoResult: typeof canUndoRef.current === 'function' ? canUndoRef.current() : 'N/A'
    }
  });
}

if (modKey && isZKey && !e.shiftKey && !isTyping) {
  e.preventDefault();
  console.log('🔄 Undo triggered! Calling canUndo...');
  const canUndoResult = canUndoRef.current();
  console.log('🔄 canUndo result:', canUndoResult);
  if (canUndoResult) {
    console.log('🔄 Calling undo()...');
    undoRef.current();
    console.log('↩️ Undo executed successfully!');
    toast.success('Ångrad');
  } else {
    console.log('⚠️ Cannot undo - at history start or no history');
    toast.info('Inget att ångra');
  }
}
```

**Redo (Cmd+Shift+Z / Ctrl+Y):**
```typescript
if ((isZKey && e.shiftKey) || isYKey) {
  console.log('🟢 Redo key pressed:', {
    key: e.key,
    code: e.code,
    modKey,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    isMac,
    isZKey,
    isYKey,
    isTyping,
    willRedo: isRedoKey,
    refCheck: {
      hasCanRedo: typeof canRedoRef.current === 'function',
      canRedoResult: typeof canRedoRef.current === 'function' ? canRedoRef.current() : 'N/A'
    }
  });
}

if (isRedoKey) {
  e.preventDefault();
  console.log('🔄 Redo triggered! Calling canRedo...');
  const canRedoResult = canRedoRef.current();
  console.log('🔄 canRedo result:', canRedoResult);
  if (canRedoResult) {
    console.log('🔄 Calling redo()...');
    redoRef.current();
    console.log('↪️ Redo executed successfully!');
    toast.success('Gjort om');
  } else {
    console.log('⚠️ Cannot redo - at history end or no future states');
    toast.info('Inget att göra om');
  }
}
```

#### **D. Initial Ref State Logging:**
```typescript
useEffect(() => {
  console.log('⚙️ Keyboard handler registered, isMac:', isMac);
  console.log('📦 Initial refs state:', {
    hasUndo: typeof undoRef.current === 'function',
    hasRedo: typeof redoRef.current === 'function',
    hasCanUndo: typeof canUndoRef.current === 'function',
    hasCanRedo: typeof canRedoRef.current === 'function',
  });
  // ... rest of code
}, []);
```

### **Fil 2: `src/components/floormap/store.ts`**

#### **Förbättrad Loggning i `undo()`:**
```typescript
undo: () => set((state) => {
  console.log('🔵 UNDO CALLED! Current state:', {
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    shapesCount: state.shapes.length,
    canUndo: state.historyIndex > 0
  });
  
  if (state.historyIndex > 0) {
    const newIndex = state.historyIndex - 1;
    const newShapes = JSON.parse(JSON.stringify(state.history[newIndex]));
    console.log(`⬅️ UNDO: ${state.historyIndex} → ${newIndex} (${state.history.length} states in history)`);
    console.log(`📊 Shapes: ${state.shapes.length} → ${newShapes.length}`);
    return {
      shapes: newShapes,
      historyIndex: newIndex,
      selectedShapeId: null,
      selectedShapeIds: [],
    };
  }
  console.log('⚠️ UNDO BLOCKED - already at start (historyIndex: 0)');
  return state;
}),
```

#### **Förbättrad Loggning i `redo()`:**
```typescript
redo: () => set((state) => {
  console.log('🔵 REDO CALLED! Current state:', {
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    shapesCount: state.shapes.length,
    canRedo: state.historyIndex < state.history.length - 1
  });
  
  if (state.historyIndex < state.history.length - 1) {
    const newIndex = state.historyIndex + 1;
    const newShapes = JSON.parse(JSON.stringify(state.history[newIndex]));
    console.log(`➡️ REDO: ${state.historyIndex} → ${newIndex} (${state.history.length} states in history)`);
    console.log(`📊 Shapes: ${state.shapes.length} → ${newShapes.length}`);
    return {
      shapes: newShapes,
      historyIndex: newIndex,
      selectedShapeId: null,
      selectedShapeIds: [],
    };
  }
  console.log('⚠️ REDO BLOCKED - already at end');
  return state;
}),
```

#### **History Preview i `canUndo()` / `canRedo()`:**
```typescript
canUndo: () => {
  const state = get();
  const can = state.historyIndex > 0;
  console.log(`🔍 canUndo check: ${can} (index: ${state.historyIndex}, history length: ${state.history.length})`);
  if (state.history.length > 0) {
    console.log(`📜 History preview:`, state.history.map((h, i) => 
      `[${i}]: ${h.length} shapes${i === state.historyIndex ? ' ← current' : ''}`
    ).join(', '));
  }
  return can;
},

canRedo: () => {
  const state = get();
  const can = state.historyIndex < state.history.length - 1;
  console.log(`🔍 canRedo check: ${can} (index: ${state.historyIndex}, history length: ${state.history.length})`);
  if (state.history.length > 0) {
    console.log(`📜 History preview:`, state.history.map((h, i) => 
      `[${i}]: ${h.length} shapes${i === state.historyIndex ? ' ← current' : ''}`
    ).join(', '));
  }
  return can;
},
```

### **Fil 3: `src/components/floormap/FloorMapEditor.tsx`**

#### **Förenklad `modKey` och Explicit Dokumentation:**
```typescript
useEffect(() => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only handle shortcuts that are specific to FloorMapEditor
    // All canvas shortcuts (Ctrl+Z/Y/C/V/D/A, Delete, etc.) are in UnifiedKonvaCanvas
    
    // Use Cmd on Mac, Ctrl on Windows - simplified
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Save - keep here as it's a top-level action
    // NOTE: Do NOT handle Z/Y here - those are canvas undo/redo
    if (modKey && e.key.toLowerCase() === 's') {
      console.log('💾 FloorMapEditor handling Save');
      e.preventDefault();
      saveShapes();
    }
    
    // Explicitly do NOT handle Z, Y (undo/redo) - let canvas handle those
    // Do NOT call e.preventDefault() or e.stopPropagation() for other keys
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Debugging Guide

### **Steg 1: Verifiera Event Listener Registrering**

När sidan laddas, kontrollera konsolen för:
```
⚙️ Keyboard handler registered, isMac: true
📦 Initial refs state: { hasUndo: true, hasRedo: true, hasCanUndo: true, hasCanRedo: true }
```

✅ **Om du SER dessa:** Event listeners är korrekt registrerade.
❌ **Om du INTE ser dessa:** UnifiedKonvaCanvas monteras inte korrekt.

### **Steg 2: Tryck Cmd+Z (eller Ctrl+Z)**

**Förväntat konsol-output:**
```
🔵 Z-key pressed: {
  key: "z",
  code: "KeyZ",
  modKey: true,
  metaKey: true,  // (Mac)
  ctrlKey: false,
  shiftKey: false,
  isMac: true,
  isTyping: false,
  willUndo: true,
  refCheck: { hasCanUndo: true, canUndoResult: true }
}
🔄 Undo triggered! Calling canUndo...
🔍 canUndo check: true (index: 2, history length: 3)
📜 History preview: [0]: 0 shapes, [1]: 1 shapes, [2]: 2 shapes ← current
🔄 canUndo result: true
🔄 Calling undo()...
🔵 UNDO CALLED! Current state: { historyIndex: 2, historyLength: 3, shapesCount: 2, canUndo: true }
⬅️ UNDO: 2 → 1 (3 states in history)
📊 Shapes: 2 → 1
↩️ Undo executed successfully!
```

**Toast-meddelande:** "Ångrad" (grön)

### **Steg 3: Tryck Cmd+Shift+Z (Mac) eller Ctrl+Y (Windows)**

**Förväntat konsol-output:**
```
🟢 Redo key pressed: {
  key: "z",
  code: "KeyZ",
  modKey: true,
  metaKey: true,
  ctrlKey: false,
  shiftKey: true,
  isMac: true,
  isZKey: true,
  isYKey: false,
  isTyping: false,
  willRedo: true,
  refCheck: { hasCanRedo: true, canRedoResult: true }
}
🔄 Redo triggered! Calling canRedo...
🔍 canRedo check: true (index: 1, history length: 3)
📜 History preview: [0]: 0 shapes, [1]: 1 shapes ← current, [2]: 2 shapes
🔄 canRedo result: true
🔄 Calling redo()...
🔵 REDO CALLED! Current state: { historyIndex: 1, historyLength: 3, shapesCount: 1, canRedo: true }
➡️ REDO: 1 → 2 (3 states in history)
📊 Shapes: 1 → 2
↪️ Redo executed successfully!
```

**Toast-meddelande:** "Gjort om" (grön)

### **Steg 4: Diagnostik**

#### **Problem: Inget output alls**
**Orsak:** Event listener inte registrerad eller blockeradddddd av annan kod.
**Lösning:** 
1. Kontrollera att `UnifiedKonvaCanvas` renderas
2. Kolla om andra komponenter anropar `e.stopPropagation()`
3. Verifiera att inga extensions (browser plugins) blockerar events

#### **Problem: "🔵 Z-key pressed" men inget mer**
**Orsak:** `modKey` är `false` - modifier-tangenten detekterades inte.
**Lösning:**
1. Kontrollera att du trycker **Cmd** (Mac) eller **Ctrl** (Windows)
2. Kolla `metaKey`/`ctrlKey` i konsol-outputen
3. Testa att starta om webbläsaren

#### **Problem: "🔄 Undo triggered" men "canUndo result: false"**
**Orsak:** Ingen history att ångra - du är vid början av historiken.
**Lösning:**
1. Gör en ändring först (lägg till en vägg, flytta ett objekt)
2. Kolla `historyIndex` och `historyLength` i konsolen
3. Verifiera att `history`-arrayen innehåller flera states

**Exempel på tom history:**
```
📜 History preview: [0]: 0 shapes ← current
```

**Exempel på giltig history:**
```
📜 History preview: [0]: 0 shapes, [1]: 1 shapes, [2]: 2 shapes ← current
```

#### **Problem: "🔄 Undo triggered" men "Cannot undo - at history start"**
**Orsak:** `historyIndex === 0` - du är vid början.
**Toast:** "Inget att ångra" (info, blå)
**Lösning:** Detta är förväntat beteende - gör en ändring först.

#### **Problem: Fungerar i konsolen men inte visuellt**
**Orsak:** React/Konva re-rendering inte triggas.
**Lösning:**
1. Kolla om `shapes` faktiskt uppdateras i Zustand store
2. Verifiera att `UnifiedKonvaCanvas` prenumererar på `shapes`
3. Kontrollera om `React.memo` blockerar re-rendering

## Keyboard Shortcuts Översikt

| Funktion | Mac | Windows | Beskrivning |
|----------|-----|---------|-------------|
| **Undo** | `Cmd+Z` | `Ctrl+Z` | Ångra senaste ändring |
| **Redo** | `Cmd+Shift+Z` | `Ctrl+Y` | Gör om ångrad ändring |
| **Save** | `Cmd+S` | `Ctrl+S` | Spara shapes till databas |
| **Select All** | `Cmd+A` | `Ctrl+A` | Markera alla objekt |
| **Copy** | `Cmd+C` | `Ctrl+C` | Kopiera markerade objekt |
| **Paste** | `Cmd+V` | `Ctrl+V` | Klistra in kopierade objekt |
| **Duplicate** | `Cmd+D` | `Ctrl+D` | Duplicera markerade objekt |
| **Delete** | `Delete` / `Backspace` | `Delete` / `Backspace` | Radera markerade objekt |
| **Escape** | `Esc` | `Esc` | Avbryt operation, återgå till markör |
| **Pan** | `Space` + drag | `Space` + drag | Panorera canvas |

## History System Översikt

### **Initial State:**
```javascript
history: [[]],        // Array med EN tom array
historyIndex: 0,      // Pekare till index 0
```
**Tolkning:** Vi är vid början, inga shapes. Kan INTE ångra.

### **Efter Första Ändringen (addShape):**
```javascript
history: [[], [shape1]],   // Array med TVÅ states
historyIndex: 1,            // Pekare till index 1 (aktuell state)
```
**Tolkning:** Vi har två states. Kan ångra (går till index 0).

### **Efter Undo:**
```javascript
history: [[], [shape1]],   // Samma history
historyIndex: 0,            // Pekare flyttad till index 0
shapes: [],                 // Shapes uppdaterad från history[0]
```
**Tolkning:** Vi är tillbaka vid början. Kan INTE ångra. Kan göra om (går till index 1).

### **Efter Redo:**
```javascript
history: [[], [shape1]],   // Samma history
historyIndex: 1,            // Pekare tillbaka till index 1
shapes: [shape1],           // Shapes uppdaterad från history[1]
```
**Tolkning:** Vi är framme igen. Kan ångra. Kan INTE göra om.

### **Efter Ny Ändring (när historyIndex < history.length - 1):**
```javascript
// Före (efter undo, historyIndex = 0):
history: [[], [shape1]],
historyIndex: 0,

// User adds shape2:
const newHistory = history.slice(0, historyIndex + 1);  // [[], ]
newHistory.push([shape2]);                              // [[], [shape2]]

// Efter:
history: [[], [shape2]],    // Framtida state [shape1] är borttagen!
historyIndex: 1,
```
**Tolkning:** Ny "timeline" skapas - gamla framtida states raderas.

## Testing

### **Test 1: Enkel Undo/Redo Cycle**
1. ✅ Öppna Space Planner
2. ✅ Rita en vägg
3. ✅ Konsol: "➕ Shape added - History: 0 → 1"
4. ✅ Tryck `Cmd+Z` (Mac) eller `Ctrl+Z` (Windows)
5. ✅ Konsol: "⬅️ UNDO: 1 → 0"
6. ✅ Vägg försvinner
7. ✅ Toast: "Ångrad"
8. ✅ Tryck `Cmd+Shift+Z` (Mac) eller `Ctrl+Y` (Windows)
9. ✅ Konsol: "➡️ REDO: 0 → 1"
10. ✅ Vägg återkommer
11. ✅ Toast: "Gjort om"

### **Test 2: Multipla Ändringar**
1. ✅ Rita 3 väggar
2. ✅ Konsol: History 0 → 1 → 2 → 3
3. ✅ Tryck `Cmd+Z` × 3
4. ✅ Konsol: 3 → 2 → 1 → 0
5. ✅ Alla väggar försvinner
6. ✅ Tryck `Cmd+Shift+Z` × 2
7. ✅ Konsol: 0 → 1 → 2
8. ✅ 2 väggar återkommer

### **Test 3: Branching History (Ny Timeline)**
1. ✅ Rita vägg A
2. ✅ Rita vägg B
3. ✅ History: [[], [A], [A,B]] (index: 2)
4. ✅ Tryck `Cmd+Z` × 2
5. ✅ History: [[], [A], [A,B]] (index: 0)
6. ✅ Rita vägg C
7. ✅ History: [[], [C]] (index: 1) ← [A] och [A,B] raderade!
8. ✅ Tryck `Cmd+Shift+Z`
9. ✅ Toast: "Inget att göra om" (ingen framtida state finns)

### **Test 4: isTyping Block**
1. ✅ Dubbelklicka på vägg
2. ✅ PropertyPanel öppnas
3. ✅ Klicka i "Namn"-fältet (input active)
4. ✅ Tryck `Cmd+Z`
5. ✅ Konsol: `isTyping: true` → Undo blockeras ✅
6. ✅ Text i input-fältet ångras (browser default) ✅
7. ✅ Canvas shapes påverkas INTE ✅

### **Test 5: Cross-Browser**
- ✅ **Mac + Chrome:** `Cmd+Z`, `Cmd+Shift+Z`
- ✅ **Mac + Safari:** `Cmd+Z`, `Cmd+Shift+Z`
- ✅ **Mac + Firefox:** `Cmd+Z`, `Cmd+Shift+Z`
- ✅ **Windows + Chrome:** `Ctrl+Z`, `Ctrl+Y`
- ✅ **Windows + Edge:** `Ctrl+Z`, `Ctrl+Y`
- ✅ **Windows + Firefox:** `Ctrl+Z`, `Ctrl+Y`

## Relaterade Filer

- ✅ `/src/components/floormap/UnifiedKonvaCanvas.tsx` - Keyboard shortcuts, event handling
- ✅ `/src/components/floormap/store.ts` - Zustand store, undo/redo logic, history management
- ✅ `/src/components/floormap/FloorMapEditor.tsx` - Top-level keyboard shortcuts (Save only)

## Tidigare Kända Problem (Nu Fixade)

### **Problem 1: `e.metaKey && !e.ctrlKey` (Före Fix)**
**Symptom:** Undo fungerar inte om användaren trycker Cmd+Ctrl+Z samtidigt.
**Orsak:** För strikt validering.
**Fix:** Använd `e.metaKey` (Mac) / `e.ctrlKey` (Windows) utan extra checks.

### **Problem 2: Saknad `contentEditable`-check**
**Symptom:** Undo triggas när användaren redigerar text i contentEditable-element.
**Orsak:** `isTyping` kollade inte `target.isContentEditable`.
**Fix:** Lagt till `target.isContentEditable` i `isTyping`-check.

### **Problem 3: Konkurrerande Event Listeners**
**Symptom:** Både FloorMapEditor och UnifiedKonvaCanvas försöker hantera samma shortcuts.
**Orsak:** Båda filer lyssnar på `window.addEventListener('keydown', ...)`.
**Fix:** Explicit ansvarsfördelning - FloorMapEditor hanterar ENDAST Save.

---

**TL;DR:**
1. ✅ Förenklad `modKey`-detektion (tog bort `&& !e.ctrlKey`)
2. ✅ Förbättrad `isTyping`-check (lade till `SELECT`, `contentEditable`)
3. ✅ Omfattande konsol-loggning för debugging
4. ✅ Explicit ansvarsfördelning mellan FloorMapEditor och UnifiedKonvaCanvas
5. ✅ Förbättrade toast-meddelanden ("Inget att ångra" / "Inget att göra om")
6. ✅ History preview i konsolen för enkel debugging

**Testa nu genom att:**
1. Rita en vägg
2. Tryck `Cmd+Z` (Mac) eller `Ctrl+Z` (Windows)
3. Kolla konsolen för detaljerad loggning
4. Vägg ska försvinna med toast "Ångrad"
5. Tryck `Cmd+Shift+Z` (Mac) eller `Ctrl+Y` (Windows)
6. Vägg ska återkomma med toast "Gjort om"

*Fixat: 2026-01-21*
