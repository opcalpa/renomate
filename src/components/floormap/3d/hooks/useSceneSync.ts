/**
 * Hook for syncing Three.js scene with Zustand store
 */

import { useMemo, useCallback } from 'react';
import { useFloorMapStore } from '../../store';
import type { FloorMapShape, Position3D, LineCoordinates, PolygonCoordinates } from '../../types';

/**
 * Valid shape types for 3D rendering
 * We only render structural elements - no images, text, symbols etc.
 */
const WALL_TYPES = ['wall', 'line'] as const;
const OPENING_TYPES = ['door_line', 'window_line', 'sliding_door_line', 'door', 'opening'] as const;
const ROOM_TYPES = ['room'] as const;

// Shapes to exclude from 3D rendering
const EXCLUDED_TYPES = ['image', 'text', 'measurement', 'freehand', 'bezier', 'symbol'] as const;

/**
 * Convert pixel coordinates to millimeters
 */
function pixelsToMm(value: number, pixelsPerMm: number): number {
  if (pixelsPerMm <= 0) return value;
  return value / pixelsPerMm;
}

/**
 * Convert LineCoordinates from pixels to mm
 */
function convertLineToMm(coords: LineCoordinates, pixelsPerMm: number): LineCoordinates {
  return {
    x1: pixelsToMm(coords.x1, pixelsPerMm),
    y1: pixelsToMm(coords.y1, pixelsPerMm),
    x2: pixelsToMm(coords.x2, pixelsPerMm),
    y2: pixelsToMm(coords.y2, pixelsPerMm),
  };
}

/**
 * Convert PolygonCoordinates from pixels to mm
 */
function convertPolygonToMm(coords: PolygonCoordinates, pixelsPerMm: number): PolygonCoordinates {
  return {
    points: coords.points.map(p => ({
      x: pixelsToMm(p.x, pixelsPerMm),
      y: pixelsToMm(p.y, pixelsPerMm),
    })),
  };
}

/**
 * Convert a shape's coordinates from pixels to mm
 */
function convertShapeToMm(shape: FloorMapShape, pixelsPerMm: number): FloorMapShape {
  const coords = shape.coordinates;

  // LineCoordinates (walls, doors, windows)
  if (coords && 'x1' in coords && 'y1' in coords) {
    return {
      ...shape,
      coordinates: convertLineToMm(coords as LineCoordinates, pixelsPerMm),
    };
  }

  // PolygonCoordinates (rooms)
  if (coords && 'points' in coords && Array.isArray((coords as PolygonCoordinates).points)) {
    return {
      ...shape,
      coordinates: convertPolygonToMm(coords as PolygonCoordinates, pixelsPerMm),
    };
  }

  return shape;
}

/**
 * Hook to get shapes for the current plan, organized by type
 * Coordinates are converted from pixels to millimeters for 3D rendering
 */
export function useSceneShapes(planId: string | null) {
  const shapes = useFloorMapStore((state) => state.shapes);
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);

  return useMemo(() => {
    if (!planId) {
      return { walls: [], rooms: [], openings: [], objects: [], all: [] };
    }

    const pixelsPerMm = scaleSettings.pixelsPerMm || 0.1;

    // Filter shapes for this plan, excluding non-structural types
    const planShapes = shapes.filter((s) => {
      if (s.planId !== planId) return false;
      // Exclude image, text, measurement, etc.
      if (EXCLUDED_TYPES.includes(s.type as typeof EXCLUDED_TYPES[number])) return false;
      // Exclude elevation-only shapes
      if (s.shapeViewMode === 'elevation') return false;
      return true;
    });

    // Convert all coordinates to millimeters and categorize
    const walls: FloorMapShape[] = [];
    const rooms: FloorMapShape[] = [];
    const openings: FloorMapShape[] = [];
    const objects: FloorMapShape[] = [];

    for (const shape of planShapes) {
      const convertedShape = convertShapeToMm(shape, pixelsPerMm);

      if (WALL_TYPES.includes(shape.type as typeof WALL_TYPES[number])) {
        walls.push(convertedShape);
      } else if (ROOM_TYPES.includes(shape.type as typeof ROOM_TYPES[number])) {
        rooms.push(convertedShape);
      } else if (OPENING_TYPES.includes(shape.type as typeof OPENING_TYPES[number])) {
        openings.push(convertedShape);
      } else if (shape.metadata?.isObjectLibrary === true) {
        // Convert object placement coordinates too
        const objShape = {
          ...convertedShape,
          metadata: {
            ...convertedShape.metadata,
            placementX: convertedShape.metadata?.placementX
              ? pixelsToMm(convertedShape.metadata.placementX as number, pixelsPerMm)
              : undefined,
            placementY: convertedShape.metadata?.placementY
              ? pixelsToMm(convertedShape.metadata.placementY as number, pixelsPerMm)
              : undefined,
          },
        };
        objects.push(objShape);
      }
    }

    return { walls, rooms, openings, objects, all: planShapes };
  }, [shapes, planId, scaleSettings.pixelsPerMm]);
}

/**
 * Hook for updating object position from 3D view
 */
export function useObjectSync() {
  const updateShape = useFloorMapStore((state) => state.updateShape);
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);

  const updateObjectFrom3D = useCallback(
    (shapeId: string, position3D: Position3D, rotation?: number) => {
      const pixelsPerMm = scaleSettings.pixelsPerMm || 0.1;

      // Convert mm back to pixels for storage
      updateShape(shapeId, {
        position3D,
        metadata: {
          placementX: position3D.x * pixelsPerMm,
          placementY: position3D.y * pixelsPerMm,
          rotation: rotation,
        },
      });
    },
    [updateShape, scaleSettings.pixelsPerMm]
  );

  return { updateObjectFrom3D };
}

/**
 * Hook for selection sync between 2D and 3D
 */
export function useSelectionSync() {
  const selectedShapeId = useFloorMapStore((state) => state.selectedShapeId);
  const setSelectedShapeId = useFloorMapStore(
    (state) => state.setSelectedShapeId
  );

  const selectShape = useCallback(
    (shapeId: string | null) => {
      setSelectedShapeId(shapeId);
    },
    [setSelectedShapeId]
  );

  return { selectedShapeId, selectShape };
}

/**
 * Hook to get the view state for camera sync
 */
export function useViewSync() {
  const viewState = useFloorMapStore((state) => state.viewState);
  const setViewState = useFloorMapStore((state) => state.setViewState);
  const scaleSettings = useFloorMapStore((state) => state.scaleSettings);

  // Calculate 3D camera position from 2D view state
  const getCameraFromView = useMemo(() => {
    const pixelsPerMm = scaleSettings.pixelsPerMm || 0.1;

    // Map 2D pan/zoom to 3D camera position (convert pixels to mm)
    const cameraY = 5000 / viewState.zoom; // Height based on zoom
    const cameraX = -viewState.panX / viewState.zoom / pixelsPerMm;
    // Z matches floor plan Y (no negation)
    const cameraZ = viewState.panY / viewState.zoom / pixelsPerMm;

    return {
      position: [cameraX, cameraY, cameraZ] as [number, number, number],
      target: [cameraX, 0, cameraZ] as [number, number, number],
    };
  }, [viewState, scaleSettings.pixelsPerMm]);

  return { viewState, setViewState, getCameraFromView };
}
