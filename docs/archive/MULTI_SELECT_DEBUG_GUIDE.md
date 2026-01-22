# 🐛 Multi-Select & Drag Debug Guide

## Problem Identification

User reports that box selection (drag-to-select) is not working properly:
1. Selection box is not visible (or only visible sometimes after release)
2. Objects are not being selected even when covered by the box
3. Console shows: "Box selection completed, but no objects found in area"

## Root Cause Analysis

### Potential Issues:

#### 1. **Transformer Only Shows with Select Tool** ✅ FIXED
**Problem**: `Transformer` was only rendered when `activeTool === 'select'`
**Impact**: Even if shapes were selected, no visual feedback or drag handles
**Fix**: Changed condition to `(selectedShapeIds.length > 0 || selectedShapeId)`

```typescript
// BEFORE (broken):
{activeTool === 'select' && (
  <Transformer ... />
)}

// AFTER (fixed):
{(selectedShapeIds.length > 0 || selectedShapeId) && (
  <Transformer ... />
)}
```

#### 2. **Coordinate System Mismatch**
**Problem**: Selection box coordinates vs node coordinates might be in different spaces
**Fix**: Using `getClientRect({ relativeTo: stage })` for consistent coordinate system

#### 3. **Node Lookup Failure**
**Problem**: `stage.findOne((n) => n.attrs.name === shape.id)` might not find nodes
**Possible causes**:
- `name` attribute not set on all shapes
- Shapes rendered in different Layer
- Timing issue (nodes not yet rendered)

## Debug Steps

### Step 1: Verify Tool State
```javascript
// In browser console:
useFloorMapStore.getState().activeTool  // Should be 'select'
```

### Step 2: Check Selection Box Visibility
- Should see bright blue rectangle with glow when dragging
- If not visible: CSS/rendering issue

### Step 3: Console Output Analysis

**Expected output when box selecting:**
```
📦 BOX SELECTION STARTED at: {x: 234, y: 567}
🔍 Box Selection: {x: 234, y: 567, width: 123, height: 89}
📊 Total shapes to check: 5
📦 Shape wall abc123: { nodeRect: {...}, selectionRect: {...} }
✅ Shape abc123 selected!
```

**If you see "Node not found":**
→ Shapes don't have `name={shape.id}` attribute
→ Check WallShape, RoomShape, etc. all have `name` prop

**If you see coordinates but no selection:**
→ Coordinate system mismatch
→ Check `nodeRect` vs `selectionRect` values

### Step 4: Manual Selection Test
Try clicking on a single object (not box selection):
- Does it get selected?
- Do blue handles appear?
- Does it work with Select tool active?

## Quick Fixes Checklist

- [ ] Verify `activeTool === 'select'` in console
- [ ] Check if `gridSettings.snap` is enabled (might interfere)
- [ ] Try with zoom = 1.0 (100%) to rule out zoom issues
- [ ] Check if shapes have `name={shape.id}` attribute
- [ ] Verify Transformer renders when shapes are selected
- [ ] Test individual shape selection (click) vs box selection (drag)

## Code Locations

- **Box Selection Start**: `UnifiedKonvaCanvas.tsx:1340`
- **Box Selection Logic**: `UnifiedKonvaCanvas.tsx:1468-1540`
- **Transformer Rendering**: `UnifiedKonvaCanvas.tsx:1838-1980`
- **Transformer Update**: `UnifiedKonvaCanvas.tsx:1614-1636`
- **Shape Name Attributes**: All shape components (WallShape, RoomShape, etc.)

## Testing Procedure

1. **Open DevTools Console** (F12)
2. **Click "Select" tool** (first icon in toolbar)
3. **Console should show**: activeTool is 'select'
4. **Draw some walls** (switch to Wall tool, draw 2-3 walls)
5. **Switch back to Select tool**
6. **Try box selection**: Click and drag over the walls
7. **Watch console output** for debug messages
8. **Report back with**:
   - What you see visually (blue box?)
   - Console output (copy/paste)
   - How many objects should be selected vs actually selected

## Emergency Fallback

If box selection completely broken, try individual selection:
- Click directly on objects (should work)
- Use Ctrl+Click to add to selection
- Then try dragging selected objects

## Contact Points

If still broken after fixes:
- Share screenshot of console output
- Share video of what happens when you drag
- Check if there are any errors in Console (red text)
