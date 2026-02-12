/**
 * Camera controls for 3D view
 *
 * Provides orbit controls with zoom-to-cursor functionality
 */

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

interface CameraControlsProps {
  initialTarget?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  enableDamping?: boolean;
}

export function CameraControls({
  initialTarget = [0, 0, 0],
  minDistance = 1000,
  maxDistance = 50000,
  minPolarAngle = 0.1,
  maxPolarAngle = Math.PI / 2.1, // Limit to prevent going below floor
  enableDamping = true,
}: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { camera, gl, raycaster, pointer, scene } = useThree();

  // Floor plane for raycasting (Y = 0)
  const floorPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const targetPoint = useRef(new THREE.Vector3());
  const zoomSpeed = 0.15;

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(...initialTarget);
      controlsRef.current.update();
    }
  }, [initialTarget]);

  // Custom zoom handler for zoom-to-cursor
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const delta = event.deltaY > 0 ? 1 : -1;

    // Calculate zoom factor
    const zoomFactor = 1 + delta * zoomSpeed;

    // Get current distance from target
    const currentDistance = camera.position.distanceTo(controls.target);
    const newDistance = THREE.MathUtils.clamp(
      currentDistance * zoomFactor,
      minDistance,
      maxDistance
    );

    // If we're not actually changing distance, skip
    if (Math.abs(newDistance - currentDistance) < 1) return;

    // Cast ray from mouse position to floor plane
    raycaster.setFromCamera(pointer, camera);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(floorPlane.current, intersectPoint)) {
      // Calculate how much we're zooming (0 = no zoom, 1 = full zoom to point)
      const zoomAmount = 1 - (newDistance / currentDistance);

      // Move target towards the intersection point
      const targetDelta = new THREE.Vector3()
        .subVectors(intersectPoint, controls.target)
        .multiplyScalar(zoomAmount * 0.5); // 0.5 factor for smoother feel

      controls.target.add(targetDelta);

      // Move camera towards the point as well, maintaining the new distance
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();

      camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    } else {
      // Fallback: simple zoom without moving target
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.target)
        .normalize();

      camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    }

    controls.update();
  }, [camera, pointer, raycaster, minDistance, maxDistance, zoomSpeed]);

  // Attach wheel listener
  useEffect(() => {
    const domElement = gl.domElement;
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl.domElement, handleWheel]);

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      enableDamping={enableDamping}
      dampingFactor={0.05}
      rotateSpeed={0.5}
      panSpeed={0.8}
      // Disable built-in zoom since we handle it ourselves
      enableZoom={false}
      // Enable touch gestures for rotate and pan
      touches={{
        ONE: 1, // ROTATE
        TWO: 2, // DOLLY_PAN (we'll handle dolly separately)
      }}
    />
  );
}
