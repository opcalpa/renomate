/**
 * WallSmartDataSection - Smart calculations section for wall properties
 *
 * Shows wall area calculations, material estimates, and net paintable area
 * based on elevation shapes drawn on this wall.
 */

import React, { useMemo } from 'react';
import {
  Calculator,
  Paintbrush,
  Square,
  Minus,
  AlertTriangle,
  Layers,
  Ruler,
} from 'lucide-react';
import { FloorMapShape } from './types';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WallSmartDataSectionProps {
  wall: FloorMapShape;
  elevationShapes: FloorMapShape[];
  wallLengthMM: number;
  wallHeightMM: number;
}

// Helper to format area
const formatArea = (areaMM2: number): string => {
  const areaSqm = areaMM2 / 1_000_000;
  if (areaSqm >= 1) {
    return `${areaSqm.toFixed(2)} m²`;
  }
  return `${(areaSqm * 10000).toFixed(0)} cm²`;
};

// Helper to format dimension
const formatDim = (mm: number): string => {
  if (mm >= 1000) {
    return `${(mm / 1000).toFixed(2)} m`;
  }
  return `${Math.round(mm)} mm`;
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

export const WallSmartDataSection: React.FC<WallSmartDataSectionProps> = ({
  wall,
  elevationShapes,
  wallLengthMM,
  wallHeightMM,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  // Calculate all values
  const calculations = useMemo(() => {
    // Total wall area
    const totalWallArea = wallLengthMM * wallHeightMM;

    // Filter elevation shapes that belong to this wall
    const wallElevationShapes = elevationShapes.filter(
      s => s.parentWallId === wall.id
    );

    // Sum of all object areas
    const totalObjectArea = wallElevationShapes.reduce(
      (sum, shape) => sum + getShapeArea(shape),
      0
    );

    // Net paintable area
    const netPaintableArea = Math.max(0, totalWallArea - totalObjectArea);

    // Paint estimates (assuming 10 m²/L coverage, 2 coats)
    const paintCoverageSqmPerLiter = 10;
    const numberOfCoats = 2;
    const netPaintableAreaSqm = netPaintableArea / 1_000_000;
    const paintLitersNeeded = Math.ceil(
      (netPaintableAreaSqm / paintCoverageSqmPerLiter) * numberOfCoats
    );

    // Add 10% waste factor
    const paintLitersWithWaste = Math.ceil(paintLitersNeeded * 1.1);

    // Primer estimate (1 coat, 12 m²/L)
    const primerCoverageSqmPerLiter = 12;
    const primerLitersNeeded = Math.ceil(
      netPaintableAreaSqm / primerCoverageSqmPerLiter
    );

    // Skirting board (wall length)
    const skirtingMeters = wallLengthMM / 1000;
    const skirtingWithWaste = skirtingMeters * 1.1;

    // Crown molding (wall length)
    const crownMoldingMeters = wallLengthMM / 1000;
    const crownMoldingWithWaste = crownMoldingMeters * 1.1;

    return {
      totalWallArea,
      totalObjectArea,
      netPaintableArea,
      wallElevationShapes,
      paintLitersNeeded,
      paintLitersWithWaste,
      primerLitersNeeded,
      skirtingWithWaste,
      crownMoldingWithWaste,
      objectPercentage: totalWallArea > 0
        ? ((totalObjectArea / totalWallArea) * 100).toFixed(1)
        : '0',
    };
  }, [wall.id, wallLengthMM, wallHeightMM, elevationShapes]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-10 flex items-center justify-between px-3 hover:bg-green-100/50 rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-800">Smarta uppgifter</span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-green-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-green-600" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Wall Dimensions */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-white/60 rounded-lg text-xs">
              <div className="text-center">
                <div className="text-gray-500">Längd</div>
                <div className="font-medium">{formatDim(wallLengthMM)}</div>
              </div>
              <div className="text-center border-x border-green-200">
                <div className="text-gray-500">Höjd</div>
                <div className="font-medium">{formatDim(wallHeightMM)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Total yta</div>
                <div className="font-medium">{formatArea(calculations.totalWallArea)}</div>
              </div>
            </div>

            {/* Area Breakdown */}
            <div className="space-y-1.5">
              {/* Total wall */}
              <div className="flex items-center justify-between text-xs p-1.5 bg-blue-50 rounded">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded" />
                  Total väggyta
                </span>
                <span className="font-medium">{formatArea(calculations.totalWallArea)}</span>
              </div>

              {/* Objects deducted */}
              {calculations.totalObjectArea > 0 && (
                <div className="flex items-center justify-between text-xs p-1.5 bg-amber-50 rounded">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <Minus className="h-3 w-3 text-amber-600" />
                    Objekt ({calculations.wallElevationShapes.length} st, {calculations.objectPercentage}%)
                  </span>
                  <span className="font-medium text-amber-700">
                    -{formatArea(calculations.totalObjectArea)}
                  </span>
                </div>
              )}

              {/* Net paintable area */}
              <div className="flex items-center justify-between text-xs p-1.5 bg-green-100 rounded border border-green-200">
                <span className="text-green-700 flex items-center gap-1.5 font-medium">
                  <Paintbrush className="h-3 w-3" />
                  Målbar yta
                </span>
                <span className="font-bold text-green-700">
                  {formatArea(calculations.netPaintableArea)}
                </span>
              </div>
            </div>

            {/* Material Estimates */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                <Layers className="h-3 w-3" />
                <span>Materialåtgång</span>
              </div>

              <div className="bg-white/60 rounded-lg p-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Väggfärg (2 lager):</span>
                  <span className="font-medium">~{calculations.paintLitersWithWaste} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Primer:</span>
                  <span className="font-medium">~{calculations.primerLitersNeeded} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Golvlist:</span>
                  <span className="font-medium">{calculations.skirtingWithWaste.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taklist:</span>
                  <span className="font-medium">{calculations.crownMoldingWithWaste.toFixed(1)} m</span>
                </div>
              </div>
            </div>

            {/* Info text */}
            {calculations.wallElevationShapes.length === 0 && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Inga objekt ritade i elevation-vy för denna vägg
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default WallSmartDataSection;
