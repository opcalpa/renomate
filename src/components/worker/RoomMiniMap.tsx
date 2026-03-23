/**
 * RoomMiniMap — renders a simplified floor plan SVG with one room highlighted.
 * Uses raw polygon points from floor_map_shapes (no Konva dependency).
 * Lightweight for mobile worker view.
 */

interface FloorPlanShape {
  id: string;
  roomId: string | null;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeColor: string;
  name: string | null;
}

interface RoomMiniMapProps {
  shapes: FloorPlanShape[];
  highlightRoomId: string | null;
  className?: string;
}

function pointsToSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
}

function findCenter(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  return { x, y };
}

export function RoomMiniMap({ shapes, highlightRoomId, className }: RoomMiniMapProps) {
  if (!shapes || shapes.length === 0) return null;

  // Calculate bounding box of all shapes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const shape of shapes) {
    for (const p of shape.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  // Add padding (10% on each side)
  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height) * 0.1;
  const vbX = minX - padding;
  const vbY = minY - padding;
  const vbW = width + padding * 2;
  const vbH = height + padding * 2;

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className={className}
      style={{ width: "100%", maxHeight: 200 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* All rooms as outlines first (background) */}
      {shapes.map((shape) => {
        const isHighlighted = shape.roomId === highlightRoomId;
        return (
          <g key={shape.id}>
            <path
              d={pointsToSvgPath(shape.points)}
              fill={
                isHighlighted
                  ? "rgba(34, 197, 94, 0.25)"
                  : "rgba(229, 231, 235, 0.4)"
              }
              stroke={
                isHighlighted
                  ? "#16a34a"
                  : "#d1d5db"
              }
              strokeWidth={isHighlighted ? Math.max(vbW, vbH) * 0.005 : Math.max(vbW, vbH) * 0.003}
            />
            {/* Room name label */}
            {shape.name && (
              <text
                x={findCenter(shape.points).x}
                y={findCenter(shape.points).y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(vbW, vbH) * 0.035}
                fontWeight={isHighlighted ? 600 : 400}
                fill={isHighlighted ? "#15803d" : "#9ca3af"}
              >
                {shape.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
