import { FloorMapShape, ViewState } from '../../types';

/**
 * Calculate bounding box of all shapes and return a ViewState
 * that fits them in the viewport with padding.
 */
export function calculateFitToContent(
  shapes: FloorMapShape[],
  viewportWidth: number,
  viewportHeight: number
): ViewState | null {
  if (shapes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    const coords = shape.coordinates;
    if (!coords) continue;

    if (shape.type === 'room' && 'points' in coords && Array.isArray(coords.points)) {
      for (const p of coords.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    } else if ((shape.type === 'wall' || shape.type === 'line') && 'x1' in coords) {
      minX = Math.min(minX, coords.x1, coords.x2);
      minY = Math.min(minY, coords.y1, coords.y2);
      maxX = Math.max(maxX, coords.x1, coords.x2);
      maxY = Math.max(maxY, coords.y1, coords.y2);
    } else if (
      (shape.type === 'rectangle' || shape.type === 'image') &&
      'left' in coords
    ) {
      minX = Math.min(minX, coords.left);
      minY = Math.min(minY, coords.top);
      maxX = Math.max(maxX, coords.left + (coords.width || 0));
      maxY = Math.max(maxY, coords.top + (coords.height || 0));
    } else if (shape.type === 'circle' && 'cx' in coords) {
      const r = coords.radius || 0;
      minX = Math.min(minX, coords.cx - r);
      minY = Math.min(minY, coords.cy - r);
      maxX = Math.max(maxX, coords.cx + r);
      maxY = Math.max(maxY, coords.cy + r);
    } else if ('x' in coords && 'y' in coords) {
      // Symbol, text, freehand, etc.
      const w = ('width' in coords ? (coords as any).width : 0) || 0;
      const h = ('height' in coords ? (coords as any).height : 0) || 0;
      minX = Math.min(minX, coords.x);
      minY = Math.min(minY, coords.y);
      maxX = Math.max(maxX, coords.x + w);
      maxY = Math.max(maxY, coords.y + h);
    }
  }

  // No valid bounds found
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Avoid division by zero for point-like content
  if (contentWidth < 1 && contentHeight < 1) {
    return {
      panX: viewportWidth / 2 - minX,
      panY: viewportHeight / 2 - minY,
      zoom: 1,
    };
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Fit with 70% padding factor (content fills ~70% of viewport)
  const paddingFactor = 0.7;
  const zoomToFitWidth = contentWidth > 0 ? (viewportWidth * paddingFactor) / contentWidth : 2;
  const zoomToFitHeight = contentHeight > 0 ? (viewportHeight * paddingFactor) / contentHeight : 2;
  const zoom = Math.max(0.3, Math.min(2, Math.min(zoomToFitWidth, zoomToFitHeight)));

  const panX = viewportWidth / 2 - centerX * zoom;
  const panY = viewportHeight / 2 - centerY * zoom;

  return { panX, panY, zoom };
}
