import { memo, useMemo } from "react";
import { FloorMapShape, LineCoordinates, RectangleCoordinates, CircleCoordinates } from "./types";
import { convertFromMM } from "./utils/units";
import { Unit } from "./types";

interface ObjectDimensionsProps {
  shape: FloorMapShape;
  unit: Unit;
  visible: boolean;
}

export const ObjectDimensions = memo(({ shape, unit, visible }: ObjectDimensionsProps) => {
  if (!visible) return null;

  const dimensions = useMemo(() => {
    if (shape.type === 'line' || shape.type === 'wall') {
      const coords = shape.coordinates as LineCoordinates;
      const lengthInPixels = Math.sqrt(
        Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2)
      );
      // At 1:100 scale, 100 pixels = 1 meter = 1000mm, so pixels * 10 = mm
      const lengthMM = lengthInPixels * 10;
      const converted = convertFromMM(lengthMM, unit);
      const midX = (coords.x1 + coords.x2) / 2;
      const midY = (coords.y1 + coords.y2) / 2;
      const angle = Math.atan2(coords.y2 - coords.y1, coords.x2 - coords.x1) * (180 / Math.PI);

      return {
        x: midX,
        y: midY,
        angle,
        text: `${converted.toFixed(2)} ${unit}`,
      };
    } else if (shape.type === 'rectangle') {
      const coords = shape.coordinates as RectangleCoordinates;
      // At 1:100 scale, pixels * 10 = mm
      const widthMM = coords.width * 10;
      const heightMM = coords.height * 10;
      const widthConverted = convertFromMM(widthMM, unit);
      const heightConverted = convertFromMM(heightMM, unit);
      
      return {
        x: coords.left + coords.width / 2,
        y: coords.top - 20,
        angle: 0,
        text: `${widthConverted.toFixed(2)} × ${heightConverted.toFixed(2)} ${unit}`,
      };
    } else if (shape.type === 'circle') {
      const coords = shape.coordinates as CircleCoordinates;
      // At 1:100 scale, pixels * 10 = mm
      const radiusMM = coords.radius * 10;
      const radiusConverted = convertFromMM(radiusMM, unit);
      
      return {
        x: coords.cx,
        y: coords.cy - coords.radius - 20,
        angle: 0,
        text: `r: ${radiusConverted.toFixed(2)} ${unit}`,
      };
    }

    return null;
  }, [shape, unit]);

  if (!dimensions) return null;

  return (
    <div
      className="absolute pointer-events-none bg-black/90 text-white px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap shadow-lg"
      style={{
        left: `${dimensions.x}px`,
        top: `${dimensions.y}px`,
        transform: `translate(-50%, -100%) rotate(${dimensions.angle}deg)`,
        transformOrigin: 'center bottom',
      }}
    >
      {dimensions.text}
    </div>
  );
});

ObjectDimensions.displayName = "ObjectDimensions";
