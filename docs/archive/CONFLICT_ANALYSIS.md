# 🔍 Conflict Analysis - Space Planner & Canvas Editor

## Analysis Date: 2026-01-19

## ✅ RESULTS: NO CRITICAL CONFLICTS FOUND

### 1. Component Structure ✅
```
ProjectDetail (Page)
└── SpacePlannerTab
    └── FloorMapEditor
        └── UnifiedKonvaCanvas ✅ (Only canvas system)
```

**Status**: Clean hierarchy, no conflicts

### 2. Event Listeners Analysis

#### FloorMapEditor Keyboard Handlers
```typescript
// FloorMapEditor.tsx (lines 48-91)
- Ctrl+Z / Cmd+Z → handleUndo()
- Ctrl+Y / Cmd+Y → handleRedo()
- Ctrl+S / Cmd+S → saveShapes()
- T → setActiveTool('text')
```

#### UnifiedKonvaCanvas Keyboard Handlers
```typescript
// UnifiedKonvaCanvas.tsx (lines 1146-1293)
- Space → Pan mode
- Escape → Cancel drawing
- Delete/Backspace → Delete selected
- Ctrl+Z → undo()
- Ctrl+Y → redo()
- Ctrl+A → Select all
- Ctrl+C → Copy
- Ctrl+V → Paste
- Ctrl+D → Duplicate
```

**Potential Conflict**: ❌ **FOUND!**
- Both FloorMapEditor AND UnifiedKonvaCanvas listen for Ctrl+Z/Y
- FloorMapEditor calls `handleUndo()` which calls `window.__canvasUndo()`
- UnifiedKonvaCanvas directly calls `undo()` from store

**Impact**: Double event handling - undo might be called twice!

### 3. State Management ✅

#### Zustand Store (Shared)
```typescript
// store.ts
- shapes: FloorMapShape[]
- selectedShapeId: string | null
- selectedShapeIds: string[]
- activeTool: Tool
- viewState: ViewState
- gridSettings: GridSettings
```

**Status**: Single source of truth, no conflicts

### 4. Auto-save Mechanism ⚠️

#### UnifiedKonvaCanvas
```typescript
// Auto-saves shapes 2 seconds after last change
useEffect(() => {
  const timeoutId = setTimeout(() => {
    saveShapesForPlan(/* ... */);
  }, 2000);
}, [shapes]);
```

#### FloorMapEditor
```typescript
// Manual save only
const handleManualSave = () => {
  window.__canvasSave();
};
```

**Status**: No conflict - auto-save and manual save are complementary

### 5. Window Global Variables ⚠️

Used for communication between FloorMapEditor and Canvas:
```typescript
window.__canvasUndo
window.__canvasRedo
window.__canvasCanUndo
window.__canvasCanRedo
window.__canvasSave
```

**Status**: Works but not ideal - potential for race conditions

## 🐛 Identified Issues

### Issue 1: Duplicate Keyboard Handlers ⚠️ HIGH PRIORITY
**Problem**: 
- FloorMapEditor listens for Ctrl+Z/Y
- UnifiedKonvaCanvas ALSO listens for Ctrl+Z/Y
- When user presses Ctrl+Z, BOTH handlers fire

**Impact**: Undo might be called twice, causing skip

**Solution**: Remove keyboard handlers from FloorMapEditor

### Issue 2: Old Comments 🧹 LOW PRIORITY
**Problem**: 
- FloorMapEditor has comments referencing "FloorPlanCanvas"
- Lines 66, 71, 76

**Impact**: Confusing for developers

**Solution**: Update/remove outdated comments

### Issue 3: Global Window Variables 🤔 MEDIUM PRIORITY
**Problem**: 
- Communication via `window.__canvas*` globals
- Not type-safe
- Potential race conditions

**Impact**: Fragile communication pattern

**Solution**: Use callbacks or context instead

## 🔧 Fixes Required

### Fix 1: Remove Duplicate Keyboard Handlers
**File**: `FloorMapEditor.tsx`
**Action**: Remove Ctrl+Z/Y/C/V/D handlers (now in UnifiedKonvaCanvas)

### Fix 2: Update Comments
**File**: `FloorMapEditor.tsx`
**Action**: Remove references to FloorPlanCanvas

### Fix 3: (Optional) Replace Window Globals
**Files**: `FloorMapEditor.tsx`, `UnifiedKonvaCanvas.tsx`
**Action**: Use props/callbacks instead of window globals

## ✅ What Works Well

1. **Single Canvas System**: Only UnifiedKonvaCanvas is used
2. **Shared State**: Zustand store prevents state conflicts
3. **Component Hierarchy**: Clean separation of concerns
4. **Auto-save**: Works independently, no conflicts
5. **No Import Errors**: All old canvas files properly removed

## 📊 Risk Assessment

| Issue | Severity | User Impact | Fix Difficulty |
|-------|----------|-------------|----------------|
| Duplicate keyboard handlers | HIGH | Undo skips steps | EASY |
| Outdated comments | LOW | None | TRIVIAL |
| Window globals | MEDIUM | Potential bugs | MEDIUM |

## 🎯 Recommendations

### Immediate (Do Now):
1. ✅ Remove duplicate keyboard handlers from FloorMapEditor
2. ✅ Update outdated comments

### Soon (Next Session):
3. Replace window globals with proper callbacks
4. Add TypeScript types for canvas communication

### Later (Nice to Have):
5. Add integration tests for keyboard shortcuts
6. Document keyboard shortcut system

## 🧪 Testing Checklist

After fixes, test these scenarios:

- [ ] Press Ctrl+Z once → Undo once (not twice!)
- [ ] Press Ctrl+Z multiple times → Each press = one undo
- [ ] Press Ctrl+Y → Redo works
- [ ] Press Ctrl+C/V → Copy/paste works
- [ ] Press Ctrl+D → Duplicate works
- [ ] Press Ctrl+A → Select all works
- [ ] Switch between tabs → No errors
- [ ] Manual save button → Works
- [ ] Auto-save after 2 seconds → Works

---

**Conclusion**: Only ONE critical issue found (duplicate keyboard handlers).
Fix is simple and will resolve potential undo/redo bugs.
