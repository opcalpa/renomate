/**
 * ObjectMesh - Renders library objects as 3D geometry
 *
 * Uses GLTF models when available, falls back to colored boxes
 */

import { useMemo, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { FloorMapShape, LineCoordinates } from '../../types';
import { getObjectDefinition } from '../../objectLibraryDefinitions';
import { getObjectGeometry, getCategoryColor, floorPlanToThreeJS } from '../utils/geometryBuilder';

interface ObjectMeshProps {
  shape: FloorMapShape;
  walls: FloorMapShape[];
  isSelected?: boolean;
  onClick?: () => void;
  onPositionChange?: (position: { x: number; y: number; z: number }) => void;
}

// GLTF model loader component
function GLTFModel({ url, position, rotation, scale }: {
  url: string;
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
}) {
  const { scene } = useGLTF(url);

  return (
    <primitive
      object={scene.clone()}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  );
}

// Fallback box for objects without 3D models
function BoxFallback({ position, dimensions, rotation, color, isSelected, onClick }: {
  position: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  rotation: number;
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const meshColor = isSelected ? '#64B5F6' : color;

  return (
    <mesh
      position={position}
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
      <meshStandardMaterial
        color={meshColor}
        roughness={0.7}
        metalness={0.2}
      />
    </mesh>
  );
}

export function ObjectMesh({ shape, walls, isSelected, onClick, onPositionChange }: ObjectMeshProps) {
  // Get object definition for category and potential 3D model
  const objectDef = useMemo(() => {
    const objectId = shape.metadata?.objectId as string;
    return objectId ? getObjectDefinition(objectId) : null;
  }, [shape.metadata?.objectId]);

  // Calculate position from wall-relative or absolute position
  const { position, dimensions, rotation } = useMemo(() => {
    // If wall-relative, calculate world position from wall
    if (shape.wallRelative?.wallId) {
      const wall = walls.find(w => w.id === shape.wallRelative?.wallId);
      if (wall) {
        const wallCoords = wall.coordinates as LineCoordinates;
        if (wallCoords && wallCoords.x1 !== undefined) {
          const dx = wallCoords.x2 - wallCoords.x1;
          const dy = wallCoords.y2 - wallCoords.y1;
          const wallLength = Math.sqrt(dx * dx + dy * dy);
          const wallAngle = Math.atan2(dy, dx);

          // Position along wall
          const distanceAlongWall = shape.wallRelative.distanceFromWallStart;
          const perpOffset = shape.wallRelative.perpendicularOffset;

          // Calculate world position
          const ratio = distanceAlongWall / wallLength;
          const baseX = wallCoords.x1 + dx * ratio;
          const baseY = wallCoords.y1 + dy * ratio;

          // Apply perpendicular offset
          const perpX = -Math.sin(wallAngle) * perpOffset;
          const perpY = Math.cos(wallAngle) * perpOffset;

          const worldX = baseX + perpX;
          const worldY = baseY + perpY;
          const elevation = shape.wallRelative.elevationBottom + shape.wallRelative.height / 2;

          const dims = {
            width: shape.wallRelative.width,
            height: shape.wallRelative.height,
            depth: shape.wallRelative.depth,
          };

          return {
            position: floorPlanToThreeJS(worldX, worldY, elevation),
            dimensions: dims,
            rotation: -wallAngle,
          };
        }
      }
    }

    // Fall back to absolute position or object geometry
    const objGeom = getObjectGeometry(shape);
    if (objGeom) return objGeom;

    // Last resort defaults
    return {
      position: [0, 250, 0] as [number, number, number],
      dimensions: { width: 500, height: 500, depth: 500 },
      rotation: 0,
    };
  }, [shape, walls]);

  // Get color from category
  const color = useMemo(() => {
    return getCategoryColor(objectDef?.category || shape.objectCategory);
  }, [objectDef?.category, shape.objectCategory]);

  // Check if GLTF model is available
  const hasModel = objectDef?.assets?.model3D;

  return (
    <Suspense fallback={
      <BoxFallback
        position={position}
        dimensions={dimensions}
        rotation={rotation}
        color={color}
        isSelected={isSelected}
        onClick={onClick}
      />
    }>
      {hasModel ? (
        <GLTFModel
          url={objectDef.assets!.model3D!}
          position={position}
          rotation={rotation}
          scale={[dimensions.width / 1000, dimensions.height / 1000, dimensions.depth / 1000]}
        />
      ) : (
        <BoxFallback
          position={position}
          dimensions={dimensions}
          rotation={rotation}
          color={color}
          isSelected={isSelected}
          onClick={onClick}
        />
      )}
    </Suspense>
  );
}
