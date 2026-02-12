/**
 * Geometry builder utilities for converting floor plan coordinates to Three.js geometry
 *
 * COORDINATE SYSTEMS:
 * - Floor plan: millimeters (mm), Y = depth (perpendicular to wall)
 * - Three.js: meters or mm (we use mm for precision), Y = up (vertical)
 *
 * CONVERSIONS:
 * - FloorPlan X -> Three.js X (no change)
 * - FloorPlan Y -> Three.js -Z (depth becomes negative Z)
 * - Elevation (vertical) -> Three.js Y
 */

import type { LineCoordinates, PolygonCoordinates, FloorMapShape } from '../../types';

/**
 * Convert floor plan position (mm) to Three.js position
 *
 * Floor plan: X right, Y down (canvas convention)
 * Three.js: X right, Y up, Z towards viewer
 *
 * We map: Floor plan (x, y) → Three.js (x, elevation, y)
 * This keeps the orientation consistent when viewing from above.
 *
 * @param x X position in mm (floor plan)
 * @param y Y position in mm (floor plan = depth into scene)
 * @param z Elevation in mm (height from floor)
 */
export function floorPlanToThreeJS(x: number, y: number, z: number = 0): [number, number, number] {
  // X stays the same, Y becomes Z (depth), elevation becomes Y (height)
  return [x, z, y];
}

/**
 * Convert Three.js position to floor plan position (mm)
 */
export function threeJSToFloorPlan(x: number, y: number, z: number): { x: number; y: number; elevation: number } {
  return { x, y: z, elevation: y };
}

/**
 * Get wall geometry parameters from LineCoordinates
 */
export function getWallGeometry(wall: FloorMapShape): {
  length: number;
  height: number;
  thickness: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  angle: number;
} | null {
  const coords = wall.coordinates as LineCoordinates;
  if (!coords || coords.x1 === undefined) return null;

  const height = wall.heightMM || 2400; // Default 2.4m wall height
  const thickness = wall.thicknessMM || 150; // Default 15cm wall thickness

  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Center position in floor plan coordinates
  const fpCenterX = (coords.x1 + coords.x2) / 2;
  const fpCenterY = (coords.y1 + coords.y2) / 2;

  // Convert to Three.js coordinates
  const [centerX, centerY, centerZ] = floorPlanToThreeJS(fpCenterX, fpCenterY, height / 2);

  return {
    length,
    height,
    thickness,
    centerX,
    centerY,
    centerZ,
    angle,
  };
}

/**
 * Get floor geometry from room polygon
 */
export function getFloorGeometry(room: FloorMapShape): {
  points: Array<{ x: number; z: number }>;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
} | null {
  const coords = room.coordinates as PolygonCoordinates;
  if (!coords || !coords.points || coords.points.length < 3) return null;

  // Convert floor plan points to Three.js XZ plane
  const points = coords.points.map(p => ({
    x: p.x,
    z: -p.y, // Floor plan Y becomes negative Z in Three.js
  }));

  const xs = points.map(p => p.x);
  const zs = points.map(p => p.z);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return {
    points,
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

/**
 * Get object position and dimensions from shape
 */
export function getObjectGeometry(shape: FloorMapShape): {
  position: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  rotation: number;
} | null {
  // Check for 3D dimensions first
  const dims = shape.dimensions3D || {
    width: (shape.metadata?.objectWidth as number) || 500,
    height: (shape.metadata?.objectHeight as number) || 500,
    depth: (shape.metadata?.objectDepth as number) || 500,
  };

  // Get position
  let x = 0, y = 0, z = dims.height / 2;

  if (shape.position3D) {
    x = shape.position3D.x;
    y = shape.position3D.y;
    z = shape.position3D.z + dims.height / 2;
  } else if (shape.metadata?.placementX !== undefined) {
    x = shape.metadata.placementX as number;
    y = shape.metadata.placementY as number;
  } else if (shape.wallRelative) {
    // Wall-relative position needs to be converted
    // This is handled by the calling code which has access to the wall
    x = shape.wallRelative.distanceFromWallStart;
    y = shape.wallRelative.perpendicularOffset;
    z = shape.wallRelative.elevationBottom + dims.height / 2;
  }

  const position = floorPlanToThreeJS(x, y, z);
  const rotation = shape.rotation || (shape.metadata?.rotation as number) || 0;

  return {
    position,
    dimensions: dims,
    rotation: -rotation * (Math.PI / 180), // Convert degrees to radians, invert for Three.js
  };
}

/**
 * Get a color for object category (fallback when no texture)
 */
export function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    bathroom: '#87CEEB',     // Light blue
    kitchen: '#F5DEB3',      // Wheat
    furniture: '#D2B48C',    // Tan
    electrical: '#FFD700',   // Gold
    doors: '#A0522D',        // Sienna
    windows: '#ADD8E6',      // Light blue
    floor_cabinet: '#D2B48C',
    wall_cabinet: '#DEB887',
    countertop: '#808080',
    appliance_floor: '#C0C0C0',
    appliance_wall: '#A9A9A9',
    decoration: '#FFB6C1',
    custom: '#D3D3D3',
  };

  return colors[category || ''] || '#CCCCCC';
}
