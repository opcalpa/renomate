/**
 * TEMPLATE PREVIEW - Renders a miniature of template shapes
 * 
 * Shows a small canvas preview of what the template looks like
 */

import React from 'react';
import { Stage, Layer, Line, Rect, Circle } from 'react-konva';
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
  const padding = 10; // px padding
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  
  const scaleX = availableWidth / template.bounds.width;
  const scaleY = availableHeight / template.bounds.height;
  const scale = Math.min(scaleX, scaleY, 0.1); // Max 0.1 scale (1px = 10mm)
  
  // Center the preview
  const scaledWidth = template.bounds.width * scale;
  const scaledHeight = template.bounds.height * scale;
  const offsetX = (width - scaledWidth) / 2;
  const offsetY = (height - scaledHeight) / 2;
  
  // Render shapes
  const renderShape = (shape: FloorMapShape, index: number) => {
    const key = `preview-shape-${index}`;
    const strokeWidth = 1;
    const stroke = '#000000';
    
    if (shape.type === 'wall' && shape.coordinates.points) {
      const points = shape.coordinates.points.flatMap(p => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    
    if (shape.type === 'room' && shape.coordinates.points) {
      const points = shape.coordinates.points.flatMap(p => [
        p.x * scale + offsetX,
        p.y * scale + offsetY,
      ]);
      return (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="rgba(0,0,0,0.05)"
          closed
          listening={false}
        />
      );
    }
    
    if (shape.type === 'freehand' && shape.coordinates.points) {
      // For library symbols/objects with placement metadata
      if (shape.metadata?.placementX !== undefined && shape.metadata?.placementY !== undefined) {
        const x = shape.metadata.placementX * scale + offsetX;
        const y = shape.metadata.placementY * scale + offsetY;
        const size = 10; // Fixed size for symbols in preview
        return (
          <Rect
            key={key}
            x={x}
            y={y}
            width={size}
            height={size}
            fill={stroke}
            listening={false}
          />
        );
      }
      
      const points = shape.coordinates.points.flatMap(p => [
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
    
    if (shape.type === 'rectangle' && shape.coordinates.x !== undefined && shape.coordinates.y !== undefined) {
      return (
        <Rect
          key={key}
          x={shape.coordinates.x * scale + offsetX}
          y={shape.coordinates.y * scale + offsetY}
          width={(shape.coordinates.width || 0) * scale}
          height={(shape.coordinates.height || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={false}
        />
      );
    }
    
    if (shape.type === 'circle' && shape.coordinates.x !== undefined && shape.coordinates.y !== undefined) {
      return (
        <Circle
          key={key}
          x={shape.coordinates.x * scale + offsetX}
          y={shape.coordinates.y * scale + offsetY}
          radius={(shape.coordinates.radius || 0) * scale}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={false}
        />
      );
    }
    
    return null;
  };
  
  return (
    <div className="bg-white rounded border border-gray-100">
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
          
          {/* Shapes */}
          {template.shapes.map((shape, index) => renderShape(shape, index))}
        </Layer>
      </Stage>
    </div>
  );
};
