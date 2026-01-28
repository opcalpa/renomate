/**
 * ElevationSmartData - Smart calculations panel for elevation view
 *
 * Shows wall area calculations, material estimates, and net paintable area.
 * Takes into account all objects drawn on the wall (windows, doors, cabinets, etc.)
 */

import React, { useMemo } from 'react';
import {
  Calculator,
  Paintbrush,
  Square,
  Minus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  Ruler,
  DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloorMapShape } from './types';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ElevationSmartDataProps {
  wall: FloorMapShape | null;
  elevationShapes: FloorMapShape[];
  wallLengthMM: number;
  wallHeightMM: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
  } else if (shape.type === 'line') {
    // Lines don't have area, but could represent a strip
    return 0;
  }

  return 0;
};

// Categorize shapes for breakdown
interface ShapeCategory {
  name: string;
  nameSv: string;
  shapes: FloorMapShape[];
  totalArea: number;
  icon: React.ReactNode;
}

const categorizeShapes = (shapes: FloorMapShape[]): ShapeCategory[] => {
  const categories: Record<string, ShapeCategory> = {
    openings: {
      name: 'Openings',
      nameSv: 'Öppningar',
      shapes: [],
      totalArea: 0,
      icon: <DoorOpen className="h-3.5 w-3.5" />,
    },
    kitchen: {
      name: 'Kitchen',
      nameSv: 'Kök',
      shapes: [],
      totalArea: 0,
      icon: <Square className="h-3.5 w-3.5" />,
    },
    electrical: {
      name: 'Electrical',
      nameSv: 'El/Belysning',
      shapes: [],
      totalArea: 0,
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    other: {
      name: 'Other',
      nameSv: 'Övrigt',
      shapes: [],
      totalArea: 0,
      icon: <Square className="h-3.5 w-3.5" />,
    },
  };

  shapes.forEach((shape) => {
    const area = getShapeArea(shape);
    const metadata = shape.metadata as Record<string, unknown> | undefined;
    const category = (metadata?.category as string) || 'other';

    // Map symbol categories to our display categories
    let targetCategory = 'other';
    if (category === 'openings') {
      targetCategory = 'openings';
    } else if (category === 'kitchen') {
      targetCategory = 'kitchen';
    } else if (category === 'electrical' || category === 'lighting') {
      targetCategory = 'electrical';
    }

    if (categories[targetCategory]) {
      categories[targetCategory].shapes.push(shape);
      categories[targetCategory].totalArea += area;
    } else {
      categories.other.shapes.push(shape);
      categories.other.totalArea += area;
    }
  });

  // Return only categories with shapes
  return Object.values(categories).filter((cat) => cat.shapes.length > 0);
};

export const ElevationSmartData: React.FC<ElevationSmartDataProps> = ({
  wall,
  elevationShapes,
  wallLengthMM,
  wallHeightMM,
  isOpen,
  onOpenChange,
}) => {
  // Calculate all values
  const calculations = useMemo(() => {
    // Total wall area
    const totalWallArea = wallLengthMM * wallHeightMM;

    // Sum of all object areas
    const totalObjectArea = elevationShapes.reduce(
      (sum, shape) => sum + getShapeArea(shape),
      0
    );

    // Net paintable area
    const netPaintableArea = Math.max(0, totalWallArea - totalObjectArea);

    // Categorized breakdown
    const categories = categorizeShapes(elevationShapes);

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
      categories,
      paintLitersNeeded,
      paintLitersWithWaste,
      primerLitersNeeded,
      skirtingWithWaste,
      crownMoldingWithWaste,
      objectPercentage: totalWallArea > 0
        ? ((totalObjectArea / totalWallArea) * 100).toFixed(1)
        : '0',
    };
  }, [wallLengthMM, wallHeightMM, elevationShapes]);

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="bg-white border-t shadow-lg">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-10 flex items-center justify-between px-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">Smarta uppgifter</span>
              <Badge variant="secondary" className="text-xs">
                {formatArea(calculations.netPaintableArea)} målbar yta
              </Badge>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Wall Dimensions */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-500">Vägglängd</div>
                <div className="font-medium">{formatDim(wallLengthMM)}</div>
              </div>
              <div className="text-center border-x">
                <div className="text-xs text-gray-500">Vägghöjd</div>
                <div className="font-medium">{formatDim(wallHeightMM)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Total yta</div>
                <div className="font-medium">{formatArea(calculations.totalWallArea)}</div>
              </div>
            </div>

            {/* Area Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Square className="h-4 w-4" />
                <span>Ytfördelning</span>
              </div>

              <div className="space-y-1.5">
                {/* Total wall */}
                <div className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded">
                  <span className="text-gray-600 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    Total väggyta
                  </span>
                  <span className="font-medium">{formatArea(calculations.totalWallArea)}</span>
                </div>

                {/* Objects by category */}
                {calculations.categories.map((category) => (
                  <Tooltip key={category.name}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between text-sm p-2 bg-amber-50 rounded cursor-help">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Minus className="h-3 w-3 text-amber-600" />
                          {category.icon}
                          {category.nameSv} ({category.shapes.length} st)
                        </span>
                        <span className="font-medium text-amber-700">
                          -{formatArea(category.totalArea)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[250px]">
                      <div className="text-xs space-y-1">
                        {category.shapes.map((shape) => (
                          <div key={shape.id} className="flex justify-between gap-4">
                            <span>{shape.name || shape.type}</span>
                            <span>{formatArea(getShapeArea(shape))}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}

                {/* Total objects subtracted */}
                {calculations.totalObjectArea > 0 && (
                  <div className="flex items-center justify-between text-sm p-2 bg-gray-100 rounded border-t">
                    <span className="text-gray-600">
                      Objekt totalt ({calculations.objectPercentage}% av vägg)
                    </span>
                    <span className="font-medium text-gray-700">
                      -{formatArea(calculations.totalObjectArea)}
                    </span>
                  </div>
                )}

                {/* Net paintable area */}
                <div className="flex items-center justify-between text-sm p-2 bg-green-50 rounded border-2 border-green-200">
                  <span className="text-green-700 flex items-center gap-2 font-medium">
                    <Paintbrush className="h-4 w-4" />
                    Målbar yta (netto)
                  </span>
                  <span className="font-bold text-green-700">
                    {formatArea(calculations.netPaintableArea)}
                  </span>
                </div>
              </div>
            </div>

            {/* Material Estimates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Paintbrush className="h-4 w-4" />
                <span>Materialåtgång (beräknat)</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {/* Paint estimate */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Väggfärg (2 strykningar, 10 m²/L):
                  </span>
                  <span className="font-medium">
                    ~{calculations.paintLitersWithWaste} L
                    <span className="text-xs text-gray-500 ml-1">(inkl. 10% spill)</span>
                  </span>
                </div>

                {/* Primer estimate */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Primer/grundfärg (1 strykning):
                  </span>
                  <span className="font-medium">~{calculations.primerLitersNeeded} L</span>
                </div>

                {/* Skirting */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Golvlist:</span>
                  <span className="font-medium">
                    {calculations.skirtingWithWaste.toFixed(1)} m
                    <span className="text-xs text-gray-500 ml-1">(inkl. spill)</span>
                  </span>
                </div>

                {/* Crown molding */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taklist:</span>
                  <span className="font-medium">
                    {calculations.crownMoldingWithWaste.toFixed(1)} m
                    <span className="text-xs text-gray-500 ml-1">(inkl. spill)</span>
                  </span>
                </div>

                {/* Warning */}
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Uppskattningar baserade på standardvärden. Verifiera med leverantör.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-blue-50 rounded text-center">
                <div className="text-gray-500">Objekt på vägg</div>
                <div className="font-medium text-blue-700">{elevationShapes.length} st</div>
              </div>
              <div className="p-2 bg-green-50 rounded text-center">
                <div className="text-gray-500">Målbar andel</div>
                <div className="font-medium text-green-700">
                  {(100 - parseFloat(calculations.objectPercentage)).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default ElevationSmartData;
