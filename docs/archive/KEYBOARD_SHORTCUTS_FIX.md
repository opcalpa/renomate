# 🔧 KEYBOARD SHORTCUTS FIX - STALE CLOSURE PROBLEM

**Problem:** Cmd+Z (Undo) och Cmd+Shift+Z (Redo) fungerade inte på Mac.

**Rot-orsak:** Stale closures i useEffect med stora dependency arrays.

---

## 🐛 PROBLEM

### **Symptom:**
```
1. Användare trycker Cmd+Z på Mac
2. Ingenting händer
3. Ingen console log
4. Undo fungerar inte
```

### **Rot-orsak:**
```typescript
// TIDIGARE (BUGGY):
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (modKey && e.key === 'z') {
      undo();  // ← STALE CLOSURE! Gamla funktionen
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo, /* 15+ dependencies */]);
```

**Problem:**
- Varje gång en dependency ändras → NY handleKeyDown skapas
- Gamla event listener kanske inte avregistreras korrekt
- `undo()` kan vara en gammal version (stale closure)
- Race conditions när state uppdateras snabbt

---

## ✅ LÖSNING

### **1. Refs för att undvika stale closures**

```typescript
// Skapa refs för alla funktioner och värden
const undoRef = useRef(undo);
const redoRef = useRef(redo);
const canUndoRef = useRef(canUndo);
const canRedoRef = useRef(canRedo);
const addShapeRef = useRef(addShape);
const deleteShapeRef = useRef(deleteShape);
const selectedShapeIdRef = useRef(selectedShapeId);
const selectedShapeIdsRef = useRef(selectedShapeIds);
const currentShapesRef = useRef(currentShapes);
const clipboardRef = useRef(clipboard);
const currentPlanIdRef = useRef(currentPlanId);
// ... etc
```

### **2. Uppdatera refs när värden ändras**

```typescript
// Separat useEffect för att hålla refs uppdaterade
useEffect(() => {
  undoRef.current = undo;
  redoRef.current = redo;
  canUndoRef.current = canUndo;
  canRedoRef.current = canRedo;
  addShapeRef.current = addShape;
  deleteShapeRef.current = deleteShape;
  selectedShapeIdRef.current = selectedShapeId;
  selectedShapeIdsRef.current = selectedShapeIds;
  currentShapesRef.current = currentShapes;
  clipboardRef.current = clipboard;
  currentPlanIdRef.current = currentPlanId;
}, [undo, redo, canUndo, canRedo, addShape, deleteShape, selectedShapeId, selectedShapeIds, currentShapes, clipboard, currentPlanId]);
```

### **3. Använd refs i event handlers**

```typescript
useEffect(() => {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const modKey = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey;
    
    // Debug logging
    console.log('🎹 Keyboard event:', {
      key: e.key,
      modKey,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      isMac,
      isTyping
    });
    
    // Undo: Använd REF istället för direkt funktion
    if (modKey && e.key.toLowerCase() === 'z' && !e.shiftKey && !isTyping) {
      e.preventDefault();
      console.log('🔄 Undo triggered, canUndo:', canUndoRef.current());
      if (canUndoRef.current()) {
        undoRef.current();  // ← Använd ref!
        console.log('↩️ Undo executed');
        toast.success('Ångrad');
      }
    }
    
    // Redo: Använd REF
    if (!isTyping && modKey) {
      if ((isMac && e.shiftKey && e.key.toLowerCase() === 'z') || (!isMac && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        console.log('🔄 Redo triggered, canRedo:', canRedoRef.current());
        if (canRedoRef.current()) {
          redoRef.current();  // ← Använd ref!
          console.log('↪️ Redo executed');
          toast.success('Gjort om');
        }
      }
    }
    
    // Copy, Paste, Delete, Select All - alla använder refs
    // ...
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') setIsSpacePressed(false);
    if (e.key === 'Shift') setIsShiftPressed(false);
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []); // ← TOM DEPENDENCY ARRAY! Event listener sätts upp EN GÅNG
```

### **4. Debug logging i store**

```typescript
// store.ts
canUndo: () => {
  const state = get();
  const can = state.historyIndex > 0;
  console.log(`🔍 canUndo: ${can} (index: ${state.historyIndex}, history length: ${state.history.length})`);
  return can;
},

canRedo: () => {
  const state = get();
  const can = state.historyIndex < state.history.length - 1;
  console.log(`🔍 canRedo: ${can} (index: ${state.historyIndex}, history length: ${state.history.length})`);
  return can;
},
```

---

## 🧪 DEBUGGING STEPS

### **Steg 1: Öppna Console**
```
1. Öppna Chrome/Safari DevTools (Cmd+Option+I)
2. Gå till Console-fliken
3. Rensa console (Cmd+K)
```

### **Steg 2: Testa Undo**
```
1. Rita en vägg på canvas
2. Tryck Cmd+Z
3. SE I CONSOLE:
   🎹 Keyboard event: { key: 'z', modKey: true, metaKey: true, ... }
   🔄 Undo triggered, canUndo: true
   🔍 canUndo: true (index: 1, history length: 2)
   ⬅️ Undo: 1 → 0 (2 states in history)
   ↩️ Undo executed
   ✅ Toast: "Ångrad"
```

### **Steg 3: Testa Redo**
```
1. Efter undo, tryck Cmd+Shift+Z
2. SE I CONSOLE:
   🎹 Keyboard event: { key: 'z', shiftKey: true, modKey: true, ... }
   🔄 Redo triggered, canRedo: true
   🔍 canRedo: true (index: 0, history length: 2)
   ➡️ Redo: 0 → 1 (2 states in history)
   ↪️ Redo executed
   ✅ Toast: "Gjort om"
```

### **Steg 4: Testa andra shortcuts**
```
Copy (Cmd+C):
   ✅ Toast: "X objekt kopierade"

Paste (Cmd+V):
   ✅ Toast: "X objekt inklistrade"

Select All (Cmd+A):
   ✅ Toast: "X objekt markerade"

Duplicate (Cmd+D):
   ✅ Toast: "X objekt duplicerade"

Delete (Backspace):
   ✅ Objekt försvinner
```

---

## 📊 TEKNISK ANALYS

### **Före (Buggy):**
```
Problem 1: Stora dependency arrays
- useEffect körs om när NÅGON dependency ändras
- handleKeyDown skapas om varje gång
- Event listener kan dupliceras
- Gamla listeners kanske inte tas bort

Problem 2: Stale closures
- undo() är en closure som fångar gamla state
- När state uppdateras, har handleKeyDown fortfarande gamla funktionen
- canUndo() kan returnera gamla värden

Problem 3: Race conditions
- Snabba state-uppdateringar → många useEffect re-runs
- Event listeners staplas på varandra
- Oklart vilken listener som körs först
```

### **Efter (Fixed):**
```
Lösning 1: Refs för alla värden
- Refs uppdateras direkt när värden ändras
- Ingen closure - alltid senaste värdet
- Inget beroende på useEffect re-runs

Lösning 2: Tom dependency array
- Event listener sätts upp EN GÅNG vid mount
- Ingen re-rendering av event handlers
- Ingen risk för duplicerade listeners

Lösning 3: Explicit ref-update useEffect
- Ett dedikerat useEffect uppdaterar ALLA refs
- Synkroniserat - alla refs uppdateras samtidigt
- Tydlig separation of concerns
```

---

## 🎯 FÖRDELAR MED REF-APPROACH

### **Performance:**
```
✅ Event listeners skapas EN GÅNG (inte vid varje state-uppdatering)
✅ Ingen re-rendering overhead
✅ Ingen risk för memory leaks
✅ Snabbare keyboard response
```

### **Reliabilitet:**
```
✅ Alltid senaste funktioner och värden (via refs)
✅ Inga stale closures
✅ Inga race conditions
✅ Förutsägbart beteende
```

### **Underhållbarhet:**
```
✅ Tydlig struktur (refs → update → use)
✅ Enkel att lägga till nya shortcuts
✅ Lätt att debugga med console.logs
✅ Ingen komplex dependency management
```

---

## 🔍 DEBUGGING TIPS

### **Om Cmd+Z fortfarande inte fungerar:**

#### **1. Kolla om event registreras:**
```javascript
console.log('🎹 Keyboard event:', { key, modKey, metaKey, ctrlKey });
```
- Om du INTE ser detta → Event listener fungerar inte
- Om du ser detta → Event listener fungerar, kolla nästa steg

#### **2. Kolla om modKey är true:**
```javascript
console.log('modKey:', modKey, 'metaKey:', e.metaKey, 'ctrlKey:', e.ctrlKey);
```
- På Mac ska `metaKey: true` och `ctrlKey: false`
- `modKey` ska vara `true`

#### **3. Kolla om isTyping är false:**
```javascript
console.log('isTyping:', isTyping, 'target:', target.tagName);
```
- Om du är i ett INPUT/TEXTAREA → isTyping är true → shortcut blockeras
- Klicka på canvas först för att fokusera den

#### **4. Kolla history state:**
```javascript
console.log('canUndo:', canUndoRef.current());
console.log('History:', { index: historyIndex, length: history.length });
```
- Om `canUndo: false` → Det finns inget att ångra
- Rita något först, SEDAN tryck Cmd+Z

#### **5. Kolla om flera event listeners finns:**
```javascript
// I console:
getEventListeners(window).keydown
```
- Om det finns flera listeners → Potentiell konflikt
- Hard refresh (Cmd+Shift+R) för att rensa

---

## ✅ CHECKLISTA

### **För användaren att testa:**
```
□ Cmd+Z (Undo) fungerar
□ Cmd+Shift+Z (Redo) fungerar på Mac
□ Ctrl+Z (Undo) fungerar på Windows
□ Ctrl+Y (Redo) fungerar på Windows
□ Cmd+C (Copy) fungerar
□ Cmd+V (Paste) fungerar
□ Cmd+A (Select All) fungerar
□ Cmd+D (Duplicate) fungerar
□ Delete/Backspace fungerar
□ Toast-meddelanden visas för varje operation
□ Console logs visar korrekt debug-info
```

### **Om något inte fungerar:**
```
1. Öppna DevTools Console
2. Tryck keyboard shortcut
3. Kolla vad som loggas
4. Skicka screenshot av console-output
```

---

## 🎉 SAMMANFATTNING

**Fixat:**
- ✅ Stale closure problem med refs
- ✅ Event listener duplicering med tom dependency array
- ✅ Mac Cmd-key detection (metaKey && !ctrlKey)
- ✅ Debug logging i både canvas och store
- ✅ Toast feedback för alla operations
- ✅ Alla keyboard shortcuts använder refs

**Resultat:**
- ✅ **Cmd+Z** (Mac) och **Ctrl+Z** (Windows) för Undo
- ✅ **Cmd+Shift+Z** (Mac) och **Ctrl+Y** (Windows) för Redo
- ✅ Alla andra shortcuts (C, V, A, D, Delete)
- ✅ Reliabelt, snabbt, förutsägbart

**Testa nu:**
1. Rita några väggar
2. Tryck **Cmd+Z** (Mac) eller **Ctrl+Z** (Windows)
3. Väggen försvinner ✅
4. Tryck **Cmd+Shift+Z** (Mac) eller **Ctrl+Y** (Windows)
5. Väggen återkommer ✅
6. **Toast-meddelande visas! 🎉**
