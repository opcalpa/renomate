/**
 * TEMPLATE PREVIEW - Renders a miniature of template shapes
 *
 * Shows a small canvas preview of what the template looks like
 */

import { Stage, Layer, Line, Rect, Circle, Text as KonvaText } from 'react-konva';
import { Template } from './templateDefinitions';
import { FloorMapShape } from './types';

interface TemplatePreviewProps {
  template: Template;
  width?: number;
  height?: number;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  width = 80,
  height = 80,
}) => {
  // Calculate scale to fit template in preview area
  const padding = 8;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  // Ensure we have valid bounds
  const boundsWidth = template.bounds.width || 1;
  const boundsHeight = template.bounds.height || 1;

  const scaleX = availableWidth / boundsWidth;
  const scaleY = availableHeight / boundsHeight;

  // Use the smaller scale to fit, but cap at reasonable values
  const scale = Math.min(scaleX, scaleY, 1);

  // Calculate offset to center the preview
  const scaledWidth = boundsWidth * scale;
  const scaledHeight = boundsHeight * scale;
  const baseOffsetX = (width - scaledWidth) / 2;
  const baseOffsetY = (height - scaledHeight) / 2;

  // Offset to account for minX/minY (shapes may not start at 0,0)
  const offsetX = baseOffsetX - (template.bounds.minX * scale);
  const offsetY = baseOffsetY - (template.bounds.minY * scale);

  // Render shapes
  const renderShape = (shape: FloorMapShape, index: number) => {
    const key = `preview-shape-${index}`;
    const strokeWidth = Math.max(1, 1.5 / scale);
    const stroke = shape.strokeColor || '#374151';
    const fill = shape.color || 'transparent';
    const coords = shape.coordinates as any;

    // WALLS with x1,y1,x2,y2 (line format)
    if ((shape.type === 'wall' || shape.type === 'line') && coords.x1 !== undefined) {
      return (
        <Line
          key={key}
          points={[
            coords.x1 * scale + offsetX,
            coords.y1 * scale + offsetY,
            coords.x2 * scale + offsetX,
            coords.y2 * scale + offsetY,
          ]}
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
          lineCap="round"
          listening={false}
        />
      );
    }

    // WALLS with points array (polyline format)
    if (shape.type === 'wall' && coords.points) {
      const points = coords.points.flatMap((p: any) => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }

    // ROOMS/POLYGONS with points array
    if ((shape.type === 'room' || shape.type === 'polygon') && coords.points) {
      const points = coords.points.flatMap((p: any) => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="rgba(59, 130, 246, 0.1)"
          closed
          listening={false}
        />
      );
    }

    // FREEHAND with points array
    if (shape.type === 'freehand' && coords.points) {
      const points = coords.points.flatMap((p: any) => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={false}
        />
      );
    }

    // RECTANGLES with left,top,width,height
    if (shape.type === 'rectangle' && coords.left !== undefined) {
      return (
        <Rect
          key={key}
          x={coords.left * scale + offsetX}
          y={coords.top * scale + offsetY}
          width={(coords.width || 0) * scale}
          height={(coords.height || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
          listening={false}
        />
      );
    }

    // RECTANGLES with x,y,width,height (alternative format)
    if (shape.type === 'rectangle' && coords.x !== undefined) {
      return (
        <Rect
          key={key}
          x={coords.x * scale + offsetX}
          y={coords.y * scale + offsetY}
          width={(coords.width || 0) * scale}
          height={(coords.height || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
          listening={false}
        />
      );
    }

    // CIRCLES with cx,cy,radius
    if (shape.type === 'circle' && coords.cx !== undefined) {
      return (
        <Circle
          key={key}
          x={coords.cx * scale + offsetX}
          y={coords.cy * scale + offsetY}
          radius={(coords.radius || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
          listening={false}
        />
      );
    }

    // CIRCLES with x,y,radius (alternative format)
    if (shape.type === 'circle' && coords.x !== undefined && coords.radius !== undefined) {
      return (
        <Circle
          key={key}
          x={coords.x * scale + offsetX}
          y={coords.y * scale + offsetY}
          radius={(coords.radius || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill={fill !== 'transparent' ? fill : undefined}
          listening={false}
        />
      );
    }

    // SYMBOLS with x,y,width,height
    if (shape.type === 'symbol' && coords.x !== undefined) {
      return (
        <Rect
          key={key}
          x={coords.x * scale + offsetX}
          y={coords.y * scale + offsetY}
          width={(coords.width || 20) * scale}
          height={(coords.height || 20) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="rgba(99, 102, 241, 0.2)"
          listening={false}
        />
      );
    }

    // TEXT
    if (shape.type === 'text' && coords.x !== undefined) {
      return (
        <KonvaText
          key={key}
          x={coords.x * scale + offsetX}
          y={coords.y * scale + offsetY}
          text={shape.text || 'T'}
          fontSize={Math.max(8, 12 * scale)}
          fill={stroke}
          listening={false}
        />
      );
    }

    // WINDOW_LINE, DOOR_LINE, SLIDING_DOOR_LINE with x1,y1,x2,y2
    if (['window_line', 'door_line', 'sliding_door_line'].includes(shape.type) && coords.x1 !== undefined) {
      const lineStroke = shape.type === 'window_line' ? '#3b82f6' :
                         shape.type === 'door_line' ? '#8b5cf6' : '#10b981';
      return (
        <Line
          key={key}
          points={[
            coords.x1 * scale + offsetX,
            coords.y1 * scale + offsetY,
            coords.x2 * scale + offsetX,
            coords.y2 * scale + offsetY,
          ]}
          stroke={lineStroke}
          strokeWidth={strokeWidth * 3}
          lineCap="round"
          listening={false}
        />
      );
    }

    // BEZIER curves
    if (shape.type === 'bezier' && coords.points) {
      const points = coords.points.flatMap((p: any) => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          tension={0.5}
          listening={false}
        />
      );
    }

    return null;
  };

  // Check if template has any shapes
  const hasShapes = template.shapes && template.shapes.length > 0;

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <Stage width={width} height={height}>
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#f9fafb"
            listening={false}
          />

          {/* Grid pattern for empty templates */}
          {!hasShapes && (
            <>
              <Line points={[width/3, 0, width/3, height]} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />
              <Line points={[2*width/3, 0, 2*width/3, height]} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />
              <Line points={[0, height/3, width, height/3]} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />
              <Line points={[0, 2*height/3, width, 2*height/3]} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />
              <KonvaText
                x={width/2 - 15}
                y={height/2 - 6}
                text="Tom"
                fontSize={10}
                fill="#9ca3af"
                listening={false}
              />
            </>
          )}

          {/* Shapes */}
          {hasShapes && template.shapes.map((shape, index) => renderShape(shape, index))}
        </Layer>
      </Stage>
    </div>
  );
};
