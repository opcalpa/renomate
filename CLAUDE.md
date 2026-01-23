# Renomate - Project Instructions

This file defines the core principles and rules for the Renomate codebase.
These rules ensure clean, lightweight, responsive code built for manageable scale.

## Tech Stack

- **Core:** React 18 + TypeScript, Vite, Tailwind CSS
- **State:** Zustand (global), React Query (server state)
- **Database:** Supabase (PostgreSQL, auth, storage)
- **Canvas:** React-Konva / Konva.js
- **UI:** shadcn/ui, Radix UI, Sonner (toasts)
- **i18n:** i18next (Swedish primary)

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI primitives (shadcn/ui)
│   ├── floormap/              # Floor planner canvas & tools
│   │   ├── shapes/            # Extracted shape components
│   │   │   ├── WallShape.tsx  # Wall/line with measurements
│   │   │   ├── RoomShape.tsx  # Room polygons with vertex editing
│   │   │   ├── BasicShapes.tsx # Rectangle, Circle, Text, Freehand
│   │   │   ├── LibraryShapes.tsx # Symbol & Object library shapes
│   │   │   ├── types.ts       # Shared shape interfaces
│   │   │   └── index.ts       # Clean exports
│   │   ├── canvas/            # Canvas utilities & constants
│   │   │   ├── constants.ts   # MIN_ZOOM, MAX_ZOOM, admin defaults
│   │   │   └── utils/         # throttle, dragSystem, etc.
│   │   ├── store.ts           # Zustand store for floor map state
│   │   └── UnifiedKonvaCanvas.tsx # Main canvas component (~2900 lines)
│   └── project/               # Project management components
├── pages/                     # Top-level route components
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions & helpers
├── services/                  # External API integrations
├── integrations/              # Supabase client & types
└── i18n/                      # Internationalization

supabase/
├── migrations/                # Database schema changes (timestamped)
└── *.sql                      # Ad-hoc SQL scripts (must be idempotent)
```

## Core Rules

### Code Quality
- **No `any` types** - use `unknown` if type is truly unknown
- **No console.log in production** - only `console.error` for critical errors
- **No dead code** - remove commented-out code immediately
- **Files under 500 lines** - split larger files into modules
- **Self-documenting code** - clear names, minimal comments

### React Patterns
- **Zustand for global state** - use `getState()` in callbacks to avoid stale closures
- **Refs for non-reactive values** - canvas nodes, previous values
- **useCallback with minimal deps** - read from store directly
- **React.memo for expensive components** - not everywhere

### Canvas (React-Konva)
- **Coordinates in millimeters (mm)** - convert to pixels for rendering
- **Formula:** `pixels = mm * pixelsPerMm * zoom`
- **Grid snap:** Configurable (default 100mm)
- **Performance:** `perfectDrawEnabled={false}`, `listening={false}` for decorative elements
- **Throttle mouse events** to 16-50ms

### Database (Supabase)
- **Idempotent migrations** - use `IF NOT EXISTS`, `IF EXISTS`
- **Always handle errors** - show toast to user
- **RLS policies** on all tables
- **Never modify existing migrations** - create new ones

### User Experience
- **Immediate feedback** for all actions (toast or visual)
- **Loading states** for async operations
- **Undo/Redo** for destructive actions
- **Swedish UI** with English code/comments

## Shape Component Architecture

Shape components in `src/components/floormap/shapes/`:

```typescript
// All shapes implement ShapeComponentProps
interface ShapeComponentProps {
  shape: FloorMapShape;
  isSelected: boolean;
  onSelect: (evt?: KonvaEventObject<MouseEvent>) => void;
  onTransform: (updates: Partial<FloorMapShape>) => void;
  shapeRefsMap: Map<string, Konva.Node>;
}

// Extended props for shapes needing view context
interface ShapeWithViewProps extends ShapeComponentProps {
  viewState: { zoom: number; panX: number; panY: number };
  scaleSettings: { pixelsPerMm: number };
  projectSettings: { snapEnabled: boolean; showDimensions: boolean; unit: 'mm' | 'cm' | 'm' };
}
```

## Keyboard Shortcuts

- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` (Mac) / `Ctrl + Y` (Win) - Redo
- `Cmd/Ctrl + A` - Select all
- `Cmd/Ctrl + C/V` - Copy/Paste
- `Cmd/Ctrl + D` - Duplicate
- `Cmd/Ctrl + S` - Save
- `Delete/Backspace` - Delete selected
- `Escape` - Cancel operation, return to select tool
- `Space` (hold) - Pan mode
- `Shift` (hold) - Rotation snapping (45°)

## Common Patterns

### Reading Store in Callbacks
```typescript
// GOOD - Fresh state, no dependencies
const handleClick = useCallback(() => {
  const shapes = useFloorMapStore.getState().shapes;
  // use shapes...
}, []);

// BAD - Stale closure
const shapes = useFloorMapStore(state => state.shapes);
const handleClick = useCallback(() => {
  // shapes might be stale!
}, [shapes]);
```

### Coordinate Conversion
```typescript
// Screen → World (mm)
const worldX = (screenX - panX) / zoom / pixelsPerMm;

// World (mm) → Screen (pixels)
const screenX = worldX * pixelsPerMm * zoom + panX;
```

### Error Handling
```typescript
const { data, error } = await supabase.from('shapes').select('*');
if (error) {
  console.error('Failed to load:', error);
  toast.error('Kunde inte ladda data');
  return;
}
```

## File Naming

- Components: `PascalCase.tsx` (e.g., `WallShape.tsx`)
- Utilities: `camelCase.ts` (e.g., `dragSystem.ts`)
- Types: `types.ts` or `ComponentName.types.ts`
- Tests: `ComponentName.test.tsx`

## Before Committing

- [ ] No TypeScript errors
- [ ] No console.log statements
- [ ] No unused imports/variables
- [ ] All props destructured correctly
- [ ] User actions have feedback
- [ ] Tested with multiple shapes on canvas

---
*Last Updated: 2025-01-23*
