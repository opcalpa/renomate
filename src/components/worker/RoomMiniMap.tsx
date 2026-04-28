/**
 * RoomMiniMap — renders a simplified floor plan SVG with one room highlighted.
 * Uses raw polygon points from floor_map_shapes (no Konva dependency).
 * Lightweight for mobile worker view.
 *
 * Three rendering modes (automatic):
 * 1. Background image + room polygons → image with colored room overlays
 * 2. Room polygons only → SVG minimap with highlighted room
 * 3. No data → renders nothing
 */

interface FloorPlanShape {
  id: string;
  roomId: string | null;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeColor: string;
  name: string | null;
}

interface FloorPlanImage {
  url: string;
  x: number;
  y: number;
}

interface RoomMiniMapProps {
  shapes: FloorPlanShape[];
  highlightRoomId: string | null;
  /** Background image from canvas (uploaded floor plan / architect drawing) */
  backgroundImage?: FloorPlanImage | null;
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

export function RoomMiniMap({ shapes, highlightRoomId, backgroundImage, className }: RoomMiniMapProps) {
  const validShapes = (shapes || []).filter(
    (s) => Array.isArray(s.points) && s.points.length >= 3
  );

  // Nothing to render
  if (validShapes.length === 0 && !backgroundImage?.url) return null;

  // Calculate bounding box of all shapes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const shape of validShapes) {
    for (const p of shape.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  // If only background image with no room shapes, use image position as bounds
  if (validShapes.length === 0 && backgroundImage) {
    minX = backgroundImage.x;
    minY = backgroundImage.y;
    maxX = backgroundImage.x + 10000; // Estimate — image will scale to fit
    maxY = backgroundImage.y + 7000;
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const padding = Math.max(width, height) * 0.1;
  const vbX = minX - padding;
  const vbY = minY - padding;
  const vbW = width + padding * 2;
  const vbH = height + padding * 2;

  const strokeScale = Math.max(vbW, vbH);

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      className={className}
      style={{ width: "100%", maxHeight: 200 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background image (uploaded floor plan / architect drawing) */}
      {backgroundImage?.url && (
        <image
          href={backgroundImage.url}
          x={backgroundImage.x}
          y={backgroundImage.y}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          opacity={0.4}
        />
      )}

      {/* Room polygons as overlays */}
      {validShapes.map((shape) => {
        const isHighlighted = shape.roomId === highlightRoomId;
        return (
          <g key={shape.id}>
            <path
              d={pointsToSvgPath(shape.points)}
              fill={
                isHighlighted
                  ? "rgba(34, 197, 94, 0.3)"
                  : backgroundImage?.url
                    ? "rgba(229, 231, 235, 0.15)"
                    : "rgba(229, 231, 235, 0.4)"
              }
              stroke={isHighlighted ? "#16a34a" : "#d1d5db"}
              strokeWidth={isHighlighted ? strokeScale * 0.005 : strokeScale * 0.003}
            />
            {shape.name && (
              <text
                x={findCenter(shape.points).x}
                y={findCenter(shape.points).y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={strokeScale * 0.035}
                fontWeight={isHighlighted ? 600 : 400}
                fill={isHighlighted ? "#15803d" : "#9ca3af"}
                paintOrder="stroke"
                stroke={backgroundImage?.url ? "rgba(255,255,255,0.8)" : "none"}
                strokeWidth={backgroundImage?.url ? strokeScale * 0.008 : 0}
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
