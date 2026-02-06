/**
 * RoomElevationView - Room-centric elevation view with swipe navigation
 *
 * Shows elevation view of a room's walls with gallery-style navigation.
 * User can swipe between North, East, South, and West wall views.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stage, Layer, Rect, Line, Text as KonvaText, Group } from 'react-konva';
import Konva from 'konva';
import { ChevronLeft, ChevronRight, X, Compass, ZoomIn, ZoomOut, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFloorMapStore } from './store';
import { FloorMapShape } from './types';
import {
  findWallsForRoom,
  createVirtualWallsFromRoom,
  RoomWall,
  WallDirection,
  getDirectionLabel,
  getDirectionIcon,
} from './utils/roomWalls';
import { getAdminDefaults } from './canvas/constants';
import { cn } from '@/lib/utils';

interface RoomElevationViewProps {
  room: FloorMapShape;
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

// Find openings (doors/windows) on a wall
const findOpeningsOnWall = (wall: FloorMapShape, allShapes: FloorMapShape[]): FloorMapShape[] => {
  const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };

  return allShapes.filter(shape => {
    if (!['door_line', 'window_line', 'sliding_door_line'].includes(shape.type)) return false;

    const openingCoords = shape.coordinates as { x1: number; y1: number; x2: number; y2: number };

    const wallDx = wallCoords.x2 - wallCoords.x1;
    const wallDy = wallCoords.y2 - wallCoords.y1;
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    const openingMidX = (openingCoords.x1 + openingCoords.x2) / 2;
    const openingMidY = (openingCoords.y1 + openingCoords.y2) / 2;

    const t = Math.max(0, Math.min(1,
      ((openingMidX - wallCoords.x1) * wallDx + (openingMidY - wallCoords.y1) * wallDy) / (wallLength * wallLength)
    ));

    const closestX = wallCoords.x1 + t * wallDx;
    const closestY = wallCoords.y1 + t * wallDy;

    const distance = Math.sqrt(
      Math.pow(openingMidX - closestX, 2) + Math.pow(openingMidY - closestY, 2)
    );

    return distance < 50;
  });
};

// Direction colors
const directionColors: Record<WallDirection, string> = {
  north: '#3b82f6', // Blue
  east: '#10b981',  // Green
  south: '#f59e0b', // Amber
  west: '#8b5cf6',  // Purple
};

export const RoomElevationView: React.FC<RoomElevationViewProps> = ({
  room,
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
  const [currentWallIndex, setCurrentWallIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Find walls for this room
  const roomWalls = useMemo(() => {
    const foundWalls = findWallsForRoom(room, shapes, 100);
    if (foundWalls.length > 0) return foundWalls;
    // Fallback to virtual walls if no real walls found
    return createVirtualWallsFromRoom(room);
  }, [room, shapes]);

  const currentRoomWall = roomWalls[currentWallIndex];

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight - 80, // Account for navigation header
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Navigation
  const goToPreviousWall = useCallback(() => {
    if (roomWalls.length === 0) return;
    setCurrentWallIndex((prev) => (prev - 1 + roomWalls.length) % roomWalls.length);
    setPanX(0);
    setPanY(0);
  }, [roomWalls.length]);

  const goToNextWall = useCallback(() => {
    if (roomWalls.length === 0) return;
    setCurrentWallIndex((prev) => (prev + 1) % roomWalls.length);
    setPanX(0);
    setPanY(0);
  }, [roomWalls.length]);

  const goToWall = useCallback((index: number) => {
    setCurrentWallIndex(index);
    setPanX(0);
    setPanY(0);
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

  // Handle wheel for zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newZoom = e.evt.deltaY > 0 ? zoom / scaleBy : zoom * scaleBy;
    setZoom(Math.max(0.3, Math.min(3, newZoom)));
  }, [zoom]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsSwiping(false);
      setSwipeOffset(0);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;

    // Check if this is a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      setIsSwiping(true);
      setSwipeOffset(deltaX);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (isSwiping && Math.abs(swipeOffset) > 100) {
      // Complete the swipe
      if (swipeOffset > 0) {
        goToPreviousWall();
      } else {
        goToNextWall();
      }
    }
    setTouchStart(null);
    setIsSwiping(false);
    setSwipeOffset(0);
  }, [isSwiping, swipeOffset, goToPreviousWall, goToNextWall]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousWall();
      } else if (e.key === 'ArrowRight') {
        goToNextWall();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousWall, goToNextWall, onClose]);

  // Calculate wall visualization
  const wallVisualization = useMemo(() => {
    if (!currentRoomWall) return null;

    const wall = currentRoomWall.wall;
    const wallCoords = wall.coordinates as { x1: number; y1: number; x2: number; y2: number };

    // Calculate wall dimensions in mm
    const wallLengthMM = currentRoomWall.length / pixelsPerMm;
    const wallHeightMM = wall.heightMM || 2400;

    // Calculate scale to fit wall in canvas
    const padding = 100;
    const availableWidth = dimensions.width - padding * 2;
    const availableHeight = dimensions.height - padding * 2;

    const scaleX = availableWidth / wallLengthMM;
    const scaleY = availableHeight / wallHeightMM;
    const effectiveScale = Math.min(scaleX, scaleY) * 0.8; // 80% to leave room for labels

    // Wall position
    const wallWidth = wallLengthMM * effectiveScale;
    const wallHeight = wallHeightMM * effectiveScale;
    const wallX = (dimensions.width - wallWidth) / 2;
    const wallY = (dimensions.height - wallHeight) / 2 + 20; // Offset down for header

    // Find openings on this wall
    const openings = findOpeningsOnWall(wall, shapes);

    return {
      wallX,
      wallY,
      wallWidth,
      wallHeight,
      wallLengthMM,
      wallHeightMM,
      effectiveScale,
      openings,
    };
  }, [currentRoomWall, dimensions, shapes, pixelsPerMm]);

  if (roomWalls.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('roomElevation.noWallsFound', 'No walls found')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('roomElevation.drawWallsFirst', 'Draw walls around this room to see the elevation view.')}
          </p>
          <Button onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-[200] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">
              {room.name || t('roomElevation.room', 'Room')} - {t('roomElevation.elevationView', 'Elevation View')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('roomElevation.swipeHint', 'Swipe or use arrows to navigate walls')}
            </p>
          </div>
        </div>

        {/* Direction indicator */}
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-gray-600" />
          <Badge
            style={{ backgroundColor: currentRoomWall ? directionColors[currentRoomWall.direction] : '#888' }}
            className="text-white"
          >
            {getDirectionIcon(currentRoomWall?.direction || 'north')}{' '}
            {currentRoomWall ? getDirectionLabel(currentRoomWall.direction, (key) => t(key)) || t(`directions.${currentRoomWall.direction}`, currentRoomWall.direction) : ''}
          </Badge>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
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

      {/* Wall direction tabs */}
      <div className="bg-white border-b flex justify-center gap-2 py-2 px-4">
        {roomWalls.map((rw, index) => (
          <Button
            key={rw.wall.id}
            variant={index === currentWallIndex ? 'default' : 'outline'}
            size="sm"
            onClick={() => goToWall(index)}
            style={{
              backgroundColor: index === currentWallIndex ? directionColors[rw.direction] : undefined,
              borderColor: directionColors[rw.direction],
              color: index === currentWallIndex ? 'white' : directionColors[rw.direction],
            }}
          >
            {getDirectionIcon(rw.direction)} {t(`directions.${rw.direction}`, rw.direction)}
          </Button>
        ))}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-white/80 hover:bg-white shadow-lg"
          onClick={goToPreviousWall}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-white/80 hover:bg-white shadow-lg"
          onClick={goToNextWall}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>

        {/* Swipe indicator */}
        {isSwiping && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{
              transform: `translateX(${swipeOffset * 0.3}px)`,
              opacity: Math.min(Math.abs(swipeOffset) / 100, 1),
            }}
          >
            <div className={cn(
              "bg-white/90 rounded-full px-6 py-3 shadow-lg",
              swipeOffset > 0 ? "text-blue-600" : "text-blue-600"
            )}>
              {swipeOffset > 0
                ? `← ${t('roomElevation.previousWall', 'Previous')}`
                : `${t('roomElevation.nextWall', 'Next')} →`
              }
            </div>
          </div>
        )}

        {/* Konva Stage */}
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onWheel={handleWheel}
          scaleX={zoom}
          scaleY={zoom}
          x={panX}
          y={panY}
          draggable={!isSwiping}
          onDragEnd={(e) => {
            setPanX(e.target.x());
            setPanY(e.target.y());
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

            {wallVisualization && currentRoomWall && (
              <>
                {/* Floor line */}
                <Line
                  points={[
                    wallVisualization.wallX - 50,
                    wallVisualization.wallY + wallVisualization.wallHeight,
                    wallVisualization.wallX + wallVisualization.wallWidth + 50,
                    wallVisualization.wallY + wallVisualization.wallHeight,
                  ]}
                  stroke="#374151"
                  strokeWidth={3}
                />
                <KonvaText
                  x={wallVisualization.wallX + wallVisualization.wallWidth + 60}
                  y={wallVisualization.wallY + wallVisualization.wallHeight - 8}
                  text={t('roomElevation.floor', 'Floor')}
                  fontSize={12}
                  fill="#6b7280"
                />

                {/* Wall rectangle */}
                <Rect
                  x={wallVisualization.wallX}
                  y={wallVisualization.wallY}
                  width={wallVisualization.wallWidth}
                  height={wallVisualization.wallHeight}
                  fill="#e5e7eb"
                  stroke={directionColors[currentRoomWall.direction]}
                  strokeWidth={3}
                />

                {/* Wall pattern (brick-like) */}
                {Array.from({ length: Math.ceil(wallVisualization.wallHeight / 30) }).map((_, rowIndex) => (
                  <Line
                    key={`row-${rowIndex}`}
                    points={[
                      wallVisualization.wallX,
                      wallVisualization.wallY + rowIndex * 30,
                      wallVisualization.wallX + wallVisualization.wallWidth,
                      wallVisualization.wallY + rowIndex * 30,
                    ]}
                    stroke="#d1d5db"
                    strokeWidth={0.5}
                    dash={[5, 10]}
                  />
                ))}

                {/* Dimension labels */}
                {/* Width label */}
                <Group>
                  <Line
                    points={[
                      wallVisualization.wallX,
                      wallVisualization.wallY - 40,
                      wallVisualization.wallX + wallVisualization.wallWidth,
                      wallVisualization.wallY - 40,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <Line
                    points={[
                      wallVisualization.wallX,
                      wallVisualization.wallY - 45,
                      wallVisualization.wallX,
                      wallVisualization.wallY - 35,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <Line
                    points={[
                      wallVisualization.wallX + wallVisualization.wallWidth,
                      wallVisualization.wallY - 45,
                      wallVisualization.wallX + wallVisualization.wallWidth,
                      wallVisualization.wallY - 35,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <KonvaText
                    x={wallVisualization.wallX + wallVisualization.wallWidth / 2 - 30}
                    y={wallVisualization.wallY - 60}
                    text={formatDim(wallVisualization.wallLengthMM)}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#1f2937"
                  />
                </Group>

                {/* Height label */}
                <Group>
                  <Line
                    points={[
                      wallVisualization.wallX - 40,
                      wallVisualization.wallY,
                      wallVisualization.wallX - 40,
                      wallVisualization.wallY + wallVisualization.wallHeight,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <Line
                    points={[
                      wallVisualization.wallX - 45,
                      wallVisualization.wallY,
                      wallVisualization.wallX - 35,
                      wallVisualization.wallY,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <Line
                    points={[
                      wallVisualization.wallX - 45,
                      wallVisualization.wallY + wallVisualization.wallHeight,
                      wallVisualization.wallX - 35,
                      wallVisualization.wallY + wallVisualization.wallHeight,
                    ]}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                  <KonvaText
                    x={wallVisualization.wallX - 80}
                    y={wallVisualization.wallY + wallVisualization.wallHeight / 2 - 7}
                    text={formatDim(wallVisualization.wallHeightMM)}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#1f2937"
                    rotation={-90}
                  />
                </Group>

                {/* Openings (doors/windows) */}
                {wallVisualization.openings.map((opening, index) => {
                  const openingCoords = opening.coordinates as { x1: number; y1: number; x2: number; y2: number };
                  const wallCoords = currentRoomWall.wall.coordinates as { x1: number; y1: number; x2: number; y2: number };

                  // Calculate opening position along wall
                  const wallDx = wallCoords.x2 - wallCoords.x1;
                  const wallDy = wallCoords.y2 - wallCoords.y1;
                  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
                  const openingMidX = (openingCoords.x1 + openingCoords.x2) / 2;
                  const openingMidY = (openingCoords.y1 + openingCoords.y2) / 2;
                  const t = ((openingMidX - wallCoords.x1) * wallDx + (openingMidY - wallCoords.y1) * wallDy) / (wallLength * wallLength);

                  // Opening dimensions
                  const openingDx = openingCoords.x2 - openingCoords.x1;
                  const openingDy = openingCoords.y2 - openingCoords.y1;
                  const openingWidthMM = Math.sqrt(openingDx * openingDx + openingDy * openingDy) / pixelsPerMm;
                  const openingWidth = openingWidthMM * wallVisualization.effectiveScale;

                  // Opening height based on type
                  const isWindow = opening.type === 'window_line';
                  const openingHeightMM = isWindow ? 1200 : 2100; // Windows 1.2m, doors 2.1m
                  const openingHeight = openingHeightMM * wallVisualization.effectiveScale;

                  // Opening position
                  const openingX = wallVisualization.wallX + t * wallVisualization.wallWidth - openingWidth / 2;
                  const openingFromFloor = isWindow ? 900 : 0; // Windows start at 90cm from floor
                  const openingY = wallVisualization.wallY + wallVisualization.wallHeight - openingHeight - (openingFromFloor * wallVisualization.effectiveScale);

                  const openingColor = isWindow ? '#0284c7' : '#8b5cf6';
                  const openingFill = isWindow ? '#bae6fd' : '#e9d5ff';

                  return (
                    <Group key={`opening-${index}`}>
                      <Rect
                        x={openingX}
                        y={openingY}
                        width={openingWidth}
                        height={openingHeight}
                        fill={openingFill}
                        stroke={openingColor}
                        strokeWidth={2}
                      />
                      {/* Opening label */}
                      <KonvaText
                        x={openingX + openingWidth / 2 - 20}
                        y={openingY + openingHeight / 2 - 6}
                        text={isWindow ? t('roomElevation.window', 'Window') : t('roomElevation.door', 'Door')}
                        fontSize={10}
                        fill={openingColor}
                      />
                      {/* Opening dimension */}
                      <KonvaText
                        x={openingX + openingWidth / 2 - 15}
                        y={openingY + openingHeight + 5}
                        text={formatDim(openingWidthMM)}
                        fontSize={10}
                        fill="#6b7280"
                      />
                    </Group>
                  );
                })}

                {/* Direction label */}
                <KonvaText
                  x={wallVisualization.wallX + wallVisualization.wallWidth / 2 - 50}
                  y={wallVisualization.wallY + wallVisualization.wallHeight + 30}
                  text={`${getDirectionIcon(currentRoomWall.direction)} ${t(`directions.${currentRoomWall.direction}`, currentRoomWall.direction).toUpperCase()} ${t('roomElevation.wall', 'Wall')}`}
                  fontSize={16}
                  fontStyle="bold"
                  fill={directionColors[currentRoomWall.direction]}
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Page indicator */}
      <div className="bg-white border-t py-3 flex justify-center gap-2">
        {roomWalls.map((rw, index) => (
          <button
            key={rw.wall.id}
            onClick={() => goToWall(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              index === currentWallIndex
                ? "scale-125"
                : "bg-gray-300 hover:bg-gray-400"
            )}
            style={{
              backgroundColor: index === currentWallIndex ? directionColors[rw.direction] : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
};
