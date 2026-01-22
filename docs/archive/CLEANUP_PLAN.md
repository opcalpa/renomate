# Floor Plan Editor - Cleanup Plan

## Current Situation (Problem)

### Duplicate Components Found:
1. **Canvas Components** (2 versions):
   - `FloorMapCanvas.tsx` (1082 lines) - NOT USED ❌
   - `SimpleDrawingCanvas.tsx` (1106 lines) - CURRENTLY USED ✅

2. **Toolbar Components** (2 versions):
   - `Toolbar.tsx` - Advanced version with all new features ✨
   - `SimpleToolbar.tsx` - Simple version CURRENTLY USED ✅

3. **Property Panels** (3 versions):
   - `ModernPropertyPanel.tsx` - New Canva-style panel ✨
   - `ObjectPropertiesPanel.tsx` 
   - `ShapePropertiesPanel.tsx`

4. **Dimension Components** (3 versions):
   - `DimensionLabel.tsx`
   - `ObjectDimensions.tsx`
   - `ObjectDimensionPopup.tsx`

### New Features Present in Unused Components:
- ✨ Door tool
- ✨ Wall Opening tool  
- ✨ Multi-select with drag-to-select
- ✨ Keyboard shortcuts (Ctrl+Z/Y, Ctrl+A, etc)
- ✨ Right-click context menu
- ✨ Auto-merge walls
- ✨ Modern property panel
- ✨ Synced dimensions (1px = 10mm)
- ✨ Decimal gridlines when zooming

## Cleanup Strategy

### Phase 1: Consolidate into ONE Canvas
**Goal:** Create a single, clean `FloorPlanCanvas.tsx` with ALL features

**Actions:**
1. Rename `SimpleDrawingCanvas.tsx` → `FloorPlanCanvas.tsx`
2. Add all new features from `FloorMapCanvas.tsx` to it
3. Delete `FloorMapCanvas.tsx`
4. Update imports in `FloorMapEditor.tsx`

### Phase 2: Consolidate into ONE Toolbar  
**Goal:** Create a single `FloorPlanToolbar.tsx` with ALL tools

**Actions:**
1. Merge features from both `Toolbar.tsx` and `SimpleToolbar.tsx`
2. Create new `FloorPlanToolbar.tsx` with:
   - All existing tools (select, pen, wall, room, eraser)
   - New tools (door, opening)
   - Zoom controls
   - Grid controls
   - Undo/Redo
3. Delete both old toolbars
4. Update imports

### Phase 3: Clean up Property Panels
**Goal:** Keep only ONE property panel

**Actions:**
1. Keep `ModernPropertyPanel.tsx` (newest, best UX)
2. Delete `ObjectPropertiesPanel.tsx` and `ShapePropertiesPanel.tsx`

### Phase 4: Clean up Dimension Components
**Goal:** Keep only necessary dimension components

**Actions:**
1. Analyze which are actually used
2. Keep the most functional ones
3. Delete duplicates

### Phase 5: Rename for Clarity
**Goal:** Make naming consistent and clear

**Renames:**
- `FloorMapEditor.tsx` → Keep (entry point)
- Canvas → `FloorPlanCanvas.tsx`
- Toolbar → `FloorPlanToolbar.tsx`
- All "FloorMap" → "FloorPlan" for consistency

## Expected Result

### Clean Structure:
```
src/components/floormap/
├── FloorPlanCanvas.tsx        (ONE unified canvas)
├── FloorPlanToolbar.tsx       (ONE unified toolbar)  
├── FloorMapEditor.tsx         (orchestrator)
├── ModernPropertyPanel.tsx    (property editing)
├── DimensionLabel.tsx         (dimension display)
├── ToolContextMenu.tsx        (right-click menu)
├── store.ts                   (Zustand state)
├── types.ts                   (TypeScript types)
└── utils/
    ├── wallMerge.ts
    ├── geometry.ts
    ├── units.ts
    └── plans.ts
```

### Features in Final Version:
✅ All basic tools (select, draw, erase)
✅ Wall tool with auto-merge
✅ Door & Opening tools
✅ Multi-select (drag + Ctrl/Cmd)
✅ Keyboard shortcuts
✅ Right-click context menu
✅ Grid with decimal levels
✅ Zoom & pan
✅ Synced dimensions (1:100 scale)
✅ Modern property panel
✅ Undo/Redo

## Implementation Order

1. ✅ Create cleanup plan (this file)
2. Create unified `FloorPlanCanvas.tsx`
3. Create unified `FloorPlanToolbar.tsx`
4. Update `FloorMapEditor.tsx` to use new components
5. Test everything works
6. Delete old/duplicate files
7. Update any remaining imports
8. Final testing

## Files to DELETE After Cleanup

- `FloorMapCanvas.tsx` (duplicate)
- `SimpleDrawingCanvas.tsx` (will be replaced)
- `Toolbar.tsx` (will be merged)
- `SimpleToolbar.tsx` (will be merged)
- `ObjectPropertiesPanel.tsx` (duplicate)
- `ShapePropertiesPanel.tsx` (duplicate)
- `ObjectDimensionPopup.tsx` (if not used)

## Estimated Time
- Planning: ✅ Done
- Implementation: ~30-45 minutes
- Testing: ~15 minutes
- Total: ~1 hour
