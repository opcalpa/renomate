/**
 * Ghost Preview Overlay
 *
 * Renders a ghost preview during stamp placement mode for library objects/symbols.
 * Shows a semi-transparent preview following the cursor with auto-rotation towards
 * nearest wall.
 */

import React from 'react';
import { Group, Rect, Circle, Path, Text as KonvaText } from 'react-konva';
import { getSymbolComponent, ArchSymbolType, SYMBOL_METADATA } from '../SymbolLibrary';
import { getUnifiedObjectById } from '../objectLibrary';
import { getObjectById } from '../ObjectRenderer';

interface GhostPreviewOverlayProps {
  ghostPreview: {
    x: number;
    y: number;
    rotation: number;
    nearWall: boolean;
  } | null;
  pendingLibrarySymbol: string | null;
  pendingObjectId: string | null;
  zoom: number;
  pixelsPerMm: number;
}

export const GhostPreviewOverlay: React.FC<GhostPreviewOverlayProps> = ({
  ghostPreview,
  pendingLibrarySymbol,
  pendingObjectId,
  zoom,
  pixelsPerMm,
}) => {
  if (!ghostPreview || (!pendingLibrarySymbol && !pendingObjectId)) return null;

  const strokeColor = ghostPreview.nearWall ? '#10b981' : '#3b82f6';
  const fillColor = ghostPreview.nearWall ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)';

  // Render symbol preview
  if (pendingLibrarySymbol) {
    const SymbolComponent = getSymbolComponent(pendingLibrarySymbol as ArchSymbolType);
    if (SymbolComponent) {
      const symbolMeta = SYMBOL_METADATA.find(s => s.type === pendingLibrarySymbol);
      const defaultSize = symbolMeta?.defaultSize || 600;
      const symbolScale = (defaultSize / 1000) * pixelsPerMm;
      return (
        <Group
          x={ghostPreview.x}
          y={ghostPreview.y}
          rotation={ghostPreview.rotation}
          opacity={0.6}
          listening={false}
        >
          <SymbolComponent
            width={100 * symbolScale}
            height={100 * symbolScale}
            strokeWidth={1.5 / zoom}
            stroke={strokeColor}
            fill="transparent"
          />
          {/* Snap indicator when near wall */}
          {ghostPreview.nearWall && (
            <Circle
              x={0}
              y={0}
              radius={8 / zoom}
              fill="#10b981"
              opacity={0.8}
            />
          )}
        </Group>
      );
    }
  }

  // Render unified object (SVG-based library) preview
  if (pendingObjectId) {
    const unifiedDef = getUnifiedObjectById(pendingObjectId);
    if (unifiedDef) {
      const objectScale = pixelsPerMm;
      const width = unifiedDef.dimensions.width * objectScale;
      const height = unifiedDef.dimensions.depth * objectScale;
      const symbol = unifiedDef.floorPlanSymbol;
      const [, , vbWidth, vbHeight] = symbol.viewBox.split(' ').map(Number);
      const scaleX = width / vbWidth;
      const scaleY = height / vbHeight;

      return (
        <Group
          x={ghostPreview.x}
          y={ghostPreview.y}
          rotation={ghostPreview.rotation}
          opacity={0.6}
          listening={false}
        >
          {/* Selection box */}
          <Rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            stroke={strokeColor}
            strokeWidth={2 / zoom}
            dash={[6 / zoom, 3 / zoom]}
            fill={fillColor}
          />
          {/* SVG Symbol */}
          <Group x={-width / 2} y={-height / 2}>
            {symbol.paths.map((path, index) => (
              <Path
                key={index}
                data={path.d}
                fill={path.fill || 'none'}
                stroke={ghostPreview.nearWall ? '#10b981' : (path.stroke || '#3b82f6')}
                strokeWidth={(path.strokeWidth || 2) * Math.min(scaleX, scaleY)}
                scaleX={scaleX}
                scaleY={scaleY}
              />
            ))}
          </Group>
          {/* Object name label */}
          <KonvaText
            x={-width / 2}
            y={-height / 2 - 20 / zoom}
            text={unifiedDef.name}
            fontSize={12 / zoom}
            fill={strokeColor}
          />
          {/* Snap indicator when near wall */}
          {ghostPreview.nearWall && (
            <Circle
              x={0}
              y={0}
              radius={8 / zoom}
              fill="#10b981"
              opacity={0.8}
            />
          )}
        </Group>
      );
    }

    // Fall back to legacy object library
    const objectDef = getObjectById(pendingObjectId);
    if (objectDef) {
      const objectScale = pixelsPerMm;
      const width = (objectDef.defaultWidth || 600) * objectScale;
      const height = (objectDef.defaultHeight || 600) * objectScale;
      return (
        <Group
          x={ghostPreview.x}
          y={ghostPreview.y}
          rotation={ghostPreview.rotation}
          opacity={0.6}
          listening={false}
        >
          <Rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            stroke={strokeColor}
            strokeWidth={2 / zoom}
            dash={[6 / zoom, 3 / zoom]}
            fill={fillColor}
          />
          {/* Object name label */}
          <KonvaText
            x={-width / 2}
            y={-height / 2 - 20 / zoom}
            text={objectDef.name}
            fontSize={12 / zoom}
            fill={strokeColor}
          />
          {/* Snap indicator when near wall */}
          {ghostPreview.nearWall && (
            <Circle
              x={0}
              y={0}
              radius={8 / zoom}
              fill="#10b981"
              opacity={0.8}
            />
          )}
        </Group>
      );
    }
  }

  return null;
};
