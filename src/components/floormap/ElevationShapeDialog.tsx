/**
 * ElevationShapeDialog - Dialog for viewing/editing elevation shape details
 *
 * Shows dimensions, colors, materials and allows editing of elevation shapes.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FloorMapShape } from './types';
import { Square, Circle, Minus, Palette, Ruler, Trash2, Layers, Package, Calculator, Paintbrush, AlertTriangle } from 'lucide-react';
import {
  ELEVATION_OBJECT_MATERIAL_OPTIONS,
  WALL_TREATMENT_OPTIONS,
  WALL_MATERIAL_OPTIONS,
} from './room-details/constants';
import { ShapePhotoSection } from './ShapePhotoSection';
import { CommentsSection } from '@/components/comments/CommentsSection';

interface ElevationShapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shape: FloorMapShape | null;
  onUpdate: (updates: Partial<FloorMapShape>) => void;
  onDelete: () => void;
  // Project ID for photos and comments
  projectId?: string;
  // Wall-specific props for smart data
  isWall?: boolean;
  wallLengthMM?: number;
  wallHeightMM?: number;
  elevationShapes?: FloorMapShape[];
}

// Helper to format dimension in mm/cm/m
const formatDimension = (valuePx: number, unit: 'mm' | 'cm' | 'm' = 'mm'): string => {
  // Assuming 1px = 1 unit in elevation view coordinates
  const mm = valuePx;
  switch (unit) {
    case 'cm':
      return `${(mm / 10).toFixed(1)} cm`;
    case 'm':
      return `${(mm / 1000).toFixed(2)} m`;
    default:
      return `${Math.round(mm)} mm`;
  }
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

export const ElevationShapeDialog: React.FC<ElevationShapeDialogProps> = ({
  open,
  onOpenChange,
  shape,
  onUpdate,
  onDelete,
  projectId,
  isWall = false,
  wallLengthMM,
  wallHeightMM,
  elevationShapes = [],
}) => {
  // Local state for editing
  const [fillColor, setFillColor] = useState('#93c5fd');
  const [strokeColor, setStrokeColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  // Material state
  const [material, setMaterial] = useState('');
  const [materialSpec, setMaterialSpec] = useState('');
  const [treatment, setTreatment] = useState('');
  const [treatmentColor, setTreatmentColor] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [productCode, setProductCode] = useState('');

  // Sync local state with shape props
  useEffect(() => {
    if (shape) {
      setFillColor(shape.color || '#93c5fd');
      setStrokeColor(shape.strokeColor || '#3b82f6');
      setStrokeWidth(shape.strokeWidth || 2);
      setOpacity((shape.opacity || 1) * 100);
      setName(shape.name || '');
      setNotes(shape.notes || '');
      setMaterial(shape.material || '');
      setMaterialSpec(shape.materialSpec || '');
      setTreatment(shape.treatment || '');
      setTreatmentColor(shape.treatmentColor || '');
      setManufacturer(shape.manufacturer || '');
      setProductCode(shape.productCode || '');
    }
  }, [shape]);

  // Calculate smart data for walls
  const smartData = useMemo(() => {
    if (!isWall || !wallLengthMM || !wallHeightMM) return null;

    const totalArea = wallLengthMM * wallHeightMM;
    const objectsArea = elevationShapes.reduce(
      (sum, s) => sum + getShapeArea(s),
      0
    );
    const paintableArea = Math.max(0, totalArea - objectsArea);

    // Paint estimates
    const paintCoverageSqmPerLiter = 10;
    const paintableAreaSqm = paintableArea / 1_000_000;
    const paintLiters = Math.ceil((paintableAreaSqm / paintCoverageSqmPerLiter) * 2 * 1.1); // 2 coats + 10% waste
    const primerLiters = Math.ceil(paintableAreaSqm / 12);

    // Skirting and crown molding
    const skirtingMeters = (wallLengthMM / 1000) * 1.1;
    const crownMoldingMeters = (wallLengthMM / 1000) * 1.1;

    return {
      totalArea,
      objectsArea,
      paintableArea,
      objectCount: elevationShapes.length,
      paintLiters,
      primerLiters,
      skirtingMeters,
      crownMoldingMeters,
      objectPercentage: totalArea > 0 ? ((objectsArea / totalArea) * 100).toFixed(1) : '0',
    };
  }, [isWall, wallLengthMM, wallHeightMM, elevationShapes]);

  if (!shape) return null;

  // Get shape dimensions
  const getDimensions = () => {
    const coords = shape.coordinates as Record<string, number>;

    if (shape.type === 'rectangle') {
      return {
        width: coords.width || 0,
        height: coords.height || 0,
        area: (coords.width || 0) * (coords.height || 0),
      };
    } else if (shape.type === 'circle') {
      const radius = coords.radius || 0;
      return {
        radius,
        diameter: radius * 2,
        circumference: 2 * Math.PI * radius,
        area: Math.PI * radius * radius,
      };
    } else if (shape.type === 'line') {
      const dx = (coords.x2 || 0) - (coords.x1 || 0);
      const dy = (coords.y2 || 0) - (coords.y1 || 0);
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return {
        length,
        angle: angle.toFixed(1),
      };
    }
    return {};
  };

  const dimensions = getDimensions();

  // Get shape icon
  const getShapeIcon = () => {
    if (isWall) return <Square className="h-5 w-5" />;
    switch (shape.type) {
      case 'rectangle':
        return <Square className="h-5 w-5" />;
      case 'circle':
        return <Circle className="h-5 w-5" />;
      case 'line':
        return <Minus className="h-5 w-5" />;
      default:
        return <Square className="h-5 w-5" />;
    }
  };

  // Get shape type label
  const getShapeLabel = () => {
    if (isWall) return 'Vägg';
    switch (shape.type) {
      case 'rectangle':
        return 'Rektangel';
      case 'circle':
        return 'Cirkel';
      case 'line':
        return 'Linje';
      case 'wall':
        return 'Vägg';
      default:
        return shape.type;
    }
  };

  // Handle save
  const handleSave = () => {
    onUpdate({
      color: fillColor,
      strokeColor,
      strokeWidth,
      opacity: opacity / 100,
      name: name || undefined,
      notes: notes || undefined,
      material: material || undefined,
      materialSpec: materialSpec || undefined,
      treatment: treatment || undefined,
      treatmentColor: treatmentColor || undefined,
      manufacturer: manufacturer || undefined,
      productCode: productCode || undefined,
    });
    onOpenChange(false);
  };

  // Handle delete
  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getShapeIcon()}
            <span>{getShapeLabel()}</span>
            {isWall ? (
              <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Floor Plan
              </span>
            ) : (
              <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Elevation
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isWall ? 'Visa och redigera väggens egenskaper och materialuppgifter' : 'Visa och redigera objektets egenskaper'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
          {/* Dimensions Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Dimensioner</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {shape.type === 'rectangle' && (
                <>
                  <div>
                    <span className="text-gray-500">Bredd:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.width || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Höjd:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.height || 0)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Area:</span>
                    <span className="ml-2 font-medium">{(dimensions.area || 0).toFixed(0)} mm²</span>
                  </div>
                </>
              )}

              {shape.type === 'circle' && (
                <>
                  <div>
                    <span className="text-gray-500">Radie:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.radius || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Diameter:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.diameter || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Omkrets:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.circumference || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Area:</span>
                    <span className="ml-2 font-medium">{(dimensions.area || 0).toFixed(0)} mm²</span>
                  </div>
                </>
              )}

              {shape.type === 'line' && (
                <>
                  <div>
                    <span className="text-gray-500">Längd:</span>
                    <span className="ml-2 font-medium">{formatDimension(dimensions.length || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vinkel:</span>
                    <span className="ml-2 font-medium">{dimensions.angle}°</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Smart Data Section (only for walls) */}
          {isWall && smartData && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm text-green-800">Smarta uppgifter</span>
              </div>

              {/* Area breakdown */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total väggyta:</span>
                  <span className="font-medium">{formatArea(smartData.totalArea)}</span>
                </div>
                {smartData.objectCount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Objekt ({smartData.objectCount} st, {smartData.objectPercentage}%):</span>
                    <span className="font-medium">-{formatArea(smartData.objectsArea)}</span>
                  </div>
                )}
                <div className="flex justify-between text-green-700 font-medium pt-2 border-t border-green-200">
                  <span className="flex items-center gap-1">
                    <Paintbrush className="h-3.5 w-3.5" />
                    Målbar yta (netto):
                  </span>
                  <span>{formatArea(smartData.paintableArea)}</span>
                </div>
              </div>

              {/* Material estimates */}
              <div className="space-y-1.5 text-sm pt-3 border-t border-green-200">
                <div className="text-xs font-medium text-green-700 mb-2">Materialåtgång (beräknat)</div>
                <div className="flex justify-between text-gray-600">
                  <span>Väggfärg (2 strykn.):</span>
                  <span className="font-medium">~{smartData.paintLiters} L</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Primer:</span>
                  <span className="font-medium">~{smartData.primerLiters} L</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Golvlist:</span>
                  <span className="font-medium">{smartData.skirtingMeters.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taklist:</span>
                  <span className="font-medium">{smartData.crownMoldingMeters.toFixed(1)} m</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-green-200">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Uppskattningar. Verifiera med leverantör.
                </p>
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="shape-name">Namn (valfritt)</Label>
            <Input
              id="shape-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Fönsterkarm, Tavla..."
            />
          </div>

          {/* Colors Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Färger</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {shape.type !== 'line' && (
                <div className="space-y-2">
                  <Label htmlFor="fill-color" className="text-sm">Fyllnadsfärg</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="fill-color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stroke-color" className="text-sm">Kantfärg</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="stroke-color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stroke Width */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Kantbredd</Label>
              <span className="text-sm text-gray-500">{strokeWidth}px</span>
            </div>
            <Slider
              value={[strokeWidth]}
              onValueChange={([value]) => setStrokeWidth(value)}
              min={1}
              max={10}
              step={1}
            />
          </div>

          {/* Opacity */}
          {shape.type !== 'line' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Opacitet</Label>
                <span className="text-sm text-gray-500">{opacity}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([value]) => setOpacity(value)}
                min={10}
                max={100}
                step={5}
              />
            </div>
          )}

          {/* Material Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Material</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="material" className="text-sm">Materialtyp</Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger id="material">
                    <SelectValue placeholder="Välj material" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isWall ? WALL_MATERIAL_OPTIONS : ELEVATION_OBJECT_MATERIAL_OPTIONS).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment" className="text-sm">Ytbehandling</Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger id="treatment">
                    <SelectValue placeholder="Välj behandling" />
                  </SelectTrigger>
                  <SelectContent>
                    {WALL_TREATMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material-spec" className="text-sm">Specifikation</Label>
              <Input
                id="material-spec"
                value={materialSpec}
                onChange={(e) => setMaterialSpec(e.target.value)}
                placeholder="t.ex. Ek massiv, 20mm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment-color" className="text-sm">Kulör/Finish</Label>
              <Input
                id="treatment-color"
                value={treatmentColor}
                onChange={(e) => setTreatmentColor(e.target.value)}
                placeholder="t.ex. NCS S 0502-Y, RAL 9010"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Produktinfo</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manufacturer" className="text-sm">Tillverkare</Label>
                <Input
                  id="manufacturer"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="t.ex. IKEA, Byggmax"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-code" className="text-sm">Artikelnummer</Label>
                <Input
                  id="product-code"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="t.ex. 123-456-789"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="notes" className="text-sm">Anteckningar</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruktioner, noteringar..."
              rows={2}
            />
          </div>

          {/* Photos Section */}
          {projectId && (
            <div className="pt-2 border-t">
              <ShapePhotoSection
                shapeId={shape.id}
                projectId={projectId}
                compact={true}
              />
            </div>
          )}

          {/* Comments Section */}
          {projectId && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium mb-2 block">Kommentarer</Label>
              <CommentsSection
                drawingObjectId={shape.id}
                projectId={projectId}
              />
            </div>
          )}

          {/* Position Info */}
          <div className="text-xs text-gray-400 pt-2 border-t">
            <p>ID: {shape.id.substring(0, 8)}...</p>
            {shape.rotation && <p>Rotation: {shape.rotation}°</p>}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Ta bort
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave}>
              Spara
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
