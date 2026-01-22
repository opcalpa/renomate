# 🐛 Drag & Mouse Issues - Root Cause Analysis

## Reported Problems
1. ❌ Cannot move objects
2. ❌ Cursor behaves strangely  
3. ❌ Cursor starts from weird positions when clicking
4. ❌ Object dragging doesn't work

## Critical Issues Found

### Issue 1: Box Selection Interferes with Object Dragging 🔴 CRITICAL
**Problem**:
```typescript
// handleMouseDown (line ~1495)
const clickedOnEmpty = e.target === e.target.getStage();

if (clickedOnEmpty) {
  // Start box selection
  setIsBoxSelecting(true);
  setSelectionBox({ start: pos, end: pos });
}
```

**The Bug**: 
- `e.target === e.target.getStage()` ALWAYS TRUE!
- This means EVERY click starts box selection
- Even when clicking on objects!
- Objects can't be dragged because box selection intercepts

**Why It Happens**:
```typescript
// Should be:
const clickedOnEmpty = e.target === stage;

// NOT:
const clickedOnEmpty = e.target === e.target.getStage(); // Always true!
```

### Issue 2: Transformer Fights with Individual Dragging 🔴 CRITICAL
**Problem**:
```typescript
// Shapes are: draggable={!isSelected}
// When selected: draggable={false}
// Transformer should handle dragging

// But Transformer's onTransform snaps nodes:
onTransform={() => {
  nodes.forEach(node => {
    const snappedX = Math.round(node.x() / snapSize) * snapSize;
    node.position({ x: snappedX, y: snappedY });
  });
}}
```

**The Bug**:
- Transformer tries to snap nodes DURING transform
- This can cause jittery behavior
- Coordinates might not update correctly
- "Weird cursor position" symptom

### Issue 3: Coordinate System Confusion ⚠️ MEDIUM
**Problem**:
```typescript
// Mouse coordinates transformed:
let pos = {
  x: (pointer.x - viewState.panX) / viewState.zoom,
  y: (pointer.y - viewState.panY) / viewState.zoom,
};
```

**Potential Issue**:
- Works for most cases
- But Transformer operates in different coordinate space
- When zoom/pan changes, coordinates might be off

### Issue 4: Event Propagation ⚠️ MEDIUM
**Problem**:
- Box selection starts even when clicking on shapes
- No proper `e.stopPropagation()` on shape clicks
- Events bubble up to Stage

## The Fix

### Fix 1: Correct Empty Click Detection (CRITICAL)
```typescript
// BEFORE (broken):
const clickedOnEmpty = e.target === e.target.getStage();

// AFTER (fixed):
const stage = stageRef.current;
const clickedOnEmpty = e.target === stage || e.target.getType() === 'Stage';
```

### Fix 2: Remove Aggressive Transformer Snapping
```typescript
// BEFORE (causes jitter):
onTransform={() => {
  nodes.forEach(node => {
    node.position({ x: snapped, y: snapped });
  });
}}

// AFTER (smooth dragging):
// Only snap on dragEnd, not during drag
```

### Fix 3: Add Event Stoppage on Shape Clicks
```typescript
// In shape onClick:
onClick={(e) => {
  e.cancelBubble = true; // Stop propagation
  onSelect();
}}
```

### Fix 4: Simplify Transformer Configuration
```typescript
// Remove dragBoundFunc (causes issues)
// Keep onTransformEnd for final snap
// Let Konva handle intermediate dragging
```

## Implementation Priority

1. **IMMEDIATE** (Fix 1): Correct empty click detection
2. **IMMEDIATE** (Fix 2): Remove aggressive snap from onTransform
3. **HIGH** (Fix 3): Add event stopping
4. **MEDIUM** (Fix 4): Simplify Transformer

## Expected Behavior After Fix

✅ Click on object → Selects it (no box selection starts)
✅ Drag selected object → Moves smoothly
✅ Release → Snaps to grid
✅ Multi-select drag → All objects move together
✅ Cursor position → Correct and stable

## Testing Checklist

After fixes, verify:
- [ ] Click on wall → Selects (blue handles)
- [ ] Drag wall → Moves smoothly (no jitter)
- [ ] Release → Snaps to grid
- [ ] Click empty space → No interference with selection
- [ ] Box selection still works when dragging on empty
- [ ] Multi-object drag works
- [ ] Cursor is stable during drag

---

**Priority**: 🔴 CRITICAL - Blocks core functionality
**Effort**: 10 minutes
**Impact**: Will completely fix dragging issues
