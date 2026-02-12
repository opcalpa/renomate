/**
 * ThreeDFloorPlan - Main 3D canvas component
 *
 * Renders the floor plan in 3D using React Three Fiber.
 * Syncs with the Zustand store for bidirectional editing.
 */

import { Suspense, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { useFloorMapStore } from '../store';
import { WallMesh, FloorMesh, ObjectMesh, OpeningMesh } from './scene';
import { CameraControls } from './controls/CameraControls';
import { useSceneShapes, useSelectionSync, useObjectSync } from './hooks/useSceneSync';
import type { FloorMapShape, Position3D, LineCoordinates, PolygonCoordinates } from '../types';

interface ThreeDFloorPlanProps {
  projectId: string;
}

// Loading fallback component
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[500, 500, 500]} />
      <meshBasicMaterial color="#cccccc" wireframe />
    </mesh>
  );
}

// Scene content component - separated to use hooks inside Canvas
function SceneContent({ planId }: { planId: string | null }) {
  const { walls, rooms, openings, objects } = useSceneShapes(planId);
  const { selectedShapeId, selectShape } = useSelectionSync();
  const { updateObjectFrom3D } = useObjectSync();

  // Calculate scene center based on all shapes (coordinates are now in mm)
  const sceneCenter = useMemo(() => {
    const allShapes = [...walls, ...rooms, ...openings, ...objects];
    if (allShapes.length === 0) return [0, 0, 0] as [number, number, number];

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const shape of allShapes) {
      if (shape.coordinates && 'x1' in shape.coordinates) {
        const coords = shape.coordinates as LineCoordinates;
        minX = Math.min(minX, coords.x1, coords.x2);
        maxX = Math.max(maxX, coords.x1, coords.x2);
        // Floor plan Y becomes Z in Three.js (no negation to avoid mirroring)
        minZ = Math.min(minZ, coords.y1, coords.y2);
        maxZ = Math.max(maxZ, coords.y1, coords.y2);
      } else if (shape.coordinates && 'points' in shape.coordinates) {
        const coords = shape.coordinates as PolygonCoordinates;
        for (const p of coords.points) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minZ = Math.min(minZ, p.y);
          maxZ = Math.max(maxZ, p.y);
        }
      }
    }

    if (minX === Infinity) return [0, 0, 0] as [number, number, number];

    return [
      (minX + maxX) / 2,
      0,
      (minZ + maxZ) / 2,
    ] as [number, number, number];
  }, [walls, rooms, openings, objects]);

  // Handle object position change from drag
  const handleObjectMove = useCallback(
    (shapeId: string, position: Position3D) => {
      updateObjectFrom3D(shapeId, position);
    },
    [updateObjectFrom3D]
  );

  // Deselect when clicking empty space
  const handlePointerMissed = useCallback(() => {
    selectShape(null);
  }, [selectShape]);

  return (
    <>
      {/* Camera and controls */}
      {/* Position camera at front-left, elevated, looking at scene center */}
      {/* With Z = floorPlanY, larger Z is "down" in the floor plan, so we offset camera to negative Z to see from "top" */}
      <PerspectiveCamera
        makeDefault
        position={[sceneCenter[0] - 3000, 5000, sceneCenter[2] - 5000]}
        fov={50}
        near={10}
        far={100000}
      />
      <CameraControls initialTarget={sceneCenter} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5000, 10000, 5000]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50000}
        shadow-camera-left={-10000}
        shadow-camera-right={10000}
        shadow-camera-top={10000}
        shadow-camera-bottom={-10000}
      />
      <hemisphereLight
        color="#ffffff"
        groundColor="#444444"
        intensity={0.3}
      />

      {/* Environment for reflections */}
      <Environment preset="apartment" />

      {/* Grid helper */}
      <Grid
        position={[sceneCenter[0], 0, sceneCenter[2]]}
        args={[50000, 50000]}
        cellSize={500}
        cellThickness={0.5}
        cellColor="#cccccc"
        sectionSize={5000}
        sectionThickness={1}
        sectionColor="#999999"
        fadeDistance={30000}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Render walls */}
      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          isSelected={wall.id === selectedShapeId}
          onClick={() => selectShape(wall.id)}
        />
      ))}

      {/* Render floors */}
      {rooms.map((room) => (
        <FloorMesh
          key={room.id}
          room={room}
          isSelected={room.id === selectedShapeId}
          onClick={() => selectShape(room.id)}
        />
      ))}

      {/* Render doors and windows */}
      {openings.map((opening) => (
        <OpeningMesh
          key={opening.id}
          opening={opening}
          isSelected={opening.id === selectedShapeId}
          onClick={() => selectShape(opening.id)}
        />
      ))}

      {/* Render objects */}
      {objects.map((obj) => (
        <ObjectMesh
          key={obj.id}
          shape={obj}
          walls={walls}
          isSelected={obj.id === selectedShapeId}
          onClick={() => selectShape(obj.id)}
          onPositionChange={(pos) => handleObjectMove(obj.id, pos)}
        />
      ))}
    </>
  );
}

export function ThreeDFloorPlan({ projectId }: ThreeDFloorPlanProps) {
  const { t } = useTranslation();
  const currentPlanId = useFloorMapStore((state) => state.currentPlanId);

  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-sky-50">
      <Canvas
        shadows
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        onPointerMissed={() => {
          // Deselect on background click
          useFloorMapStore.getState().setSelectedShapeId(null);
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent planId={currentPlanId} />
        </Suspense>
      </Canvas>

      {/* 3D View toolbar overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{t('floormap.3dView')}</span>
        <span className="text-xs opacity-70">{t('floormap.3dViewHelp')}</span>
      </div>
    </div>
  );
}

export default ThreeDFloorPlan;
