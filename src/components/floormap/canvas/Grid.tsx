/**
 * Multi-Level Grid Component
 *
 * Renders an infinite grid with zoom-dependent detail levels.
 * Uses architectural scale standards (5m → 10cm).
 */

import React from 'react';
import { Line, Rect } from 'react-konva';
import { getActiveGridLevels } from './utils/scale';

export interface GridProps {
  viewState: { zoom: number; panX: number; panY: number };
  scaleSettings: { pixelsPerMm: number };
  projectSettings: {
    gridVisible?: boolean;
    canvasWidthMeters: number;
    canvasHeightMeters: number;
  };
}

export const Grid: React.FC<GridProps> = ({ viewState, scaleSettings, projectSettings }) => {
  // Don't render if grid is hidden
  if (projectSettings.gridVisible === false) {
    return null;
  }

  const { zoom, panX, panY } = viewState;
  const { pixelsPerMm } = scaleSettings;
  const { canvasWidthMeters, canvasHeightMeters } = projectSettings;

  const activeGrids = getActiveGridLevels(zoom, pixelsPerMm);
  const lines: JSX.Element[] = [];

  // Calculate viewport dimensions (visible area on screen)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Transform viewport to world coordinates (account for pan and zoom)
  // World coords = (screen coords - pan) / zoom
  const worldLeft = (-panX) / zoom;
  const worldTop = (-panY) / zoom;
  const worldRight = (viewportWidth - panX) / zoom;
  const worldBottom = (viewportHeight - panY) / zoom;

  // Extend grid beyond viewport for smooth panning
  const padding = Math.max(viewportWidth, viewportHeight) / zoom;
  const extendedLeft = worldLeft - padding;
  const extendedTop = worldTop - padding;
  const extendedRight = worldRight + padding;
  const extendedBottom = worldBottom + padding;

  // Draw gridlines across ENTIRE visible area + padding
  // IMPORTANT: Use integer-based loop to avoid floating-point accumulation errors
  activeGrids.forEach((gridLevel, levelIndex) => {
    const gridSize = gridLevel.size;

    // Calculate grid line indices (integers) to avoid floating-point errors
    const startXIndex = Math.floor(extendedLeft / gridSize);
    const endXIndex = Math.ceil(extendedRight / gridSize);
    const startYIndex = Math.floor(extendedTop / gridSize);
    const endYIndex = Math.ceil(extendedBottom / gridSize);

    // Vertical lines - use integer index and multiply to get position
    // Round to avoid sub-pixel rendering artifacts at high zoom
    for (let i = startXIndex; i <= endXIndex; i++) {
      const x = Math.round(i * gridSize * 100) / 100; // Round to 2 decimals for precision
      lines.push(
        <Line
          key={`${levelIndex}-v-${i}`}
          points={[x, extendedTop, x, extendedBottom]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.5, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    // Horizontal lines - use integer index and multiply to get position
    // Round to avoid sub-pixel rendering artifacts at high zoom
    for (let j = startYIndex; j <= endYIndex; j++) {
      const y = Math.round(j * gridSize * 100) / 100; // Round to 2 decimals for precision
      lines.push(
        <Line
          key={`${levelIndex}-h-${j}`}
          points={[extendedLeft, y, extendedRight, y]}
          stroke={gridLevel.color}
          strokeWidth={Math.max(0.5, gridLevel.lineWidth / zoom)}
          opacity={gridLevel.opacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }
  });

  // Canvas working area starting at (0,0) - no margins
  const canvasWidthPx = canvasWidthMeters * 1000 * pixelsPerMm;
  const canvasHeightPx = canvasHeightMeters * 1000 * pixelsPerMm;

  return (
    <>
      {/* White background for canvas working area */}
      <Rect
        x={0}
        y={0}
        width={canvasWidthPx}
        height={canvasHeightPx}
        fill="#ffffff"
        listening={false}
      />

      {/* Gridlines - extend infinitely across visible viewport */}
      {lines}

      {/* Canvas boundary - subtle border */}
      <Rect
        x={0}
        y={0}
        width={canvasWidthPx}
        height={canvasHeightPx}
        stroke="#e5e7eb"
        strokeWidth={1 / zoom}
        listening={false}
      />
    </>
  );
};

export default Grid;
