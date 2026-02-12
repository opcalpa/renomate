/**
 * WallMesh - Renders a wall as 3D geometry
 *
 * Converts wall LineCoordinates to a 3D box mesh
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { FloorMapShape, LineCoordinates } from '../../types';
import { getWallGeometry } from '../utils/geometryBuilder';

interface WallMeshProps {
  wall: FloorMapShape;
  isSelected?: boolean;
  onClick?: () => void;
}

export function WallMesh({ wall, isSelected, onClick }: WallMeshProps) {
  const geometry = useMemo(() => getWallGeometry(wall), [wall]);

  if (!geometry) return null;

  const { length, height, thickness, centerX, centerY, centerZ, angle } = geometry;

  // Create wall color based on material or default
  const wallColor = useMemo(() => {
    if (isSelected) return '#64B5F6';
    if (wall.color) return wall.color;
    return '#f5f5f5';
  }, [wall.color, isSelected]);

  return (
    <mesh
      position={[centerX, centerY, centerZ]}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial
        color={wallColor}
        roughness={0.8}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
