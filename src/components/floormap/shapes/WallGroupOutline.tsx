/**
 * WallGroupOutline - Renders unified wall shapes using polygon boolean union
 *
 * Strategy:
 * 1. Convert each wall to a rectangle polygon (4 vertices)
 * 2. Find groups of connected walls
 * 3. Use polygon-clipping library to union all rectangles in each group
 * 4. Render the resulting unified polygon with fill and stroke
 *
 * This approach correctly handles any number of connected walls (L, T, U, +, etc.)
 */

import React, { useMemo } from 'react';
import { Line, Group } from 'react-konva';
import { FloorMapShape } from '../types';
import polygonClipping, { Polygon, MultiPolygon } from 'polygon-clipping';

interface WallGroupOutlineProps {
  walls: FloorMapShape[];
  selectedIds: string[];
  zoom: number;
}

interface WallData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  isSelected: boolean;
}

/**
 * Get wall rectangle as a polygon (4 corners, counter-clockwise)
 */
function getWallPolygon(w: WallData): Polygon | null {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  // Perpendicular unit vector
  const nx = -dy / len;
  const ny = dx / len;
  const ht = w.thickness / 2;

  // 4 corners of the wall rectangle (counter-clockwise for polygon-clipping)
  const corners: [number, number][] = [
    [w.x1 + nx * ht, w.y1 + ny * ht], // start-top
    [w.x2 + nx * ht, w.y2 + ny * ht], // end-top
    [w.x2 - nx * ht, w.y2 - ny * ht], // end-bottom
    [w.x1 - nx * ht, w.y1 - ny * ht], // start-bottom
  ];

  // polygon-clipping expects: [[[x,y], [x,y], ...]] for a simple polygon
  // The outer ring should be counter-clockwise
  return [corners];
}

/**
 * Find connected wall groups using flood-fill
 */
function findGroups(walls: WallData[], tolerance: number = 5): WallData[][] {
  const visited = new Set<string>();
  const groups: WallData[][] = [];

  function areConnected(w1: WallData, w2: WallData): boolean {
    const pts1 = [{ x: w1.x1, y: w1.y1 }, { x: w1.x2, y: w1.y2 }];
    const pts2 = [{ x: w2.x1, y: w2.y1 }, { x: w2.x2, y: w2.y2 }];
    for (const p1 of pts1) {
      for (const p2 of pts2) {
        if (Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) < tolerance) return true;
      }
    }
    return false;
  }

  for (const wall of walls) {
    if (visited.has(wall.id)) continue;

    const group: WallData[] = [];
    const queue = [wall];
    visited.add(wall.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      for (const other of walls) {
        if (!visited.has(other.id) && areConnected(current, other)) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Union all wall polygons in a group into a single MultiPolygon
 */
function unionWallGroup(group: WallData[]): MultiPolygon {
  const polygons: Polygon[] = [];

  for (const wall of group) {
    const poly = getWallPolygon(wall);
    if (poly) {
      polygons.push(poly);
    }
  }

  if (polygons.length === 0) {
    return [];
  }

  if (polygons.length === 1) {
    return [polygons[0]];
  }

  // Use polygon-clipping union to merge all polygons
  try {
    let result: MultiPolygon = [polygons[0]];
    for (let i = 1; i < polygons.length; i++) {
      result = polygonClipping.union(result, [polygons[i]]);
    }
    return result;
  } catch {
    // Fallback: return individual polygons if union fails
    return polygons;
  }
}

/**
 * Convert MultiPolygon to Konva Line points
 */
function multiPolygonToPoints(multiPoly: MultiPolygon): number[][] {
  const result: number[][] = [];

  for (const polygon of multiPoly) {
    // First ring is the outer boundary
    if (polygon.length > 0) {
      const outerRing = polygon[0];
      const points: number[] = [];
      for (const [x, y] of outerRing) {
        points.push(x, y);
      }
      result.push(points);
    }
    // Additional rings would be holes (we don't render them separately for now)
  }

  return result;
}

/**
 * WallGroupOutline component
 */
export const WallGroupOutline: React.FC<WallGroupOutlineProps> = ({
  walls,
  selectedIds,
  zoom,
}) => {
  // Convert FloorMapShape to WallData
  const wallData: WallData[] = useMemo(() => {
    return walls
      .filter(w => w.type === 'wall' || w.type === 'line')
      .map(w => {
        const coords = w.coordinates as { x1: number; y1: number; x2: number; y2: number };
        const thickness = w.thicknessMM ? w.thicknessMM / 10 : 15;
        return {
          id: w.id,
          x1: coords.x1,
          y1: coords.y1,
          x2: coords.x2,
          y2: coords.y2,
          thickness,
          isSelected: selectedIds.includes(w.id),
        };
      });
  }, [walls, selectedIds]);

  // Find connected wall groups
  const groups = useMemo(() => findGroups(wallData), [wallData]);

  // Compute unified polygons for each group
  const unifiedGroups = useMemo(() => {
    return groups.map(group => ({
      multiPolygon: unionWallGroup(group),
      isSelected: group.some(w => w.isSelected),
    }));
  }, [groups]);

  const strokeWidth = Math.max(1, 1.5 / zoom);

  return (
    <Group listening={false}>
      {unifiedGroups.map((groupData, groupIndex) => {
        const pointsArrays = multiPolygonToPoints(groupData.multiPolygon);
        const isSelected = groupData.isSelected;
        const fillColor = isSelected ? '#dbeafe' : '#f3f4f6';
        const strokeColor = isSelected ? '#3b82f6' : '#374151';

        return (
          <Group key={`wall-group-${groupIndex}`}>
            {pointsArrays.map((points, polyIndex) => (
              <Line
                key={`wall-poly-${groupIndex}-${polyIndex}`}
                points={points}
                closed={true}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                listening={false}
                perfectDrawEnabled={false}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
};

export default WallGroupOutline;
