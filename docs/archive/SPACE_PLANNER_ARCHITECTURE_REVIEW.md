# Space Planner Architecture Review

## 🔍 Current Architecture Analysis

### **Critical Issues Identified**

#### 1. **Duplicate State Management Systems** ⚠️
Your application has **TWO SEPARATE** state management systems that don't communicate:

**System A: Zustand Store (`store.ts`)**
- Manages `shapes: FloorMapShape[]`
- Used by: FloorMapCanvas.tsx (Fabric.js version)
- NOT used by: FloorPlanCanvas.tsx (your current active canvas)

**System B: Local React State (`FloorPlanCanvas.tsx`)**
- Manages `objects: DrawnObject[]`
- Uses Canvas 2D API directly
- Completely independent from Zustand

**Problem:** You're updating Zustand store, but FloorPlanCanvas doesn't read from it!

#### 2. **Multiple Canvas Implementations** 🎨
You have 4 different canvas implementations in the same codebase:

1. **FloorPlanCanvas.tsx** - Native Canvas 2D API (CURRENTLY ACTIVE)
2. **FloorMapCanvas.tsx** - Fabric.js 
3. **KonvaCanvas.tsx** - React-Konva (your recent refactor attempt)
4. **ElevationCanvas.tsx** - For elevation views

This creates confusion about which component to use and where state should live.

#### 3. **Room Name Visibility Issue** 👻

**Why names disappear:**

```typescript
// In loadRoomsFromDB (line 1337-1370)
const loadRoomsFromDB = useCallback(async () => {
  // ... loads rooms from DB
  const loadedRooms: DrawnObject[] = data.map(room => ({
    id: room.id,
    name: room.name,  // ✅ Name IS set here
    // ...
  }));
  
  // Add loaded rooms to objects, but avoid duplicates
  const existingRoomIds = new Set(objects.filter(obj => obj.roomId).map(obj => obj.roomId));
  const newRooms = loadedRooms.filter(room => !existingRoomIds.has(room.roomId));
  const newObjects = [...objects, ...newRooms];
  setObjects(newObjects);
}, [projectId, objects]); // ❌ PROBLEM: objects dependency
```

**The Problem Chain:**
1. `objects` is in dependency array → function recreates on EVERY objects change
2. When user resizes/moves room → `setObjects` called → `objects` changes
3. `loadRoomsFromDB` recreates → but existing rooms already exist
4. `newRooms` filters out existing rooms → no update happens
5. Old objects without updated names remain

**Additional Issue:**
```typescript
// In drawObject (line 790)
if (obj.name && obj.name.trim()) {  // ✅ Correct check
  // Draw name...
}
```

The drawing logic is CORRECT. The problem is the `name` property gets lost during object updates!

#### 4. **Inconsistent Data Flow** 🔄

```
Database (rooms table)
    ↓
loadRoomsFromDB()
    ↓
Local State (objects)  ← ❌ No sync back to DB on updates
    ↓
Canvas Rendering
```

When you:
- Resize a room → `resizeRoomObject()` called → returns NEW objects
- Move a room → objects.map() creates NEW objects
- **BUT** the `name` property is not always preserved!

Look at `resizeRoomObject` (line 1652-1657):
```typescript
return {
  ...obj,
  points: newPoints,
  area: newArea,
  // ❌ name is spread from obj, but if obj.name is undefined, it stays undefined
};
```

## 🎯 Recommended Solutions

### **Option 1: Quick Fix (Minimal Changes)** ⚡

**What to do:**
1. Add debug logging to see when names are lost
2. Ensure ALL object transformations preserve `name`
3. Remove `objects` from `loadRoomsFromDB` dependencies

**Implementation:**

```typescript
// Fix 1: Update loadRoomsFromDB
const loadRoomsFromDB = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      setObjects(currentObjects => {
        const existingRoomIds = new Set(
          currentObjects.filter(obj => obj.roomId).map(obj => obj.roomId)
        );
        
        const loadedRooms: DrawnObject[] = data.map(room => ({
          id: room.id,
          type: 'room' as const,
          points: room.floor_plan_position?.points || [],
          selected: false,
          color: room.color || ROOM_COLOR,
          thickness: ROOM_STROKE_THICKNESS,
          name: room.name,
          area: room.dimensions?.area_sqm,
          roomId: room.id,
        })).filter(room => room.points.length > 0);
        
        // Update existing rooms with new names
        const updatedObjects = currentObjects.map(obj => {
          if (obj.type === 'room' && obj.roomId) {
            const roomData = data.find(r => r.id === obj.roomId);
            if (roomData) {
              return { ...obj, name: roomData.name };
            }
          }
          return obj;
        });
        
        // Add new rooms
        const newRooms = loadedRooms.filter(room => !existingRoomIds.has(room.roomId));
        return [...updatedObjects, ...newRooms];
      });
    }
  } catch (error) {
    console.error("Error loading rooms from DB:", error);
  }
}, [projectId]); // ✅ Remove objects dependency

// Fix 2: Add name preservation in ALL transformation functions
const resizeRoomObject = (objectId: string, handle: 'nw' | 'ne' | 'sw' | 'se', newPos: Point): DrawnObject[] => {
  return objects.map(obj => {
    if (obj.id !== objectId || obj.type !== 'room') return obj;
    
    // ... calculate new points and area ...
    
    return {
      ...obj,
      points: newPoints,
      area: newArea,
      name: obj.name || '', // ✅ Explicitly preserve name
    };
  });
};

// Fix 3: Add debug logging
const drawObject = (ctx: CanvasRenderingContext2D, obj: DrawnObject) => {
  if (obj.type === 'room') {
    console.log(`Drawing room ${obj.id}, name: "${obj.name}", roomId: ${obj.roomId}`);
    
    if (obj.name && obj.name.trim()) {
      // ... draw name ...
    } else {
      console.warn(`Room ${obj.id} has no name!`);
    }
  }
};
```

### **Option 2: Architecture Refactor (Recommended)** 🏗️

**Unify state management:**

```typescript
// 1. Use Zustand store as single source of truth
// 2. FloorPlanCanvas reads from store, not local state
// 3. All updates go through store actions

// In FloorPlanCanvas.tsx:
const FloorPlanCanvas = ({ projectId, planId }: FloorPlanCanvasProps) => {
  const { shapes, addShape, updateShape, deleteShape } = useFloorMapStore();
  
  // Convert Zustand shapes to canvas objects
  const objects = useMemo(() => 
    shapes
      .filter(s => s.planId === planId)
      .map(shapeToDrawnObject),
    [shapes, planId]
  );
  
  // No more local setObjects - use store actions instead
  const handleRoomResize = (roomId: string, newPoints: Point[]) => {
    updateShape(roomId, { coordinates: { points: newPoints } });
  };
  
  // ...
};
```

### **Option 3: Migrate to React-Konva (Long-term)** 🚀

Your attempt to use React-Konva was correct thinking! But it needs:
1. Complete migration (not partial)
2. Integration with Zustand store
3. All drawing tools implemented

**Benefits:**
- Better performance
- Built-in dragging/resizing
- Better state management
- Easier to maintain

## 🐛 Debugging Steps

**Add this to FloorPlanCanvas to see what's happening:**

```typescript
// After loadRoomsFromDB in useEffect
useEffect(() => {
  if (projectId) {
    loadRoomsFromDB();
    
    // Debug: Log all room names after 1 second
    setTimeout(() => {
      console.log('=== ROOM NAMES DEBUG ===');
      objects.forEach(obj => {
        if (obj.type === 'room') {
          console.log(`Room ${obj.id}:`, {
            name: obj.name,
            roomId: obj.roomId,
            hasName: !!obj.name,
            points: obj.points.length
          });
        }
      });
    }, 1000);
  }
}, [projectId]);

// In redrawCanvas
const redrawCanvas = useCallback(() => {
  // ... existing code ...
  
  // Debug: Count rooms with/without names
  const roomsWithNames = objects.filter(o => o.type === 'room' && o.name).length;
  const roomsWithoutNames = objects.filter(o => o.type === 'room' && !o.name).length;
  if (roomsWithoutNames > 0) {
    console.warn(`⚠️ ${roomsWithoutNames} rooms missing names (${roomsWithNames} have names)`);
  }
}, [objects, /* ... */]);
```

## 📊 Summary

**Current State:**
- ❌ Duplicate state systems
- ❌ Multiple canvas implementations
- ❌ Names lost during object transformations
- ❌ Inconsistent data flow

**Root Cause:**
Names disappear because object transformations (resize, move) create new objects without preserving the `name` property.

**Quick Fix Priority:**
1. Fix `loadRoomsFromDB` to update existing room names
2. Ensure ALL transformation functions preserve `name`
3. Remove problematic dependencies
4. Add debug logging

**Long-term:**
Migrate to single state source (Zustand) and consider React-Konva for better architecture.
