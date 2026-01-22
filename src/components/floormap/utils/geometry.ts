import { FloorMapShape, LineCoordinates, RectangleCoordinates, CircleCoordinates, PolygonCoordinates } from '../types';

/**
 * Calculate line length in mm
 */
export const calculateLineLength = (coords: LineCoordinates): number => {
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate rectangle area in mm²
 */
export const calculateRectangleArea = (coords: RectangleCoordinates): number => {
  return coords.width * coords.height;
};

/**
 * Calculate rectangle perimeter in mm
 */
export const calculateRectanglePerimeter = (coords: RectangleCoordinates): number => {
  return 2 * (coords.width + coords.height);
};

/**
 * Snap coordinate to grid
 */
export const snapToGrid = (value: number, gridSize: number, enabled: boolean): number => {
  if (!enabled) return value;
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Calculate angle between two points
 */
export const calculateAngle = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Constrain angle to 45° increments (for Shift key constraint)
 */
export const constrainAngle = (angle: number): number => {
  const increment = Math.PI / 4; // 45 degrees
  return Math.round(angle / increment) * increment;
};

/**
 * Find nearest snap point from existing shapes
 */
export const findNearestSnapPoint = (
  x: number,
  y: number,
  shapes: FloorMapShape[],
  threshold: number = 10
): { x: number; y: number } | null => {
  let nearestPoint: { x: number; y: number } | null = null;
  let minDistance = threshold;

  shapes.forEach((shape) => {
    const points = getShapeSnapPoints(shape);
    points.forEach((point) => {
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    });
  });

  return nearestPoint;
};

/**
 * Get snap points for a shape (corners, midpoints)
 */
export const getShapeSnapPoints = (shape: FloorMapShape): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [];

  if (shape.type === 'line' || shape.type === 'wall' || shape.type === 'measurement') {
    const coords = shape.coordinates as LineCoordinates;
    points.push(
      { x: coords.x1, y: coords.y1 },
      { x: coords.x2, y: coords.y2 },
      { x: (coords.x1 + coords.x2) / 2, y: (coords.y1 + coords.y2) / 2 } // midpoint
    );
  } else if (shape.type === 'rectangle') {
    const coords = shape.coordinates as RectangleCoordinates;
    points.push(
      { x: coords.left, y: coords.top }, // top-left
      { x: coords.left + coords.width, y: coords.top }, // top-right
      { x: coords.left, y: coords.top + coords.height }, // bottom-left
      { x: coords.left + coords.width, y: coords.top + coords.height }, // bottom-right
      { x: coords.left + coords.width / 2, y: coords.top }, // top-center
      { x: coords.left + coords.width / 2, y: coords.top + coords.height }, // bottom-center
      { x: coords.left, y: coords.top + coords.height / 2 }, // left-center
      { x: coords.left + coords.width, y: coords.top + coords.height / 2 } // right-center
    );
  } else if (shape.type === 'circle') {
    const coords = shape.coordinates as CircleCoordinates;
    points.push(
      { x: coords.cx, y: coords.cy }, // center
      { x: coords.cx + coords.radius, y: coords.cy }, // right
      { x: coords.cx - coords.radius, y: coords.cy }, // left
      { x: coords.cx, y: coords.cy + coords.radius }, // bottom
      { x: coords.cx, y: coords.cy - coords.radius } // top
    );
  } else if (shape.type === 'polygon') {
    const coords = shape.coordinates as PolygonCoordinates;
    points.push(...coords.points);
  }

  return points;
};

/**
 * Transform coordinates for elevation view
 */
export const transformToElevation = (
  coords: any,
  shapeType: string
): any => {
  if (shapeType === 'line' || shapeType === 'wall') {
    const lineCoords = coords as LineCoordinates;
    const length = calculateLineLength(lineCoords);
    return {
      x1: lineCoords.x1,
      y1: 500, // Ground level
      x2: lineCoords.x2,
      y2: 500 - length * 0.8, // Use length as height
    };
  } else if (shapeType === 'rectangle') {
    const rectCoords = coords as RectangleCoordinates;
    const height = rectCoords.height * 0.8;
    return {
      left: rectCoords.left,
      top: 500 - height,
      width: rectCoords.width,
      height: height,
    };
  }
  return coords;
};

/**
 * Transform coordinates from elevation back to floor plan
 */
export const transformFromElevation = (
  coords: any,
  shapeType: string,
  originalCoords: any
): any => {
  // Always return original floor plan coordinates
  return originalCoords;
};

/**
 * Generate dimension label text
 */
export const getDimensionLabel = (shape: FloorMapShape): string => {
  if (shape.type === 'line' || shape.type === 'wall' || shape.type === 'measurement') {
    const coords = shape.coordinates as LineCoordinates;
    const length = calculateLineLength(coords);
    return `${Math.round(length)} mm`;
  } else if (shape.type === 'rectangle') {
    const coords = shape.coordinates as RectangleCoordinates;
    return `${Math.round(coords.width)} mm × ${Math.round(coords.height)} mm`;
  } else if (shape.type === 'circle') {
    const coords = shape.coordinates as CircleCoordinates;
    return `Ø ${Math.round(coords.radius * 2)} mm`;
  }
  return '';
};

/**
 * Calculate metadata for shape
 */
export const calculateShapeMetadata = (shape: FloorMapShape) => {
  if (shape.type === 'line' || shape.type === 'wall' || shape.type === 'measurement') {
    const coords = shape.coordinates as LineCoordinates;
    return {
      lengthMM: calculateLineLength(coords),
    };
  } else if (shape.type === 'rectangle') {
    const coords = shape.coordinates as RectangleCoordinates;
    return {
      widthMM: coords.width,
      heightMM: coords.height,
      areaMM: calculateRectangleArea(coords),
    };
  } else if (shape.type === 'circle') {
    const coords = shape.coordinates as CircleCoordinates;
    const diameter = coords.radius * 2;
    const area = Math.PI * coords.radius * coords.radius;
    return {
      radiusMM: coords.radius,
      widthMM: diameter,
      areaMM: area,
      perimeterMM: 2 * Math.PI * coords.radius,
    };
  }
  return {};
};
