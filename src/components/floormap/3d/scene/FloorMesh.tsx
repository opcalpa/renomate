/**
 * FloorMesh - Renders a room floor as 3D geometry
 *
 * Converts room polygon coordinates to a floor plane
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { FloorMapShape, PolygonCoordinates } from '../../types';

interface FloorMeshProps {
  room: FloorMapShape;
  isSelected?: boolean;
  onClick?: () => void;
}

export function FloorMesh({ room, isSelected, onClick }: FloorMeshProps) {
  // Get polygon coordinates (already converted to mm)
  const coords = room.coordinates as PolygonCoordinates;

  // Create floor shape from polygon points
  const floorShape = useMemo(() => {
    if (!coords || !coords.points || coords.points.length < 3) return null;

    const shape = new THREE.Shape();
    const points = coords.points;

    // Use floor plan X and Y directly
    // The rotation will transform: (x, y, 0) → (x, 0, -y)
    // So floor plan (fpX, fpY) becomes Three.js (fpX, 0, -fpY) ✓
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();

    return shape;
  }, [coords]);

  if (!floorShape) return null;

  // Get room color or use default
  const floorColor = useMemo(() => {
    if (isSelected) return '#E3F2FD';
    if (room.color) return room.color;
    return '#e8e4df';
  }, [room.color, isSelected]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 1, 0]} // Slightly above 0 to avoid z-fighting
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      receiveShadow
    >
      <shapeGeometry args={[floorShape]} />
      <meshStandardMaterial
        color={floorColor}
        roughness={0.9}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
