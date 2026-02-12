/**
 * Material factory for creating Three.js materials from shape properties
 */

import * as THREE from 'three';

export interface MaterialOptions {
  color?: string;
  opacity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  side?: THREE.Side;
}

/**
 * Create a standard material for walls
 */
export function createWallMaterial(options: MaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: options.color || '#f5f5f5',
    roughness: options.roughness ?? 0.8,
    metalness: options.metalness ?? 0.1,
    side: options.side ?? THREE.DoubleSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Create a material for floors
 */
export function createFloorMaterial(options: MaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: options.color || '#e8e4df',
    roughness: options.roughness ?? 0.9,
    metalness: options.metalness ?? 0.0,
    side: THREE.DoubleSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Create a material for objects based on category
 */
export function createObjectMaterial(
  category?: string,
  options: MaterialOptions = {}
): THREE.MeshStandardMaterial {
  const categoryColors: Record<string, string> = {
    bathroom: '#87CEEB',
    kitchen: '#F5DEB3',
    furniture: '#D2B48C',
    electrical: '#FFD700',
    doors: '#A0522D',
    windows: '#ADD8E6',
  };

  return new THREE.MeshStandardMaterial({
    color: options.color || categoryColors[category || ''] || '#CCCCCC',
    roughness: options.roughness ?? 0.7,
    metalness: options.metalness ?? 0.2,
    side: THREE.DoubleSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Create a glass-like material for windows
 */
export function createGlassMaterial(options: MaterialOptions = {}): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: options.color || '#88ccff',
    metalness: 0,
    roughness: 0,
    transmission: 0.9,
    transparent: true,
    opacity: options.opacity ?? 0.3,
    side: THREE.DoubleSide,
  });
}

/**
 * Create an outline material for selection highlighting
 */
export function createSelectionMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: '#2196F3',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
}
