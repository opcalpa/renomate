# Canvas Settings Verification & Testing Guide

## ✅ Completed Actions

### 1. **Removed Old UI Components**
- ✅ **Deleted:** Old sticky info panel (bottom-left of canvas)
  - Previously showed: "📐 Ritskala" and "📏 Rutnät"
  - Location: `UnifiedKonvaCanvas.tsx` lines 3413-3478
  - **Removed** to prevent duplicate/confusing UI

- ✅ **Deleted:** Unused `StatusSettingsBar.tsx` component
  - Was never actually rendered
  - Duplicate functionality of new CanvasSettingsPopover

### 2. **New Unified Settings Location**
- ✅ **Single source:** Canvas Settings button in Toolbar (Workspace section)
- ✅ **Popover UI:** Clean, organized settings panel
- ✅ **All controls:** Scale, Unit, Grid, Snap, Display options

---

## 🧪 Verification Checklist

### Test 1: Scale Changes Affect Canvas ✅

**Steps:**
1. Open Floor Plan
2. Toolbar → Bottom → Click ⚙️ **Canvas** button
3. Drawing Scale → Change from "1:100" to "1:50"
4. **Expected Result:**
   - Grid becomes finer (auto-adjusts to 250mm)
   - If existing shapes: Lines appear slightly thicker
   - Zoom feels different (1:50 is more detailed)

**Verification:**
```typescript
// In store:
projectSettings.scale = '1:50'
projectSettings.gridInterval = 250 (auto-set)

// In canvas:
- getScaleFactor('1:50') = 1.2
- Line weights multiply by 1.2x
- Text sizes adjust proportionally
```

---

### Test 2: Unit Changes Format Labels ✅

**Steps:**
1. Draw a wall (any length)
2. Note the length label (e.g., "400.00 cm")
3. Canvas Settings → Display Unit → Click **"m"**
4. **Expected Result:**
   - Label updates to "4.00 m"
   - Database value unchanged (still 4000mm)
   - No shape re-positioning

**Verification:**
```typescript
// Database (unchanged):
shape.coordinates = { x1: 0, y1: 0, x2: 4000, y2: 0 }

// Display (dynamic):
formatMeasurement(4000, 'cm') → "400.00 cm"
formatMeasurement(4000, 'm') → "4.00 m"
formatMeasurement(4000, 'mm') → "4000 mm"
```

---

### Test 3: Grid Visibility Toggle ✅

**Steps:**
1. Canvas Settings → Show Grid → Toggle **OFF**
2. **Expected Result:**
   - Grid disappears from canvas
   - Drawing still works
   - Snap still works (if enabled)

3. Toggle **ON** again
4. **Expected Result:**
   - Grid reappears
   - Uses current gridInterval setting

**Verification:**
```typescript
// In canvas render:
{projectSettings.gridVisible && (
  <Layer listening={false}>
    <Grid ... />
  </Layer>
)}
```

---

### Test 4: Snap to Grid Toggle ✅

**Steps:**
1. Snap **ON** (default)
   - Draw wall → Cursor "sticks" to grid intersections
   - Feels magnetic

2. Canvas Settings → Snap to Grid → Toggle **OFF**
   - Draw wall → Cursor moves freely
   - No grid constraint
   - Pixel-perfect placement possible

3. Toggle **ON** again
   - Draw wall → Magnetic behavior returns

**Verification:**
```typescript
// In mouseDown handler:
const snapEnabled = projectSettings.snapEnabled;
pos = snapToGrid(pos, currentSnapSize, snapEnabled);

// When snapEnabled = false:
// snapToGrid returns original position unchanged
```

---

### Test 5: Grid Interval Changes ✅

**Steps:**
1. Canvas Settings → Grid Spacing → Select **"1m"** (1000mm)
2. **Expected Result:**
   - Grid spacing visually wider
   - Snap points further apart (if snap enabled)
   - Multi-level grid adjusts (fine/medium/major lines)

3. Change to **"5cm"** (50mm)
4. **Expected Result:**
   - Very fine grid
   - Close snap points
   - Better for detailed work

**Verification:**
```typescript
projectSettings.gridInterval = 1000 // or 50
// Grid component uses this value:
const levels = getGridLevels(projectSettings.gridInterval, projectSettings.scale)
```

---

### Test 6: Display Options Toggle ✅

**Steps:**
1. Canvas Settings → Auto-show Dimensions → Toggle **OFF**
2. **Expected Result:**
   - Future shapes won't auto-show dimension labels
   - Existing labels remain (this controls new shapes only)

3. Canvas Settings → Auto-show Room Areas → Toggle **ON**
4. **Expected Result:**
   - Future rooms will auto-show area labels
   - Uses current unit for formatting

**Note:** These settings control **default behavior** for new shapes. Existing shapes retain their current label state.

---

### Test 7: Settings Persist Across Selections ✅

**Steps:**
1. Set scale to "1:50"
2. Set unit to "m"  
3. Set grid to "50cm"
4. Click around canvas, select tools
5. **Expected Result:**
   - Settings remain unchanged
   - Not affected by tool selection
   - Persistent workspace configuration

**Verification:**
```typescript
// Settings stored in Zustand:
const projectSettings = useFloorMapStore(state => state.projectSettings);
// Persists across re-renders
// Independent of activeTool, selectedShape, etc.
```

---

### Test 8: Scale Auto-Adjusts Grid ✅

**Steps:**
1. Canvas Settings → Scale → "1:20" (detailed)
2. **Expected Result:**
   - Grid interval auto-sets to 100mm (fine grid)
   - Appropriate for detailed architectural work

3. Change Scale → "1:500" (overview)
4. **Expected Result:**
   - Grid interval auto-sets to 2000mm (coarse grid)
   - Appropriate for large site plans

**Verification:**
```typescript
// In store action:
setScale: (scale) => {
  const newGridInterval = getDefaultGridInterval(scale);
  return {
    projectSettings: { 
      ...state.projectSettings, 
      scale,
      gridInterval: newGridInterval // Auto-adjust!
    }
  }
}
```

---

## 🎯 Integration Points

### Where Settings Are Used:

**1. Grid Rendering (UnifiedKonvaCanvas.tsx):**
```typescript
{projectSettings.gridVisible && (
  <Grid 
    gridInterval={projectSettings.gridInterval}
    scale={projectSettings.scale}
  />
)}
```

**2. Snap Behavior (handleMouseDown):**
```typescript
pos = snapToGrid(pos, currentSnapSize, projectSettings.snapEnabled);
```

**3. Label Formatting (Throughout):**
```typescript
const label = formatMeasurement(
  lengthMM, 
  projectSettings.unit
);
```

**4. Scale Factor (Visual adjustments):**
```typescript
const scaleFactor = getScaleFactor(projectSettings.scale);
lineWidth = baseWidth * scaleFactor;
fontSize = baseFontSize * scaleFactor;
```

---

## 🔍 Known Behaviors

### Grid Interval Recommendations by Scale:
- **1:20** → 100mm (10cm) - Fine detail work
- **1:50** → 250mm (25cm) - Standard detail
- **1:100** → 500mm (50cm) - Default residential
- **1:500** → 2000mm (2m) - Large overview

### Unit Display Precision:
- **mm:** No decimals (e.g., "4000 mm")
- **cm:** 2 decimals (e.g., "400.00 cm")
- **m:** 2 decimals (e.g., "4.00 m")

### Snap Precision:
- Dynamic based on zoom level
- Wall tool: Uses finest visible grid
- Other tools: Uses base grid interval
- Can be disabled completely via toggle

---

## 🐛 Troubleshooting

### Issue: Settings don't seem to apply

**Check:**
1. Canvas Settings popover is closing properly after change
2. No console errors
3. Try refreshing page (settings should persist in Zustand)

### Issue: Grid doesn't appear

**Check:**
1. Canvas Settings → Show Grid = ON
2. Zoom level not too far out (grid might be too dense to render)
3. gridVisible in projectSettings is true

### Issue: Snap not working

**Check:**
1. Canvas Settings → Snap to Grid = ON
2. Grid interval is reasonable (not too large/small)
3. Not in pan mode (spacebar held)

### Issue: Labels show wrong unit

**Check:**
1. Current unit in Canvas Settings
2. Label rendering logic uses projectSettings.unit
3. Try toggling unit and back

---

## ✅ Final Verification

**Before Deployment:**
- [ ] All toggles work in Canvas Settings
- [ ] Scale changes affect visual rendering
- [ ] Unit changes affect label formatting
- [ ] Grid visibility toggles correctly
- [ ] Snap behavior toggles correctly
- [ ] Grid interval changes apply
- [ ] Display options persist
- [ ] No console errors
- [ ] Old sticky panel is gone
- [ ] Settings accessible from toolbar

**All items checked = Ready to deploy!** 🚀

---

## 📊 Summary

**Old System (Removed):**
- Sticky panel bottom-left
- Only showed read-only info
- Required double-click to change
- Limited to scale/grid presets
- Duplicate UI elements

**New System (Active):**
- ✅ Single Canvas Settings button in toolbar
- ✅ Full control over all workspace settings
- ✅ Clean popover UI
- ✅ Real-time updates
- ✅ Professional organization
- ✅ Settings summary included
- ✅ Zero duplicate UI

**Result:** Clean, professional, industry-standard workspace configuration! 🎉
