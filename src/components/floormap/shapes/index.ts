/**
 * Shape Components Index
 *
 * Re-exports all shape components for the floor map canvas.
 */

// Types
export * from './types';

// Complex shapes with custom handles
export { WallShape } from './WallShape';
export { RoomShape } from './RoomShape';
export { BezierShape } from './BezierShape';

// Basic shapes
export { RectangleShape, CircleShape, TextShape, FreehandShape } from './BasicShapes';

// Library shapes
export { LibrarySymbolShape, ObjectLibraryShape } from './LibraryShapes';

// Line-based opening shapes (window, door, sliding door)
export { WindowLineShape, DoorLineShape, SlidingDoorLineShape } from './OpeningShapes';

// Background image shape
export { ImageShape } from './ImageShape';

// Template group shape (grouped template objects)
export { TemplateGroupShape } from './TemplateGroupShape';
