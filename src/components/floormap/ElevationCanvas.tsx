import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Line, Rect, FabricObject } from "fabric";
import { useFloorMapStore } from "./store";
import { FloorMapShape, LineCoordinates, RectangleCoordinates } from "./types";

const DEFAULT_WALL_HEIGHT_MM = 2400;
const DEFAULT_OBJECT_HEIGHT_MM = 1000;

export const ElevationCanvas = () => {
  const { shapes, viewState, selectedShapeId, currentPlanId } = useFloorMapStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const shapeMapRef = useRef<Map<string, FabricObject>>(new Map());

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;

    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // Render shapes in elevation view
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas || !currentPlanId) return;

    // Clear existing shapes
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    shapeMapRef.current.clear();

    const groundY = fabricCanvas.height ? fabricCanvas.height / 2 + 200 : 500;

    // Draw ground line
    const groundLine = new Line([0, groundY, fabricCanvas.width || 800, groundY], {
      stroke: "#d0d0d0",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    fabricCanvas.add(groundLine);

    // Render each shape in elevation
    let xOffset = 100;
    
    shapes
      .filter(s => s.planId === currentPlanId)
      .forEach((shape) => {
        const isSelected = selectedShapeId === shape.id;
        
        if (shape.type === 'line' || shape.type === 'wall') {
          const coords = shape.coordinates as LineCoordinates;
          const length = Math.sqrt(
            Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2)
          );
          
          const wallHeightMM = shape.heightMM || DEFAULT_WALL_HEIGHT_MM;
          const wallHeight = (wallHeightMM / 10);
          
          // Vertical wall
          const wallLine = new Line([xOffset, groundY, xOffset, groundY - wallHeight], {
            stroke: isSelected ? "#3b82f6" : "#000000",
            strokeWidth: isSelected ? 4 : 2,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(wallLine);
          shapeMapRef.current.set(shape.id, wallLine);
          
          // Wall base
          const baseLength = length / 3;
          const baseLine = new Line([xOffset, groundY, xOffset + baseLength, groundY], {
            stroke: isSelected ? "#3b82f6" : "#6b7280",
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(baseLine);
          
          xOffset += baseLength + 50;
        } else if (shape.type === 'rectangle') {
          const coords = shape.coordinates as RectangleCoordinates;
          const objHeightMM = shape.heightMM || DEFAULT_OBJECT_HEIGHT_MM;
          const objHeight = (objHeightMM / 10);
          const objWidth = coords.width / 3;
          
          // Rectangle in elevation (side view)
          const rect = new Rect({
            left: xOffset,
            top: groundY - objHeight,
            width: objWidth,
            height: objHeight,
            fill: "transparent",
            stroke: isSelected ? "#3b82f6" : "#000000",
            strokeWidth: isSelected ? 3 : 2,
            selectable: false,
            evented: false,
          });
          fabricCanvas.add(rect);
          shapeMapRef.current.set(shape.id, rect);
          
          xOffset += objWidth + 50;
        }
      });

    fabricCanvas.renderAll();
  }, [shapes, selectedShapeId, currentPlanId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium z-10 backdrop-blur-sm border border-primary/20">
        Elevation View - Side view showing heights
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};
