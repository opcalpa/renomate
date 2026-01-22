# Selection & Drag Refactoring Plan

## Current Problems

### 1. Dead Code (~140 lines)
- **Lines 1940-2073**: `handleStageDragMove` and `handleStageDragEnd`
- These handlers are attached to Stage but Stage has `draggable={false}`
- They NEVER execute - pure dead code

### 2. Inconsistent Multi-Select Drag
- WallShape: Has multi-select sync in onDragStart/Move/End ✅
- RoomShape: Has multi-select sync in onDragStart/Move/End ✅  
- RectangleShape: Only single drag ❌
- CircleShape: Only single drag ❌
- TextShape: Only single drag ❌
- FreehandShape: Only single drag ❌

### 3. Transformer Complexity
- Attached to all selected shapes
- All features disabled (resize, rotate, anchors)
- Just adds complexity without functionality
- Could be simplified or removed

### 4. Confusing Selection Logic
- Single click triggers `findConnectedWalls()` - auto-groups shapes
- This interferes with manual selection
- User expects: click = select ONE shape (Miro style)
- Current: click = select ALL connected shapes

### 5. Redundant State
- `selectedShapeId` (singular) - for backward compatibility?
- `selectedShapeIds` (plural) - actual multi-select
- Both are kept in sync but adds complexity

## Proposed Clean Solution

### Phase 1: Remove Dead Code ✂️

```typescript
// DELETE lines 1935-2073:
const dragStartPos = useRef<...>(); // UNUSED
const draggedShapeId = useRef<...>(); // UNUSED  
const isDraggingMultiSelect = useRef<...>(); // UNUSED
const handleStageDragMove = ... // NEVER CALLED
const handleStageDragEnd = ... // NEVER CALLED
```

### Phase 2: Unified Multi-Select Drag System 🎯

Create a centralized helper that ALL shapes use:

```typescript
// NEW: Shared drag handler factory
const createMultiSelectDragHandlers = (shape: FloorMapShape) => ({
  onDragStart: (e) => {
    e.cancelBubble = true;
    const selectedIds = useFloorMapStore.getState().selectedShapeIds;
    if (selectedIds.length > 1 && selectedIds.includes(shape.id)) {
      // Store start positions for all selected shapes
      selectedIds.forEach(id => {
        const node = shapeRefs.current.get(id);
        if (node?.parent) {
          dragStartPositions.current[id] = node.parent.position();
        }
      });
    }
  },
  
  onDragMove: (e) => {
    e.cancelBubble = true;
    const node = e.target;
    const selectedIds = useFloorMapStore.getState().selectedShapeIds;
    
    // Snap to grid
    if (snapEnabled) {
      const snapped = snapToGrid(node.position(), snapSize);
      node.position(snapped);
    }
    
    // Sync all selected shapes
    if (selectedIds.length > 1 && selectedIds.includes(shape.id)) {
      syncSelectedShapes(shape.id, node.position());
    }
  },
  
  onDragEnd: (e) => {
    e.cancelBubble = true;
    const selectedIds = useFloorMapStore.getState().selectedShapeIds;
    
    if (selectedIds.length > 1 && selectedIds.includes(shape.id)) {
      updateAllSelectedShapes(selectedIds);
    } else {
      updateSingleShape(shape);
    }
  }
});
```

### Phase 3: Simplify Selection Logic 🎯

```typescript
// REMOVE auto-grouping from handleShapeClick
// BEFORE:
const connectedShapeIds = findConnectedWalls(shapeId, ...); // Auto-group
setSelectedShapeIds(connectedShapeIds);

// AFTER (Miro-style):
if (e.evt.ctrlKey || e.evt.metaKey) {
  // Toggle selection (add/remove)
  toggleShapeSelection(shapeId);
} else {
  // Replace selection (click selects only this)
  setSelectedShapeIds([shapeId]);
}

// Keep findConnectedWalls() but move to:
// - Shift+Double-Click = select connected group
// - Or a toolbar button "Select Connected"
```

### Phase 4: Simplify/Remove Transformer 🗑️

Option A: Remove entirely
```typescript
// Shapes handle their own selection visual (blue stroke)
// No Transformer needed
```

Option B: Keep for visual feedback only
```typescript
<Transformer
  ref={transformerRef}
  listening={false}  // Don't capture events
  // Just shows bounding box
/>
```

### Phase 5: Clean Up State 🧹

```typescript
// REMOVE selectedShapeId (singular)
// KEEP selectedShapeIds (plural) - single source of truth

// Update all code that uses selectedShapeId to use:
const primarySelectedId = selectedShapeIds[0];
```

## Implementation Order

1. ✅ Remove dead Stage handlers (safe, no dependencies)
2. ✅ Create unified drag helper
3. ✅ Apply to all shape types
4. ✅ Simplify selection (remove auto-grouping from click)
5. ✅ Test & verify
6. ✅ Remove Transformer or simplify
7. ✅ Clean up redundant state

## Expected Behavior After Refactor

### Selection (Miro-style):
- **Click** = Select single shape (clear others)
- **Ctrl/Cmd+Click** = Toggle shape in/out of selection
- **Drag box** = Multi-select (already works)
- **Double-click** = Open properties (already works)

### Drag (Unified):
- **Drag any selected shape** = All selected shapes move together
- **Snap to grid** = Works during drag
- **All shape types** = Same behavior (consistent)

### Clean Code:
- ~140 lines removed (dead code)
- Unified drag logic (DRY)
- Simpler selection (no auto-grouping confusion)
- One source of truth for selection state

## Migration Notes

- Auto-grouping moved to: Shift+Double-Click or toolbar button
- All shapes now behave consistently
- Performance improved (less redundant code)
