/**
 * Post-processing for AI-detected walls to improve precision.
 * Snaps near-horizontal/vertical walls, merges close endpoints, and combines collinear segments.
 */

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
}

/** Straighten walls that are nearly horizontal or vertical */
function snapToAxis(walls: Wall[], threshold = 5): Wall[] {
  return walls.map((w) => {
    const dx = Math.abs(w.x2 - w.x1);
    const dy = Math.abs(w.y2 - w.y1);
    if (dy < threshold && dx > dy) {
      const avgY = Math.round((w.y1 + w.y2) / 2);
      return { ...w, y1: avgY, y2: avgY };
    }
    if (dx < threshold && dy > dx) {
      const avgX = Math.round((w.x1 + w.x2) / 2);
      return { ...w, x1: avgX, x2: avgX };
    }
    return w;
  });
}

/** Snap wall endpoints that are close together to the same point */
function snapEndpoints(walls: Wall[], threshold = 10): Wall[] {
  const points: { x: number; y: number }[] = [];
  for (const w of walls) {
    points.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  }

  // Build clusters of nearby points
  const visited = new Set<number>();
  const canonical = new Map<number, { x: number; y: number }>();

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [i];
    visited.add(i);
    for (let j = i + 1; j < points.length; j++) {
      if (visited.has(j)) continue;
      const dist = Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y);
      if (dist <= threshold) {
        cluster.push(j);
        visited.add(j);
      }
    }
    // Average position for the cluster
    const avgX = Math.round(cluster.reduce((s, idx) => s + points[idx].x, 0) / cluster.length);
    const avgY = Math.round(cluster.reduce((s, idx) => s + points[idx].y, 0) / cluster.length);
    for (const idx of cluster) {
      canonical.set(idx, { x: avgX, y: avgY });
    }
  }

  return walls.map((w, i) => {
    const p1 = canonical.get(i * 2)!;
    const p2 = canonical.get(i * 2 + 1)!;
    return { ...w, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  });
}

/** Merge collinear, overlapping/adjacent wall segments */
function mergeCollinearWalls(walls: Wall[], threshold = 5): Wall[] {
  const used = new Set<number>();
  const result: Wall[] = [];

  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    let merged = { ...walls[i] };
    used.add(i);

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < walls.length; j++) {
        if (used.has(j)) continue;
        const m = tryMerge(merged, walls[j], threshold);
        if (m) {
          merged = m;
          used.add(j);
          changed = true;
        }
      }
    }
    result.push(merged);
  }
  return result;
}

function tryMerge(a: Wall, b: Wall, threshold: number): Wall | null {
  // Both must be axis-aligned (horizontal or vertical)
  const aHoriz = a.y1 === a.y2;
  const aVert = a.x1 === a.x2;
  const bHoriz = b.y1 === b.y2;
  const bVert = b.x1 === b.x2;

  if (aHoriz && bHoriz && Math.abs(a.y1 - b.y1) <= threshold) {
    const minX = Math.min(a.x1, a.x2, b.x1, b.x2);
    const maxX = Math.max(a.x1, a.x2, b.x1, b.x2);
    // Check overlap or adjacency
    const aMin = Math.min(a.x1, a.x2);
    const aMax = Math.max(a.x1, a.x2);
    const bMin = Math.min(b.x1, b.x2);
    const bMax = Math.max(b.x1, b.x2);
    if (bMin <= aMax + threshold && aMin <= bMax + threshold) {
      const y = Math.round((a.y1 + b.y1) / 2);
      return { x1: minX, y1: y, x2: maxX, y2: y, thickness: a.thickness || b.thickness };
    }
  }

  if (aVert && bVert && Math.abs(a.x1 - b.x1) <= threshold) {
    const minY = Math.min(a.y1, a.y2, b.y1, b.y2);
    const maxY = Math.max(a.y1, a.y2, b.y1, b.y2);
    const aMin = Math.min(a.y1, a.y2);
    const aMax = Math.max(a.y1, a.y2);
    const bMin = Math.min(b.y1, b.y2);
    const bMax = Math.max(b.y1, b.y2);
    if (bMin <= aMax + threshold && aMin <= bMax + threshold) {
      const x = Math.round((a.x1 + b.x1) / 2);
      return { x1: x, y1: minY, x2: x, y2: maxY, thickness: a.thickness || b.thickness };
    }
  }

  return null;
}

/** Run all post-processing steps in order */
export function postProcessWalls(walls: Wall[]): Wall[] {
  if (!walls.length) return walls;
  let result = snapToAxis(walls);
  result = snapEndpoints(result);
  result = mergeCollinearWalls(result);
  return result;
}
