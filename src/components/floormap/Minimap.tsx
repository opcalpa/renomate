/**
 * Minimap Component - Floating overview map
 * Industry standard (CAD/Figma) - shows entire canvas with current view indicator
 */

import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect, Line } from "react-konva";
import { Button } from "@/components/ui/button";
import { Map, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloorMapShape } from "./types";

interface MinimapProps {
  shapes: FloorMapShape[];
  canvasWidth: number;
  canvasHeight: number;
  viewState: {
    zoom: number;
    panX: number;
    panY: number;
  };
  onViewportClick: (x: number, y: number) => void;
  gridWidth: number;
  gridHeight: number;
  marginOffset: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  shapes,
  canvasWidth,
  canvasHeight,
  viewState,
  onViewportClick,
  gridWidth,
  gridHeight,
  marginOffset,
}) => {
  // CHANGED: Start closed by default, only one size (no expand/collapse)
  const [isOpen, setIsOpen] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Minimap dimensions - only one size (the larger one)
  const MINIMAP_WIDTH = 280;
  const MINIMAP_HEIGHT = 280;
  const ZOOM_PREVIEW_SIZE = 120; // Zoomed preview size

  // Calculate scale to fit canvas in minimap
  const scale = Math.min(
    MINIMAP_WIDTH / canvasWidth,
    MINIMAP_HEIGHT / canvasHeight
  );

  // Calculate viewport rectangle in minimap coordinates
  const viewportWidth = (window.innerWidth / viewState.zoom) * scale;
  const viewportHeight = (window.innerHeight / viewState.zoom) * scale;
  const viewportX = (-viewState.panX / viewState.zoom) * scale;
  const viewportY = (-viewState.panY / viewState.zoom) * scale;

  // Handle click on minimap to center view
  const handleMinimapClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (pointerPos) {
      // Convert minimap coordinates to canvas coordinates
      const canvasX = pointerPos.x / scale;
      const canvasY = pointerPos.y / scale;
      
      onViewportClick(canvasX, canvasY);
    }
  };

  // Handle hover for zoom preview
  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    if (pointerPos) {
      setHoverPosition({ x: pointerPos.x, y: pointerPos.y });
    }
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // Show map icon button when closed
  if (!isOpen) {
    return (
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "bg-white border-2 border-gray-300 rounded-lg shadow-lg",
          "transition-all duration-300"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="w-12 h-12"
          title="Visa översiktskarta"
        >
          <Map className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={minimapRef}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "bg-white border-2 border-gray-300 rounded-lg shadow-2xl",
        "transition-all duration-300",
        "flex flex-col"
      )}
      style={{
        width: MINIMAP_WIDTH + 20,
        height: MINIMAP_HEIGHT + 60,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-xs font-semibold text-gray-700">Översiktskarta</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="w-6 h-6"
          title="Stäng"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Minimap Canvas */}
      <div className="p-2 relative bg-gray-100">
        <div
          className="border border-gray-300 bg-white overflow-hidden relative"
          style={{
            width: MINIMAP_WIDTH,
            height: MINIMAP_HEIGHT,
            cursor: 'crosshair',
          }}
        >
          <Stage
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            onClick={handleMinimapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <Layer>
              {/* Canvas background */}
              <Rect
                x={0}
                y={0}
                width={canvasWidth * scale}
                height={canvasHeight * scale}
                fill="#f8f9fa"
              />

              {/* Grid area indicator */}
              <Rect
                x={marginOffset * scale}
                y={marginOffset * scale}
                width={gridWidth * scale}
                height={gridHeight * scale}
                stroke="#d1d5db"
                strokeWidth={1}
                dash={[4, 4]}
              />

              {/* Simplified shapes */}
              {shapes.map((shape) => {
                if (shape.type === 'wall' || shape.type === 'line') {
                  const coords = shape.coordinates as any;
                  return (
                    <Line
                      key={shape.id}
                      points={[
                        coords.x1 * scale,
                        coords.y1 * scale,
                        coords.x2 * scale,
                        coords.y2 * scale,
                      ]}
                      stroke="#374151"
                      strokeWidth={2}
                    />
                  );
                } else if (shape.type === 'room') {
                  const coords = shape.coordinates as any;
                  const points: number[] = [];
                  coords.points.forEach((p: { x: number; y: number }) => {
                    points.push(p.x * scale, p.y * scale);
                  });
                  return (
                    <Line
                      key={shape.id}
                      points={points}
                      closed
                      fill={shape.color || 'rgba(59, 130, 246, 0.2)'}
                      stroke="#2563eb"
                      strokeWidth={1}
                    />
                  );
                } else if (shape.type === 'rectangle' || shape.type === 'door') {
                  const coords = shape.coordinates as any;
                  return (
                    <Rect
                      key={shape.id}
                      x={(coords.left || coords.x) * scale}
                      y={(coords.top || coords.y) * scale}
                      width={(coords.width || 50) * scale}
                      height={(coords.height || 50) * scale}
                      fill={shape.color || '#8B4513'}
                      stroke="#374151"
                      strokeWidth={1}
                    />
                  );
                }
                return null;
              })}

              {/* Current viewport indicator */}
              <Rect
                x={viewportX}
                y={viewportY}
                width={viewportWidth}
                height={viewportHeight}
                stroke="#ef4444"
                strokeWidth={2}
                fill="rgba(239, 68, 68, 0.1)"
                listening={false}
              />
            </Layer>
          </Stage>

          {/* Zoom Preview on Hover */}
          {hoverPosition && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 bg-white rounded-lg shadow-xl overflow-hidden"
              style={{
                width: ZOOM_PREVIEW_SIZE,
                height: ZOOM_PREVIEW_SIZE,
                left: Math.min(
                  hoverPosition.x + 10,
                  MINIMAP_WIDTH - ZOOM_PREVIEW_SIZE - 10
                ),
                top: Math.max(10, hoverPosition.y - ZOOM_PREVIEW_SIZE - 10),
              }}
            >
              <div className="absolute top-0 left-0 w-full bg-blue-500 text-white text-[10px] px-2 py-0.5 font-semibold">
                Zoom Preview
              </div>
              <Stage width={ZOOM_PREVIEW_SIZE} height={ZOOM_PREVIEW_SIZE}>
                <Layer>
                  {/* Zoomed view of area around hover */}
                  <Rect
                    x={0}
                    y={0}
                    width={ZOOM_PREVIEW_SIZE}
                    height={ZOOM_PREVIEW_SIZE}
                    fill="#f8f9fa"
                  />
                  
                  {shapes.map((shape) => {
                    const zoomScale = scale * 3; // 3x zoom
                    const offsetX = -hoverPosition.x * 3 + ZOOM_PREVIEW_SIZE / 2;
                    const offsetY = -hoverPosition.y * 3 + ZOOM_PREVIEW_SIZE / 2;

                    if (shape.type === 'wall' || shape.type === 'line') {
                      const coords = shape.coordinates as any;
                      return (
                        <Line
                          key={shape.id}
                          points={[
                            coords.x1 * zoomScale + offsetX,
                            coords.y1 * zoomScale + offsetY,
                            coords.x2 * zoomScale + offsetX,
                            coords.y2 * zoomScale + offsetY,
                          ]}
                          stroke="#374151"
                          strokeWidth={3}
                        />
                      );
                    } else if (shape.type === 'room') {
                      const coords = shape.coordinates as any;
                      const points: number[] = [];
                      coords.points.forEach((p: { x: number; y: number }) => {
                        points.push(
                          p.x * zoomScale + offsetX,
                          p.y * zoomScale + offsetY
                        );
                      });
                      return (
                        <Line
                          key={shape.id}
                          points={points}
                          closed
                          fill={shape.color || 'rgba(59, 130, 246, 0.2)'}
                          stroke="#2563eb"
                          strokeWidth={2}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Crosshair at center */}
                  <Line
                    points={[
                      ZOOM_PREVIEW_SIZE / 2 - 10,
                      ZOOM_PREVIEW_SIZE / 2,
                      ZOOM_PREVIEW_SIZE / 2 + 10,
                      ZOOM_PREVIEW_SIZE / 2,
                    ]}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    points={[
                      ZOOM_PREVIEW_SIZE / 2,
                      ZOOM_PREVIEW_SIZE / 2 - 10,
                      ZOOM_PREVIEW_SIZE / 2,
                      ZOOM_PREVIEW_SIZE / 2 + 10,
                    ]}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-2 px-1">
          <div className="text-[10px] text-gray-600 grid grid-cols-2 gap-1">
            <span>Zoom: {Math.round(viewState.zoom * 100)}%</span>
            <span className="text-right">
              {Math.round(canvasWidth / 100)}×{Math.round(canvasHeight / 100)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
