/**
 * ElevationInfoPopover - Quick info popover for elevation objects
 *
 * Shows material, dimensions and basic info on single click.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FloorMapShape } from './types';
import { Square, Circle, Minus, Layers, Package, Ruler, Palette, Paintbrush } from 'lucide-react';
import {
  ELEVATION_OBJECT_MATERIAL_OPTIONS,
  WALL_TREATMENT_OPTIONS,
  WALL_MATERIAL_OPTIONS,
} from './room-details/constants';

interface ElevationInfoPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shape: FloorMapShape | null;
  position: { x: number; y: number };
  onDoubleClick?: () => void;
  isWall?: boolean;
  // Wall-specific props for area calculations
  wallLengthMM?: number;
  wallHeightMM?: number;
  elevationShapes?: FloorMapShape[];
}

// Helper to format dimension in mm/cm/m
const formatDim = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}m`;
  } else if (value >= 10) {
    return `${(value / 10).toFixed(1)}cm`;
  }
  return `${Math.round(value)}mm`;
};

// Helper to format area
const formatArea = (areaMM2: number): string => {
  const areaSqm = areaMM2 / 1_000_000;
  return `${areaSqm.toFixed(2)} m²`;
};

// Calculate shape area in mm²
const getShapeArea = (shape: FloorMapShape): number => {
  const coords = shape.coordinates as Record<string, number>;
  if (shape.type === 'rectangle') {
    return (coords.width || 0) * (coords.height || 0);
  } else if (shape.type === 'circle') {
    const radius = coords.radius || 0;
    return Math.PI * radius * radius;
  }
  return 0;
};

// Get label from options
const getOptionLabel = (options: { value: string; label: string }[], value: string): string => {
  const option = options.find(o => o.value === value);
  return option?.label || value;
};

export const ElevationInfoPopover: React.FC<ElevationInfoPopoverProps> = ({
  open,
  onOpenChange,
  shape,
  position,
  onDoubleClick,
  isWall = false,
  wallLengthMM,
  wallHeightMM,
  elevationShapes = [],
}) => {
  const { t } = useTranslation();
  // Calculate wall areas when it's a wall
  const wallAreas = useMemo(() => {
    if (!isWall || !wallLengthMM || !wallHeightMM) return null;

    const totalArea = wallLengthMM * wallHeightMM;
    const objectsArea = elevationShapes.reduce(
      (sum, s) => sum + getShapeArea(s),
      0
    );
    const paintableArea = Math.max(0, totalArea - objectsArea);

    return {
      totalArea,
      objectsArea,
      paintableArea,
      objectCount: elevationShapes.length,
    };
  }, [isWall, wallLengthMM, wallHeightMM, elevationShapes]);

  if (!shape) return null;

  // Get shape icon
  const getShapeIcon = () => {
    if (isWall) return <Square className="h-4 w-4" />;
    switch (shape.type) {
      case 'rectangle':
        return <Square className="h-4 w-4" />;
      case 'circle':
        return <Circle className="h-4 w-4" />;
      case 'line':
        return <Minus className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  // Get shape label
  const getShapeLabel = () => {
    if (isWall) return t('floormap.wall');
    switch (shape.type) {
      case 'rectangle':
        return t('elevationInfo.rectangle');
      case 'circle':
        return t('elevationInfo.circle');
      case 'line':
        return t('elevationInfo.line');
      case 'wall':
        return t('floormap.wall');
      default:
        return shape.type;
    }
  };

  // Get dimensions
  const getDimensions = () => {
    const coords = shape.coordinates as Record<string, number>;

    if (shape.type === 'rectangle') {
      return { width: coords.width, height: coords.height };
    } else if (shape.type === 'circle') {
      return { radius: coords.radius };
    } else if (shape.type === 'line' || shape.type === 'wall') {
      if (coords.x1 !== undefined) {
        const length = Math.sqrt(
          Math.pow((coords.x2 || 0) - (coords.x1 || 0), 2) +
          Math.pow((coords.y2 || 0) - (coords.y1 || 0), 2)
        );
        return { length, height: shape.heightMM };
      }
    }
    return {};
  };

  const dimensions = getDimensions();
  const hasMaterial = shape.material || shape.treatment;
  const hasProduct = shape.manufacturer || shape.productCode;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        side="right"
        align="start"
        onDoubleClick={onDoubleClick}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          <div className="p-1.5 rounded bg-blue-50 text-blue-600">
            {getShapeIcon()}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{shape.name || getShapeLabel()}</div>
            {shape.name && (
              <div className="text-xs text-gray-500">{getShapeLabel()}</div>
            )}
          </div>
          {isWall && (
            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t('floormap.wall')}</span>
          )}
          {!isWall && shape.shapeViewMode === 'elevation' && (
            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">{t('elevationInfo.elevation')}</span>
          )}
        </div>

        {/* Dimensions */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Ruler className="h-3.5 w-3.5" />
            <span className="font-medium">{t('elevationInfo.dimensions')}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-5 text-xs">
            {dimensions.width !== undefined && (
              <div>
                <span className="text-gray-500">{t('elevationInfo.width')}: </span>
                <span className="font-medium">{formatDim(dimensions.width)}</span>
              </div>
            )}
            {dimensions.height !== undefined && (
              <div>
                <span className="text-gray-500">{t('elevationInfo.height')}: </span>
                <span className="font-medium">{formatDim(dimensions.height)}</span>
              </div>
            )}
            {dimensions.length !== undefined && (
              <div>
                <span className="text-gray-500">{t('elevationInfo.length')}: </span>
                <span className="font-medium">{formatDim(dimensions.length)}</span>
              </div>
            )}
            {dimensions.radius !== undefined && (
              <div>
                <span className="text-gray-500">{t('elevationInfo.radius')}: </span>
                <span className="font-medium">{formatDim(dimensions.radius)}</span>
              </div>
            )}
            {shape.thicknessMM && (
              <div>
                <span className="text-gray-500">{t('elevationInfo.thickness')}: </span>
                <span className="font-medium">{formatDim(shape.thicknessMM)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Wall Area Info (only for walls) */}
        {isWall && wallAreas && (
          <div className="space-y-2 text-sm mt-3 pt-2 border-t">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Paintbrush className="h-3.5 w-3.5" />
              <span className="font-medium">{t('elevationInfo.areaCalculation')}</span>
            </div>
            <div className="pl-5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('elevationInfo.totalWallArea')}:</span>
                <span className="font-medium">{formatArea(wallAreas.totalArea)}</span>
              </div>
              {wallAreas.objectCount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>{t('elevationInfo.objects', { count: wallAreas.objectCount })}:</span>
                  <span className="font-medium">-{formatArea(wallAreas.objectsArea)}</span>
                </div>
              )}
              <div className="flex justify-between text-green-600 font-medium pt-1 border-t">
                <span>{t('elevationInfo.paintableArea')}:</span>
                <span>{formatArea(wallAreas.paintableArea)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Material Info */}
        {hasMaterial && (
          <div className="space-y-2 text-sm mt-3 pt-2 border-t">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Layers className="h-3.5 w-3.5" />
              <span className="font-medium">{t('elevationInfo.material')}</span>
            </div>
            <div className="pl-5 text-xs space-y-1">
              {shape.material && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.type')}: </span>
                  <span className="font-medium">
                    {getOptionLabel(
                      isWall ? WALL_MATERIAL_OPTIONS : ELEVATION_OBJECT_MATERIAL_OPTIONS,
                      shape.material
                    )}
                  </span>
                </div>
              )}
              {shape.materialSpec && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.spec')}: </span>
                  <span className="font-medium">{shape.materialSpec}</span>
                </div>
              )}
              {shape.treatment && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.treatment')}: </span>
                  <span className="font-medium">
                    {getOptionLabel(WALL_TREATMENT_OPTIONS, shape.treatment)}
                  </span>
                </div>
              )}
              {shape.treatmentColor && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.color')}: </span>
                  <span className="font-medium">{shape.treatmentColor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Info */}
        {hasProduct && (
          <div className="space-y-2 text-sm mt-3 pt-2 border-t">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Package className="h-3.5 w-3.5" />
              <span className="font-medium">{t('elevationInfo.product')}</span>
            </div>
            <div className="pl-5 text-xs space-y-1">
              {shape.manufacturer && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.manufacturer')}: </span>
                  <span className="font-medium">{shape.manufacturer}</span>
                </div>
              )}
              {shape.productCode && (
                <div>
                  <span className="text-gray-500">{t('elevationInfo.productCode')}: </span>
                  <span className="font-medium">{shape.productCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color preview */}
        {(shape.color || shape.strokeColor) && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t">
            <Palette className="h-3.5 w-3.5 text-gray-500" />
            {shape.color && (
              <div
                className="w-5 h-5 rounded border"
                style={{ backgroundColor: shape.color }}
                title={t('elevationInfo.fillColor')}
              />
            )}
            {shape.strokeColor && (
              <div
                className="w-5 h-5 rounded border-2"
                style={{ borderColor: shape.strokeColor, backgroundColor: 'transparent' }}
                title={t('elevationInfo.strokeColor')}
              />
            )}
          </div>
        )}

        {/* Notes preview */}
        {shape.notes && (
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs text-gray-500 line-clamp-2">{shape.notes}</p>
          </div>
        )}

        {/* Double-click hint */}
        <div className="mt-3 pt-2 border-t text-center">
          <span className="text-xs text-gray-400">{t('floormap.doubleClickToEdit')}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
