# Critical Fix: createUnifiedDragHandlers Scope Error - RESOLVED ✅

**Date:** 2026-01-22  
**Issue:** `ReferenceError: createUnifiedDragHandlers is not defined`  
**Status:** ✅ FIXED

---

## Problem

After refactoring, the app crashed with:
```
Uncaught ReferenceError: createUnifiedDragHandlers is not defined
    at UnifiedKonvaCanvas.tsx:551
```

### Root Cause

**Scope mismatch:**
- `createUnifiedDragHandlers` was defined INSIDE `UnifiedKonvaCanvas` component (line ~1800)
- `WallShape`, `RoomShape`, and other shapes are defined OUTSIDE at module level (line ~400+)
- Module-level components cannot access component-level functions via closure

**Why it happened:**
During refactoring, I moved the unified drag system into UnifiedKonvaCanvas thinking nested function components would have access. But these shapes are actually memo'd module-level components, not nested functions.

---

## Solution

### 1. Moved `createUnifiedDragHandlers` to Module Level

**Before:**
```typescript
export const UnifiedKonvaCanvas = () => {
  const createUnifiedDragHandlers = useCallback(...); // ❌ Inside component
  
  // WallShape can't access this!
}

const WallShape = React.memo(...); // ❌ Outside component
```

**After:**
```typescript
// Module level - accessible to all
const createUnifiedDragHandlers = (shapeId, shapeRefsMap) => {...}; // ✅

const WallShape = React.memo(...); // ✅ Can access it now!

export const UnifiedKonvaCanvas = () => {
  // Component code
};
```

### 2. Added `shapeRefsMap` Parameter

**Why:** Module-level function doesn't have access to component refs via closure.

**Solution:** Pass refs as parameter.

```typescript
// Module level (top of file)
const sharedDragStartPositions = {}; // Shared state

const createUnifiedDragHandlers = (
  shapeId: string,
  shapeRefsMap: Map<string, Konva.Node> // ← Passed as param
) => {
  // Can now access shapeRefsMap!
  const node = shapeRefsMap.get(id);
};
```

### 3. Updated ShapeComponentProps Interface

Added `shapeRefsMap` to all shape component props:

```typescript
interface ShapeComponentProps {
  shape: FloorMapShape;
  isSelected: boolean;
  onSelect: () => void;
  onTransform: (updates: Partial<FloorMapShape>) => void;
  shapeRefsMap: Map<string, Konva.Node>; // ← NEW
}
```

### 4. Updated All Shape Component Calls

Updated calls in WallShape and RoomShape:

```typescript
// Before
{...createUnifiedDragHandlers(shape.id)}

// After
{...createUnifiedDragHandlers(shape.id, shapeRefsMap)}
```

### 5. Passed shapeRefs to All Shape Renders

Updated render calls for all shape types:

```typescript
// WallShape
<WallShape 
  shapeRefsMap={shapeRefs.current} // ← NEW
  {...otherProps} 
/>

// Same for: RoomShape, RectangleShape, CircleShape, TextShape, 
// FreehandShape, LibrarySymbolShape, ObjectLibraryShape
```

---

## Files Modified

1. **UnifiedKonvaCanvas.tsx**
   - Moved `createUnifiedDragHandlers` to module level (lines ~25-200)
   - Removed duplicate inside component (deleted ~170 lines)
   - Added `shapeRefsMap` to ShapeComponentProps interface
   - Updated all shape component renders to pass `shapeRefs.current`
   - Updated WallShape & RoomShape to destructure `shapeRefsMap` from props

---

## Changes Summary

### Lines Moved: ~170
- `createUnifiedDragHandlers` from inside component to module level

### Lines Modified: ~15
- ShapeComponentProps interface (+1 line)
- Shape render calls (+8 occurrences of `shapeRefsMap={shapeRefs.current}`)
- WallShape props destructuring (+1 param)
- RoomShape props destructuring (+1 param)
- Calls to createUnifiedDragHandlers (+4 occurrences of second param)

### Net Impact: Cleaner
- Module-level code is more reusable
- Clear separation of concerns
- Proper parameter passing instead of relying on closure

---

## Testing Checklist

✅ App loads without errors  
✅ WallShape renders correctly  
✅ RoomShape renders correctly  
✅ Other shapes render correctly  
✅ Single shape selection works  
✅ Single shape drag works  
✅ Multi-select works  
✅ Multi-select drag works  
✅ Snap-to-grid works  
✅ No console errors  

---

## Lessons Learned

### 1. **Scope Awareness**
- React.memo components at module level don't have access to component state/refs
- Be careful with closure assumptions

### 2. **Parameter vs Closure**
- Module-level functions need explicit parameters
- Component-level functions (useCallback) can use closure
- Choose based on where function is defined

### 3. **TypeScript Helps**
- Adding type to shapeRefsMap param made it clear what needed to be passed
- Interface updates propagated to all usages

---

## Architecture Decision

**Why module-level instead of useCallback?**

✅ **Pros:**
- Accessible to all shape components (module-level)
- No dependency array issues
- Cleaner code (not recreated on every render)
- Shared state via module-level object

❌ **Cons:**
- Need to pass shapeRefs as parameter
- Slightly more verbose at call sites

**Verdict:** Module-level is correct choice for this use case.

---

## Status

🎉 **FIXED AND TESTED**

The app now:
- Loads without errors ✅
- All shapes render correctly ✅
- Unified drag system works for all shapes ✅
- Clean, maintainable code ✅

**Ready for production!** 🚀
