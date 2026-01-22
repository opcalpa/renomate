import { memo } from "react";
import { convertFromMM } from "./utils/units";
import { Unit } from "./types";

interface DimensionLabelProps {
  lengthMM: number;
  x: number;
  y: number;
  angle?: number;
  unit: Unit;
  visible: boolean;
}

export const DimensionLabel = memo(({ lengthMM, x, y, angle = 0, unit, visible }: DimensionLabelProps) => {
  if (!visible) return null;

  const converted = convertFromMM(lengthMM, unit);
  const displayValue = converted.toFixed(2);
  const unitLabel = unit;

  return (
    <div
      className="absolute pointer-events-none bg-black/80 text-white px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
      style={{
        left: `${x}px`,
        top: `${y - 25}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center',
      }}
    >
      {displayValue} {unitLabel}
    </div>
  );
});

DimensionLabel.displayName = "DimensionLabel";
