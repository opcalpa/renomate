/**
 * Measurement Overlay
 *
 * Renders the measurement tool overlay showing distance and angle
 * between two points on the canvas.
 */

import React from 'react';
import { Group, Line, Rect, Circle, Text as KonvaText } from 'react-konva';
import { formatDimension } from './utils/scale';

interface MeasurementOverlayProps {
  measureStart: { x: number; y: number } | null;
  measureEnd: { x: number; y: number } | null;
  zoom: number;
  pixelsPerMm: number;
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  measureStart,
  measureEnd,
  zoom,
  pixelsPerMm,
}) => {
  if (!measureStart || !measureEnd) return null;

  const x1 = measureStart.x;
  const y1 = measureStart.y;
  const x2 = measureEnd.x;
  const y2 = measureEnd.y;

  const dx = x2 - x1;
  const dy = y2 - y1;
  // Convert pixel distance to mm using pixelsPerMm
  const distancePixels = Math.sqrt(dx * dx + dy * dy);
  const distanceMm = distancePixels / pixelsPerMm;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Only show if there's a meaningful distance
  if (distancePixels < 5) return null;

  // Scale-independent sizes (divide by zoom to keep constant screen size)
  const strokeWidth = 2 / zoom;
  const markerSize = 6 / zoom;
  const circleRadius = 4 / zoom;
  const labelWidth = 90 / zoom;
  const labelHeight = 24 / zoom;
  const fontSize = 14 / zoom;
  const dashSize = [8 / zoom, 4 / zoom];

  // Calculate angle in degrees
  const angleDegrees = (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1);

  return (
    <Group listening={false}>
      {/* Main measurement line */}
      <Line
        points={[x1, y1, x2, y2]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
        dash={dashSize}
      />
      {/* Start point */}
      <Circle x={x1} y={y1} radius={circleRadius} fill="#ef4444" />
      {/* End point */}
      <Circle x={x2} y={y2} radius={circleRadius} fill="#ef4444" />
      {/* X markers at start endpoint */}
      <Line
        points={[x1 - markerSize, y1 - markerSize, x1 + markerSize, y1 + markerSize]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
      />
      <Line
        points={[x1 - markerSize, y1 + markerSize, x1 + markerSize, y1 - markerSize]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
      />
      {/* X markers at end endpoint */}
      <Line
        points={[x2 - markerSize, y2 - markerSize, x2 + markerSize, y2 + markerSize]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
      />
      <Line
        points={[x2 - markerSize, y2 + markerSize, x2 + markerSize, y2 - markerSize]}
        stroke="#ef4444"
        strokeWidth={strokeWidth}
      />
      {/* Distance label with background */}
      <Rect
        x={midX - labelWidth / 2}
        y={midY - labelHeight - 4 / zoom}
        width={labelWidth}
        height={labelHeight}
        fill="white"
        stroke="#ef4444"
        strokeWidth={strokeWidth / 2}
        cornerRadius={4 / zoom}
      />
      <KonvaText
        x={midX - labelWidth / 2}
        y={midY - labelHeight}
        width={labelWidth}
        text={formatDimension(distanceMm)}
        fontSize={fontSize}
        fill="#ef4444"
        align="center"
        fontStyle="bold"
      />
      {/* Angle indicator */}
      <KonvaText
        x={midX - 25 / zoom}
        y={midY + 4 / zoom}
        text={`${angleDegrees}°`}
        fontSize={10 / zoom}
        fill="#9ca3af"
      />
    </Group>
  );
};
