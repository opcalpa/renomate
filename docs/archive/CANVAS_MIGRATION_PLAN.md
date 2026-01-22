# 🎯 Canvas Migration Plan - Consolidation to UnifiedKonvaCanvas

## Current Problem
Multiple canvas implementations causing conflicts:
1. **FloorPlanCanvas.tsx** - Canvas 2D API (old)
2. **FloorMapCanvas.tsx** - Fabric.js (old)
3. **UnifiedKonvaCanvas.tsx** - React-Konva (NEW - target)
4. **SimpleDrawingCanvas.tsx** - Simple canvas
5. **ReactKonvaCanvas.tsx** - Basic Konva
6. **KonvaCanvas.tsx** - Incomplete Konva

## Migration Strategy

### Phase 1: Feature Inventory ✅
Identify all features from old canvases that must be preserved.

### Phase 2: Feature Migration 🔄
Implement missing features in UnifiedKonvaCanvas.

### Phase 3: Cleanup 🧹
Remove old canvas files and update all references.

### Phase 4: Testing ✅
Verify all functionality works in new system.

## Feature Comparison

### FloorPlanCanvas Features:
- ✅ Wall drawing with chaining
- ✅ Room drawing (rectangle)
- ✅ Door placement
- ✅ Wall opening
- ✅ Text placement
- ✅ Multi-select (group mode)
- ✅ Drag-to-select box
- ✅ Copy/paste (Ctrl+C/V)
- ✅ Duplicate (Ctrl+D)
- ✅ Select all (Ctrl+A)
- ✅ Undo/Redo
- ✅ Snap-to-grid
- ✅ Zoom/Pan
- ✅ Keyboard shortcuts
- ⚠️ Room name editing with popup
- ⚠️ Text editing with input overlay
- ⚠️ Resize handles for rooms
- ⚠️ Rotation handles

### UnifiedKonvaCanvas Status:
- ✅ Wall drawing with chaining
- ✅ Room drawing (polygon)
- ✅ Door placement
- ✅ Wall opening
- ✅ Text placement
- ✅ Multi-select with Transformer
- ✅ Drag-to-select box (JUST FIXED)
- ❌ Copy/paste
- ❌ Duplicate
- ❌ Select all
- ✅ Undo/Redo
- ✅ Real-time snap-to-grid
- ✅ Zoom/Pan (Miro-style)
- ✅ Keyboard shortcuts (partial)
- ✅ Room name dialog
- ✅ Text placement (simple)
- ✅ Resize handles (via Transformer)
- ✅ Rotation (via Transformer)
- ✅ Property panel
- ✅ Comments system

## Missing Features to Implement

### 1. Copy/Paste (Ctrl+C/V) ❌
**Priority**: HIGH
**Implementation**: 
```typescript
- Add keyboard listener for Ctrl+C
- Copy selectedShapeIds to clipboard state
- On Ctrl+V, duplicate shapes with offset
```

### 2. Duplicate (Ctrl+D) ❌
**Priority**: HIGH
**Implementation**:
```typescript
- Keyboard listener for Ctrl+D
- Clone selected shapes with 20px offset
- Add to shapes array
```

### 3. Select All (Ctrl+A) ❌
**Priority**: MEDIUM
**Implementation**:
```typescript
- Keyboard listener for Ctrl+A
- Set selectedShapeIds to all shape IDs
```

### 4. Text Editing Overlay ⚠️
**Priority**: MEDIUM
**Status**: Currently uses prompt(), should use overlay
**Implementation**:
```typescript
- Double-click text → show input overlay
- Position at text location
- Update text on Enter, cancel on Esc
```

### 5. Advanced Resize/Rotate for Rooms ⚠️
**Priority**: LOW
**Status**: Transformer provides basic resize
**Enhancement**: Custom handles for architectural precision

## Files to Delete After Migration

```
src/components/floormap/
├── FloorPlanCanvas.tsx ❌ DELETE (Canvas 2D - old)
├── FloorMapCanvas.tsx ❌ DELETE (Fabric.js - old)
├── SimpleDrawingCanvas.tsx ❌ DELETE (Simple - unused)
├── ReactKonvaCanvas.tsx ❌ DELETE (Konva - incomplete)
└── KonvaCanvas.tsx ❌ DELETE (Konva - incomplete)
```

**KEEP**:
```
├── UnifiedKonvaCanvas.tsx ✅ MAIN CANVAS
├── store.ts ✅ State management
├── types.ts ✅ Type definitions
└── utils/ ✅ Helper functions
```

## Implementation Order

### Step 1: Add Missing Keyboard Shortcuts ⏳
- Ctrl+C/V (copy/paste)
- Ctrl+D (duplicate)
- Ctrl+A (select all)

### Step 2: Update FloorMapEditor ⏳
- Remove toggle between old/new canvas
- Always use UnifiedKonvaCanvas
- Remove `useNewCanvas` state

### Step 3: Test All Features ⏳
- Wall drawing
- Room creation
- Multi-select
- Drag & drop
- Copy/paste
- Undo/redo
- Save/load

### Step 4: Delete Old Files ⏳
- Remove all old canvas files
- Update imports
- Clean up unused utilities

### Step 5: Documentation ⏳
- Update README
- Add keyboard shortcuts guide
- Update architecture docs

## Timeline

- **Immediate**: Fix multi-select (DONE ✅)
- **Next 10 mins**: Add copy/paste/duplicate
- **Next 10 mins**: Remove old canvases
- **Next 5 mins**: Testing & verification

## Success Criteria

- ✅ All features from old canvas work in new
- ✅ No performance regression
- ✅ Cleaner codebase (fewer files)
- ✅ No conflicts between systems
- ✅ All tests pass

## Rollback Plan

If critical issues found:
1. Keep old canvas files temporarily
2. Add feature flag to switch back
3. Fix issues in UnifiedKonvaCanvas
4. Try migration again

---

**Ready to proceed with migration?**
