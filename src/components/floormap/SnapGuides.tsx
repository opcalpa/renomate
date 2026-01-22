import { FloorMapShape } from "./types";

interface SnapGuidesProps {
  shapes: FloorMapShape[];
  activeShape: FloorMapShape | null;
  zoom: number;
  panX: number;
  panY: number;
}

export const SnapGuides = ({ shapes, activeShape, zoom, panX, panY }: SnapGuidesProps) => {
  if (!activeShape) return null;

  const guides: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const threshold = 5 / zoom; // 5px threshold adjusted for zoom

  // Get active shape bounds
  const getShapeBounds = (shape: FloorMapShape) => {
    if (shape.type === 'line' || shape.type === 'wall') {
      const coords = shape.coordinates as any;
      return {
        left: Math.min(coords.x1, coords.x2),
        right: Math.max(coords.x1, coords.x2),
        top: Math.min(coords.y1, coords.y2),
        bottom: Math.max(coords.y1, coords.y2),
      };
    } else if (shape.type === 'rectangle') {
      const coords = shape.coordinates as any;
      return {
        left: coords.left,
        right: coords.left + coords.width,
        top: coords.top,
        bottom: coords.top + coords.height,
      };
    }
    return null;
  };

  const activeBounds = getShapeBounds(activeShape);
  if (!activeBounds) return null;

  // Check alignment with other shapes
  shapes.forEach((shape) => {
    if (shape.id === activeShape.id) return;
    const bounds = getShapeBounds(shape);
    if (!bounds) return;

    // Vertical alignment (left edges)
    if (Math.abs(activeBounds.left - bounds.left) < threshold) {
      guides.push({
        x1: bounds.left,
        y1: Math.min(activeBounds.top, bounds.top) - 50,
        x2: bounds.left,
        y2: Math.max(activeBounds.bottom, bounds.bottom) + 50,
      });
    }

    // Vertical alignment (right edges)
    if (Math.abs(activeBounds.right - bounds.right) < threshold) {
      guides.push({
        x1: bounds.right,
        y1: Math.min(activeBounds.top, bounds.top) - 50,
        x2: bounds.right,
        y2: Math.max(activeBounds.bottom, bounds.bottom) + 50,
      });
    }

    // Horizontal alignment (top edges)
    if (Math.abs(activeBounds.top - bounds.top) < threshold) {
      guides.push({
        x1: Math.min(activeBounds.left, bounds.left) - 50,
        y1: bounds.top,
        x2: Math.max(activeBounds.right, bounds.right) + 50,
        y2: bounds.top,
      });
    }

    // Horizontal alignment (bottom edges)
    if (Math.abs(activeBounds.bottom - bounds.bottom) < threshold) {
      guides.push({
        x1: Math.min(activeBounds.left, bounds.left) - 50,
        y1: bounds.bottom,
        x2: Math.max(activeBounds.right, bounds.right) + 50,
        y2: bounds.bottom,
      });
    }
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {guides.map((guide, index) => (
        <line
          key={index}
          x1={guide.x1}
          y1={guide.y1}
          x2={guide.x2}
          y2={guide.y2}
          stroke="hsl(var(--primary))"
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom} ${2 / zoom}`}
          opacity={0.6}
        />
      ))}
    </svg>
  );
};
