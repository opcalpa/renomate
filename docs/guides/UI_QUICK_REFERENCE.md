# UI Quick Reference Guide

## 🖥️ Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Top Navigation Bar (Project name, etc.)                       │
├──────┬──────────────────────────────────────────────┬──────────┤
│      │                                              │          │
│  T   │                                              │  Prop.   │
│  o   │                                              │  Panel   │
│  o   │          INFINITE CANVAS                     │  (when   │
│  l   │          (Dynamic Grid)                      │  object  │
│  b   │                                              │  is      │
│  a   │          [Scrollable Area]                   │  sel.)   │
│  r   │          100m x 100m                         │          │
│      │                                              │          │
│ 60px │                                              │  280px   │
│      │                                              │          │
└──────┴──────────────────────────────────────────────┴──────────┘
```

## 🛠️ Left Toolbar (60px wide)

### Section 1: Drawing Tools
```
┌────┐
│ ✋ │ Select Tool
├────┤
│ ━  │ Wall Tool (Default: 150mm thick)
├────┤
│ ▢  │ Rectangle
├────┤
│ ○  │ Circle  
├────┤
│ △  │ Triangle
├────┤
│ 📏 │ Measure
├────┤
│ A  │ Text
├────┤
│ 📦 │ Objects Library
└────┘
```

### Section 2: View Controls
```
┌────┐
│ #  │ Toggle Grid
├────┤
│ 🧲 │ Toggle Snap to Grid
├────┤
│ 📏 │ Grid Size (dropdown: 25cm/50cm/1ft)
├────┤
│ 📐 │ Units (dropdown: mm/cm/m/in)
└────┘
```

### Section 3: 3D View
```
┌────┐
│ 🧊 │ Toggle 3D Elevation View
└────┘
```

### Section 4: Zoom
```
┌────┐
│ +  │ Zoom In
├────┤
│ -  │ Zoom Out
├────┤
│ ⛶  │ Reset Zoom
├────┤
│100%│ Current Zoom Level
├────┤
│1:  │ Scale Indicator
│100 │ (1px = 10mm)
└────┘
```

### Section 5: Actions (Bottom)
```
┌────┐
│ 💾 │ Save
└────┘
```

## 📋 Right Property Panel (280px wide)

Appears when an object is selected:

```
┌────────────────────────────────────┐
│ 📏 Wall Properties              ✕  │
│ Edit dimensions and details        │
├────────────────────────────────────┤
│                                    │
│ 📏 DIMENSIONS                      │
│ ┌──────────┬──────────┐           │
│ │ Length   │ Thickness│           │
│ │ 3500 mm  │ 150 mm   │           │
│ │ 3.50m    │ 0.15m    │           │
│ └──────────┴──────────┘           │
│                                    │
│ 📐 HEIGHT                          │
│ ┌─────────────────────┐           │
│ │ Wall Height         │           │
│ │ 2400 mm             │           │
│ │ 2.40m               │           │
│ └─────────────────────┘           │
│                                    │
│ 📝 WORKER INSTRUCTIONS             │
│ ┌─────────────────────┐           │
│ │ Add notes or        │           │
│ │ instructions for    │           │
│ │ construction        │           │
│ │ workers...          │           │
│ └─────────────────────┘           │
│                                    │
│ ╭─────────────────────╮           │
│ │ ℹ️ Quick Reference   │           │
│ │ Scale: 1px = 10mm   │           │
│ │ Default: 150mm wall │           │
│ │ Height: 2400mm      │           │
│ ╰─────────────────────╯           │
│                                    │
│      ┌──────────┐                 │
│      │   Done   │                 │
│      └──────────┘                 │
└────────────────────────────────────┘
```

## 🎯 Canvas Interactions

### Mouse Controls
| Action | Control |
|--------|---------|
| **Zoom In** | Scroll Up |
| **Zoom Out** | Scroll Down |
| **Pan** | Middle Click + Drag |
| **Pan (Alt)** | Spacebar + Drag |
| **Select** | Left Click |
| **Draw** | Click to Start, Click to End |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `V` | Select Tool |
| `W` | Wall Tool |
| `G` | Toggle Grid |
| `Shift+G` | Toggle Snap |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Delete` | Delete Selected |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + +` | Zoom In |
| `Ctrl/Cmd + -` | Zoom Out |
| `Ctrl/Cmd + 0` | Reset Zoom |

## 🎨 Visual States

### Walls
```
┌─ Drawing (Preview) ──┐
│ Blue (#3b82f6)       │
│ 70% opacity          │
│ Dashed outline       │
└──────────────────────┘

┌─ Normal (Final) ─────┐
│ Dark Gray (#2d3748)  │
│ 100% opacity         │
│ Subtle shadow        │
│ Measurement label    │
└──────────────────────┘

┌─ Selected ───────────┐
│ Blue dashed border   │
│ Circular handles     │
│ Property panel open  │
└──────────────────────┘
```

### Grid
```
┌─ Low Zoom (< 0.3x) ──┐
│ 10m grid             │
│ 30% opacity          │
│ Faded                │
└──────────────────────┘

┌─ Normal (0.6x-2.0x) ─┐
│ 1m grid              │
│ 100% opacity         │
│ Clear                │
└──────────────────────┘

┌─ High Zoom (> 2.0x) ─┐
│ 0.5m grid            │
│ 60% opacity          │
│ Enhanced detail      │
└──────────────────────┘
```

## 📐 Measurement Display

Walls always show their length:
```
        ┌─────── 3.50m ───────┐
        │                      │
    ════■══════════════════════■════
```

Format: `[Value] [Unit]`
- Positioned at wall midpoint
- Rotates with wall angle
- Dark background for visibility
- Always visible (not just when selected)

## 🔵 Snapping Visual Feedback

### Endpoint Snap
```
When near existing wall endpoint:
    Existing Wall
         │
         ■ ← Snap indicator
         │
    Your New Wall
```
Toast: "Snapped to endpoint"

### Grid Snap
```
When near grid intersection:
    ─────┼───── Grid Line
         ■ ← Snap to 50cm grid
    ─────┼─────
```
Toast: "Snapped to grid"

## 🎯 Common Workflows

### 1. Draw a Simple Room
```
1. Select Wall Tool
2. Click at first corner
3. Click at second corner (snap to grid)
4. Click at third corner (snap to endpoint)
5. Click at fourth corner
6. Click near first corner (snap to endpoint) = CLOSED!
```

### 2. Edit Wall Thickness
```
1. Select Tool
2. Click wall
3. Property panel opens →
4. Change "Thickness" value
5. Press Enter or click Done
```

### 3. Add Worker Notes
```
1. Select Tool
2. Click wall
3. Scroll to "Worker Instructions"
4. Type notes (e.g., "Install outlets at 30cm height")
5. Click Done
```

### 4. Switch to 3D View
```
1. Click Cube icon in toolbar
2. View changes to elevation
3. See wall heights
4. Click Cube again to return to floor plan
```

## 💡 Pro Tips

1. **Use Snap to Grid** for perfectly aligned rooms
2. **Disable Snap** for free-form organic shapes
3. **Zoom In** to place objects precisely
4. **Zoom Out** to see entire floor plan
5. **Add Notes** as you draw (don't forget later!)
6. **Check 3D View** to verify heights look correct
7. **Grid at 50cm** works well for most residential
8. **Measurements** update in real-time as you draw

---

**Happy Planning! 🏠✨**
