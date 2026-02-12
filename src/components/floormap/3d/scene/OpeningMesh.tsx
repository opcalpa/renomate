/**
 * OpeningMesh - Renders doors and windows as 3D geometry
 *
 * Doors: Frame with optional swing arc visualization
 * Windows: Frame with glass pane
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { FloorMapShape, LineCoordinates } from '../../types';

interface OpeningMeshProps {
  opening: FloorMapShape;
  isSelected?: boolean;
  onClick?: () => void;
}

// Default opening dimensions (mm)
const DOOR_HEIGHT = 2100;
const WINDOW_HEIGHT = 1200;
const WINDOW_SILL_HEIGHT = 900;
const FRAME_THICKNESS = 50;
const DOOR_THICKNESS = 40;

export function OpeningMesh({ opening, isSelected, onClick }: OpeningMeshProps) {
  const geometry = useMemo(() => {
    const coords = opening.coordinates as LineCoordinates;
    if (!coords || coords.x1 === undefined) return null;

    const dx = coords.x2 - coords.x1;
    const dy = coords.y2 - coords.y1;
    const width = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Center position
    const centerX = (coords.x1 + coords.x2) / 2;
    const centerY = (coords.y1 + coords.y2) / 2;

    // Determine if door or window
    const isDoor = opening.type === 'door_line' || opening.type === 'door' || opening.type === 'sliding_door_line';
    const isWindow = opening.type === 'window_line';

    const height = isDoor ? DOOR_HEIGHT : WINDOW_HEIGHT;
    const bottomHeight = isWindow ? WINDOW_SILL_HEIGHT : 0;

    return {
      width,
      height,
      bottomHeight,
      centerX,
      centerY,
      angle,
      isDoor,
      isWindow,
    };
  }, [opening]);

  if (!geometry) return null;

  const { width, height, bottomHeight, centerX, centerY, angle, isDoor, isWindow } = geometry;

  // Three.js Y is up, Z is Y from floor plan (no negation to avoid mirroring)
  const position: [number, number, number] = [
    centerX,
    bottomHeight + height / 2,
    centerY,
  ];

  const frameColor = isSelected ? '#64B5F6' : (isDoor ? '#8B4513' : '#A0522D');
  const glassColor = '#88CCFF';

  return (
    <group
      position={position}
      rotation={[0, -angle, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Door frame/panel */}
      {isDoor && (
        <>
          {/* Door panel */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width - FRAME_THICKNESS, height - FRAME_THICKNESS, DOOR_THICKNESS]} />
            <meshStandardMaterial
              color={frameColor}
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>

          {/* Door handle */}
          <mesh position={[width / 2 - 100, 0, DOOR_THICKNESS / 2 + 10]}>
            <cylinderGeometry args={[15, 15, 80, 8]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}

      {/* Window */}
      {isWindow && (
        <>
          {/* Window frame - top */}
          <mesh position={[0, height / 2 - FRAME_THICKNESS / 2, 0]}>
            <boxGeometry args={[width, FRAME_THICKNESS, FRAME_THICKNESS]} />
            <meshStandardMaterial color={frameColor} roughness={0.7} />
          </mesh>

          {/* Window frame - bottom */}
          <mesh position={[0, -height / 2 + FRAME_THICKNESS / 2, 0]}>
            <boxGeometry args={[width, FRAME_THICKNESS, FRAME_THICKNESS]} />
            <meshStandardMaterial color={frameColor} roughness={0.7} />
          </mesh>

          {/* Window frame - left */}
          <mesh position={[-width / 2 + FRAME_THICKNESS / 2, 0, 0]}>
            <boxGeometry args={[FRAME_THICKNESS, height, FRAME_THICKNESS]} />
            <meshStandardMaterial color={frameColor} roughness={0.7} />
          </mesh>

          {/* Window frame - right */}
          <mesh position={[width / 2 - FRAME_THICKNESS / 2, 0, 0]}>
            <boxGeometry args={[FRAME_THICKNESS, height, FRAME_THICKNESS]} />
            <meshStandardMaterial color={frameColor} roughness={0.7} />
          </mesh>

          {/* Glass pane */}
          <mesh>
            <boxGeometry args={[width - FRAME_THICKNESS * 2, height - FRAME_THICKNESS * 2, 10]} />
            <meshPhysicalMaterial
              color={glassColor}
              transparent
              opacity={0.3}
              roughness={0}
              metalness={0}
              transmission={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}
