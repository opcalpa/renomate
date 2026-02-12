/**
 * WallElevationView - Wall-centric elevation view showing collinear wall segments
 *
 * When user selects a wall and clicks "Väggvy", this shows the entire "logical wall":
 * - All collinear (same-line) wall segments
 * - Openings (doors, windows, sliding doors) between wall segments
 * - Adjacent room context with color coding
 *
 * This solves the problem where walls split by doors appear as separate segments
 * but should be viewed as one continuous wall in elevation.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stage, Layer, Rect, Line, Text as KonvaText, Group, Circle } from 'react-konva';
import Konva from 'konva';
import { X, ZoomIn, ZoomOut, RotateCcw, Layers, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFloorMapStore } from './store';
import { getCombinedWallElevationData, CombinedWallSegment } from './canvas/utils/wallCoordinates';
import { getAdminDefaults } from './canvas/constants';

interface WallElevationViewProps {
  wallId: string;
  onClose: () => void;
  projectId: string;
}

// Helper to format dimension
const formatDim = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}m`;
  } else if (value >= 10) {
    return `${(value / 10).toFixed(1)}cm`;
  }
  return `${Math.round(value)}mm`;
};

// Colors for different segment types
const segmentColors: Record<CombinedWallSegment['type'], { fill: string; stroke: string }> = {
  wall: { fill: '#e5e7eb', stroke: '#374151' },
  door: { fill: '#e9d5ff', stroke: '#8b5cf6' },
  window: { fill: '#bae6fd', stroke: '#0284c7' },
  sliding_door: { fill: '#d1fae5', stroke: '#10b981' },
  gap: { fill: '#fafafa', stroke: '#d1d5db' },
};

export const WallElevationView: React.FC<WallElevationViewProps> = ({
  wallId,
  onClose,
  projectId,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const { shapes, scaleSettings } = useFloorMapStore();
  const { pixelsPerMm } = scaleSettings;
  const adminDefaults = getAdminDefaults();

  // State
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Measure tool state
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  // Get combined wall elevation data
  const elevationData = useMemo(() => {
    return getCombinedWallElevationData(wallId, shapes, adminDefaults.wallHeightMM, pixelsPerMm);
  }, [wallId, shapes, adminDefaults.wallHeightMM, pixelsPerMm]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight - 80,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.3));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Measure tool handlers
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isMeasureActive) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Transform to canvas coordinates (accounting for zoom and pan)
    const pos = {
      x: (pointer.x - panX) / zoom,
      y: (pointer.y - panY) / zoom,
    };

    setIsMeasuring(true);
    setMeasureStart(pos);
    setMeasureEnd(pos);
  }, [isMeasureActive, panX, panY, zoom]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isMeasuring) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const pos = {
      x: (pointer.x - panX) / zoom,
      y: (pointer.y - panY) / zoom,
    };

    setMeasureEnd(pos);
  }, [isMeasuring, panX, panY, zoom]);

  const handleMouseUp = useCallback(() => {
    if (isMeasuring) {
      setIsMeasuring(false);
      // Keep measurement visible until measure tool is deactivated
    }
  }, [isMeasuring]);

  // Toggle measure tool
  const toggleMeasureTool = useCallback(() => {
    setIsMeasureActive(prev => {
      if (prev) {
        // Deactivating - clear measurement
        setMeasureStart(null);
        setMeasureEnd(null);
      }
      return !prev;
    });
  }, []);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newZoom = e.evt.deltaY > 0 ? zoom / scaleBy : zoom * scaleBy;
    setZoom(Math.max(0.3, Math.min(3, newZoom)));
  }, [zoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Calculate visualization
  const visualization = useMemo(() => {
    if (!elevationData) return null;

    const { totalLengthMM, wallHeightMM, segments, adjacentRooms } = elevationData;

    // Calculate scale to fit in canvas
    const padding = 120;
    const availableWidth = dimensions.width - padding * 2;
    const availableHeight = dimensions.height - padding * 2;

    const scaleX = availableWidth / totalLengthMM;
    const scaleY = availableHeight / wallHeightMM;
    const effectiveScale = Math.min(scaleX, scaleY) * 0.75;

    const wallWidth = totalLengthMM * effectiveScale;
    const wallHeight = wallHeightMM * effectiveScale;
    const wallX = (dimensions.width - wallWidth) / 2;
    const wallY = (dimensions.height - wallHeight) / 2 + 20;

    return {
      wallX,
      wallY,
      wallWidth,
      wallHeight,
      wallLengthMM: totalLengthMM,
      wallHeightMM,
      effectiveScale,
      segments,
      adjacentRooms,
      wallCount: elevationData.walls.length,
      openingCount: elevationData.openings.length,
    };
  }, [elevationData, dimensions]);

  if (!elevationData) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('wallElevation.wallNotFound', 'Wall not found')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('wallElevation.cannotLoadWall', 'Could not load wall elevation data.')}
          </p>
          <Button onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    );
  }

  // Get room color for background tint
  const roomColor = elevationData.adjacentRooms.left?.color ||
    elevationData.adjacentRooms.right?.color ||
    null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-[200] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            {/* Room color indicators */}
            {elevationData.adjacentRooms.left && (
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: elevationData.adjacentRooms.left.color.replace(/[\d.]+\)$/, '0.8)') }}
                title={elevationData.adjacentRooms.left.name}
              />
            )}
            {elevationData.adjacentRooms.right && elevationData.adjacentRooms.right !== elevationData.adjacentRooms.left && (
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: elevationData.adjacentRooms.right.color.replace(/[\d.]+\)$/, '0.8)') }}
                title={elevationData.adjacentRooms.right.name}
              />
            )}
            <div>
              <h2 className="font-semibold text-lg">
                {t('wallElevation.title', 'Wall Elevation View')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('wallElevation.combinedWallHint', 'Shows all connected wall segments')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-gray-100">
            <Layers className="w-3 h-3 mr-1" />
            {visualization?.wallCount || 0} {t('wallElevation.wallSegments', 'wall segments')}
          </Badge>
          {(visualization?.openingCount || 0) > 0 && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              {visualization?.openingCount} {t('wallElevation.openings', 'openings')}
            </Badge>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={isMeasureActive ? "default" : "ghost"}
            size="icon"
            onClick={toggleMeasureTool}
            className={isMeasureActive ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            title={t('floormap.measureDistance', 'Measure distance')}
          >
            <Ruler className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <Button variant="ghost" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Adjacent rooms bar */}
      {(elevationData.adjacentRooms.left || elevationData.adjacentRooms.right) && (
        <div className="bg-white border-b flex justify-center gap-4 py-2 px-4">
          {elevationData.adjacentRooms.left && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: elevationData.adjacentRooms.left.color.replace(/[\d.]+\)$/, '0.6)') }}
              />
              <span className="text-gray-600">
                {t('wallElevation.leftSide', 'Left')}: <strong>{elevationData.adjacentRooms.left.name}</strong>
              </span>
            </div>
          )}
          {elevationData.adjacentRooms.right && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: elevationData.adjacentRooms.right.color.replace(/[\d.]+\)$/, '0.6)') }}
              />
              <span className="text-gray-600">
                {t('wallElevation.rightSide', 'Right')}: <strong>{elevationData.adjacentRooms.right.name}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 relative" style={{ cursor: isMeasureActive ? 'crosshair' : 'default' }}>
        {/* Konva Stage */}
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          scaleX={zoom}
          scaleY={zoom}
          x={panX}
          y={panY}
          draggable={!isMeasureActive}
          onDragEnd={(e) => {
            if (!isMeasureActive) {
              setPanX(e.target.x());
              setPanY(e.target.y());
            }
          }}
        >
          <Layer>
            {/* Background */}
            <Rect
              x={-1000}
              y={-1000}
              width={dimensions.width + 2000}
              height={dimensions.height + 2000}
              fill="#f3f4f6"
            />

            {visualization && (
              <>
                {/* Floor line */}
                <Line
                  points={[
                    visualization.wallX - 50,
                    visualization.wallY + visualization.wallHeight,
                    visualization.wallX + visualization.wallWidth + 50,
                    visualization.wallY + visualization.wallHeight,
                  ]}
                  stroke="#374151"
                  strokeWidth={3}
                />
                <KonvaText
                  x={visualization.wallX + visualization.wallWidth + 60}
                  y={visualization.wallY + visualization.wallHeight - 8}
                  text={t('wallElevation.floor', 'Floor')}
                  fontSize={12}
                  fill="#6b7280"
                />

                {/* Total wall outline (subtle background) */}
                <Rect
                  x={visualization.wallX}
                  y={visualization.wallY}
                  width={visualization.wallWidth}
                  height={visualization.wallHeight}
                  fill={roomColor
                    ? roomColor.replace(/[\d.]+\)$/, '0.08)')
                    : '#f9fafb'}
                  stroke="#d1d5db"
                  strokeWidth={1}
                  dash={[5, 5]}
                />

                {/* Render each segment */}
                {visualization.segments.map((segment, index) => {
                  const segX = visualization.wallX + segment.startPositionMM * visualization.effectiveScale;
                  const segWidth = segment.lengthMM * visualization.effectiveScale;
                  const colors = segmentColors[segment.type];

                  if (segment.type === 'wall') {
                    // Full height wall segment
                    return (
                      <Group key={`seg-${index}`}>
                        <Rect
                          x={segX}
                          y={visualization.wallY}
                          width={segWidth}
                          height={visualization.wallHeight}
                          fill={colors.fill}
                          stroke={colors.stroke}
                          strokeWidth={2}
                        />
                        {/* Wall pattern */}
                        {Array.from({ length: Math.ceil(visualization.wallHeight / 40) }).map((_, rowIndex) => (
                          <Line
                            key={`wall-${index}-row-${rowIndex}`}
                            points={[
                              segX,
                              visualization.wallY + rowIndex * 40,
                              segX + segWidth,
                              visualization.wallY + rowIndex * 40,
                            ]}
                            stroke="#d1d5db"
                            strokeWidth={0.5}
                            dash={[5, 10]}
                          />
                        ))}
                        {/* Segment width label (below floor) */}
                        <KonvaText
                          x={segX + segWidth / 2 - 20}
                          y={visualization.wallY + visualization.wallHeight + 15}
                          text={formatDim(segment.lengthMM)}
                          fontSize={10}
                          fill="#6b7280"
                        />
                      </Group>
                    );
                  } else if (segment.type === 'gap') {
                    // Gap (dashed outline)
                    return (
                      <Group key={`seg-${index}`}>
                        <Rect
                          x={segX}
                          y={visualization.wallY}
                          width={segWidth}
                          height={visualization.wallHeight}
                          fill={colors.fill}
                          stroke={colors.stroke}
                          strokeWidth={1}
                          dash={[8, 4]}
                        />
                        <KonvaText
                          x={segX + segWidth / 2 - 15}
                          y={visualization.wallY + visualization.wallHeight / 2 - 6}
                          text={t('wallElevation.gap', 'Gap')}
                          fontSize={10}
                          fill="#9ca3af"
                          fontStyle="italic"
                        />
                      </Group>
                    );
                  } else {
                    // Opening (door/window/sliding_door)
                    const openingHeight = (segment.heightMM || 2100) * visualization.effectiveScale;
                    const elevationBottom = (segment.elevationBottom || 0) * visualization.effectiveScale;
                    const openingY = visualization.wallY + visualization.wallHeight - openingHeight - elevationBottom;

                    const label = segment.type === 'window'
                      ? t('wallElevation.window', 'Window')
                      : segment.type === 'sliding_door'
                        ? t('wallElevation.slidingDoor', 'Sliding Door')
                        : t('wallElevation.door', 'Door');

                    return (
                      <Group key={`seg-${index}`}>
                        {/* Opening rectangle */}
                        <Rect
                          x={segX}
                          y={openingY}
                          width={segWidth}
                          height={openingHeight}
                          fill={colors.fill}
                          stroke={colors.stroke}
                          strokeWidth={2}
                        />
                        {/* Opening label */}
                        <KonvaText
                          x={segX + segWidth / 2 - 25}
                          y={openingY + openingHeight / 2 - 6}
                          text={label}
                          fontSize={11}
                          fill={colors.stroke}
                          fontStyle="bold"
                        />
                        {/* Width dimension */}
                        <Line
                          points={[segX, openingY - 15, segX + segWidth, openingY - 15]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <Line
                          points={[segX, openingY - 20, segX, openingY - 10]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <Line
                          points={[segX + segWidth, openingY - 20, segX + segWidth, openingY - 10]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <KonvaText
                          x={segX + segWidth / 2 - 18}
                          y={openingY - 30}
                          text={formatDim(segment.lengthMM)}
                          fontSize={10}
                          fontStyle="bold"
                          fill={colors.stroke}
                        />
                        {/* Height dimension */}
                        <Line
                          points={[segX + segWidth + 8, openingY, segX + segWidth + 8, openingY + openingHeight]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <Line
                          points={[segX + segWidth + 5, openingY, segX + segWidth + 11, openingY]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <Line
                          points={[segX + segWidth + 5, openingY + openingHeight, segX + segWidth + 11, openingY + openingHeight]}
                          stroke={colors.stroke}
                          strokeWidth={1}
                        />
                        <KonvaText
                          x={segX + segWidth + 14}
                          y={openingY + openingHeight / 2 - 5}
                          text={formatDim(segment.heightMM || 2100)}
                          fontSize={9}
                          fill={colors.stroke}
                        />
                      </Group>
                    );
                  }
                })}

                {/* Total width dimension */}
                <Group>
                  <Line
                    points={[
                      visualization.wallX,
                      visualization.wallY - 50,
                      visualization.wallX + visualization.wallWidth,
                      visualization.wallY - 50,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <Line
                    points={[
                      visualization.wallX,
                      visualization.wallY - 58,
                      visualization.wallX,
                      visualization.wallY - 42,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <Line
                    points={[
                      visualization.wallX + visualization.wallWidth,
                      visualization.wallY - 58,
                      visualization.wallX + visualization.wallWidth,
                      visualization.wallY - 42,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <KonvaText
                    x={visualization.wallX + visualization.wallWidth / 2 - 35}
                    y={visualization.wallY - 75}
                    text={`${t('wallElevation.total', 'Total')}: ${formatDim(visualization.wallLengthMM)}`}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#1f2937"
                  />
                </Group>

                {/* Height dimension */}
                <Group>
                  <Line
                    points={[
                      visualization.wallX - 40,
                      visualization.wallY,
                      visualization.wallX - 40,
                      visualization.wallY + visualization.wallHeight,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <Line
                    points={[
                      visualization.wallX - 48,
                      visualization.wallY,
                      visualization.wallX - 32,
                      visualization.wallY,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <Line
                    points={[
                      visualization.wallX - 48,
                      visualization.wallY + visualization.wallHeight,
                      visualization.wallX - 32,
                      visualization.wallY + visualization.wallHeight,
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1.5}
                  />
                  <KonvaText
                    x={visualization.wallX - 90}
                    y={visualization.wallY + visualization.wallHeight / 2 - 7}
                    text={formatDim(visualization.wallHeightMM)}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#1f2937"
                    rotation={-90}
                  />
                </Group>
              </>
            )}

            {/* Measurement line */}
            {measureStart && measureEnd && (() => {
              const x1 = measureStart.x;
              const y1 = measureStart.y;
              const x2 = measureEnd.x;
              const y2 = measureEnd.y;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const distancePixels = Math.sqrt(dx * dx + dy * dy);

              // Convert to mm using the effective scale from visualization
              const distanceMm = visualization ? distancePixels / visualization.effectiveScale : distancePixels;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              if (distancePixels < 5) return null;

              // Scale-independent sizes
              const strokeWidth = 2 / zoom;
              const markerSize = 6 / zoom;
              const circleRadius = 4 / zoom;
              const labelWidth = 90 / zoom;
              const labelHeight = 24 / zoom;
              const fontSize = 14 / zoom;
              const dashSize = [8 / zoom, 4 / zoom];

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
                  {/* X markers at endpoints */}
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
                    x={midX - labelWidth / 2 + 6 / zoom}
                    y={midY - labelHeight + 4 / zoom}
                    text={formatDim(distanceMm)}
                    fontSize={fontSize}
                    fill="#ef4444"
                    fontStyle="bold"
                  />
                </Group>
              );
            })()}
          </Layer>
        </Stage>
      </div>

      {/* Legend */}
      <div className="bg-white border-t py-3 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: segmentColors.wall.fill, border: `2px solid ${segmentColors.wall.stroke}` }} />
          <span className="text-sm text-gray-600">{t('wallElevation.wallSegment', 'Wall')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: segmentColors.door.fill, border: `2px solid ${segmentColors.door.stroke}` }} />
          <span className="text-sm text-gray-600">{t('wallElevation.door', 'Door')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: segmentColors.window.fill, border: `2px solid ${segmentColors.window.stroke}` }} />
          <span className="text-sm text-gray-600">{t('wallElevation.window', 'Window')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: segmentColors.sliding_door.fill, border: `2px solid ${segmentColors.sliding_door.stroke}` }} />
          <span className="text-sm text-gray-600">{t('wallElevation.slidingDoor', 'Sliding Door')}</span>
        </div>
      </div>
    </div>
  );
};
