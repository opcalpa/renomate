import React, { useState, useEffect } from 'react';
import { X, Ruler, FileText, Edit2, Palette, RotateCw, Layers, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { FloorMapShape } from './types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useFloorMapStore } from './store';
import { toast } from 'sonner';

interface PropertyPanelProps {
  shape: FloorMapShape;
  projectId: string;
  onClose: () => void;
  onUpdateShape: (shapeId: string, updates: Partial<FloorMapShape>) => void;
  pixelsPerMm: number;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  shape,
  projectId,
  onClose,
  onUpdateShape,
  pixelsPerMm
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState(shape.name || '');
  const [notes, setNotes] = useState(shape.notes || '');
  const [isEditingDimensions, setIsEditingDimensions] = useState(false);
  const [editLengthM, setEditLengthM] = useState('0');
  const [editThicknessMm, setEditThicknessMm] = useState('150');
  const [editHeightMm, setEditHeightMm] = useState('2400');

  // Visual properties state
  const [opacity, setOpacity] = useState((shape.opacity ?? 1) * 100);
  const [rotation, setRotation] = useState(shape.rotation || 0);
  const [fillColor, setFillColor] = useState(shape.color || '#3b82f6');
  const [strokeColor, setStrokeColor] = useState(shape.strokeColor || '#1e40af');

  // Layer actions from store
  const bringForward = useFloorMapStore((state) => state.bringForward);
  const sendBackward = useFloorMapStore((state) => state.sendBackward);
  const bringToFront = useFloorMapStore((state) => state.bringToFront);
  const sendToBack = useFloorMapStore((state) => state.sendToBack);

  const getPixelsPerMeter = (pxPerMm: number) => pxPerMm * 1000;
  
  // Initialize edit values when shape changes
  useEffect(() => {
    setEditName(shape.name || '');
    setNotes(shape.notes || '');
    setOpacity((shape.opacity ?? 1) * 100);
    setRotation(shape.rotation || 0);
    setFillColor(shape.color || '#3b82f6');
    setStrokeColor(shape.strokeColor || '#1e40af');

    // Calculate initial values for walls/lines
    if (shape.type === 'wall' || shape.type === 'line') {
      const coords = shape.coordinates as any;
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const lengthPixels = Math.sqrt(dx * dx + dy * dy);
      const lengthMeters = lengthPixels / getPixelsPerMeter(pixelsPerMm);
      setEditLengthM(lengthMeters.toFixed(3));
      setEditThicknessMm(String(shape.thicknessMM || 150));
      setEditHeightMm(String(shape.heightMM || 2400));
    }
  }, [shape.id]);
  
  // Auto-save notes after 1 second of no typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (notes !== shape.notes) {
        onUpdateShape(shape.id, { notes });
        toast.success('Anteckningar sparade');
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes]);
  
  // Calculate shape-specific properties
  const getShapeProperties = () => {
    switch (shape.type) {
      case 'wall':
      case 'line': {
        const coords = shape.coordinates as any;
        const dx = coords.x2 - coords.x1;
        const dy = coords.y2 - coords.y1;
        const lengthPixels = Math.sqrt(dx * dx + dy * dy);
        const lengthMeters = lengthPixels / getPixelsPerMeter(pixelsPerMm);
        const lengthCm = lengthMeters * 100;
        const lengthMm = lengthMeters * 1000;
        
        return {
          type: 'Vägg',
          displayValues: [
            { label: 'Längd (m)', value: lengthMeters >= 1 ? `${lengthMeters.toFixed(2)} m` : `${lengthCm.toFixed(0)} cm`, highlight: true },
            { label: 'Längd (cm)', value: `${lengthCm.toFixed(1)} cm` },
            { label: 'Längd (mm)', value: `${lengthMm.toFixed(0)} mm` },
            { label: 'Tjocklek', value: `${shape.thicknessMM || 150} mm` },
            { label: 'Höjd', value: `${shape.heightMM || 2400} mm` },
          ]
        };
      }
      
      case 'room': {
        const coords = shape.coordinates as any;
        const points = coords.points || [];
        
        // Calculate area
        let area = 0;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
        }
        area = Math.abs(area / 2);
        const areaSqM = area / (getPixelsPerMeter(pixelsPerMm) ** 2);
        
        // Calculate perimeter
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          const dx = points[j].x - points[i].x;
          const dy = points[j].y - points[i].y;
          perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        const perimeterM = perimeter / getPixelsPerMeter(pixelsPerMm);
        
        return {
          type: 'Rum',
          displayValues: [
            { label: 'Area', value: `${areaSqM.toFixed(2)} m²`, highlight: true },
            { label: 'Omkrets', value: `${perimeterM.toFixed(2)} m` },
            { label: 'Antal hörn', value: `${points.length}` },
          ]
        };
      }
      
      case 'rectangle':
      case 'door':
      case 'opening': {
        const coords = shape.coordinates as any;
        const widthM = (coords.width || 0) / getPixelsPerMeter(pixelsPerMm);
        const heightM = (coords.height || 0) / getPixelsPerMeter(pixelsPerMm);
        const widthCm = widthM * 100;
        const heightCm = heightM * 100;
        
        return {
          type: shape.type === 'door' ? 'Dörr' : shape.type === 'opening' ? 'Öppning' : 'Rektangel',
          displayValues: [
            { label: 'Bredd', value: widthM >= 1 ? `${widthM.toFixed(2)} m` : `${widthCm.toFixed(0)} cm`, highlight: true },
            { label: 'Höjd', value: heightM >= 1 ? `${heightM.toFixed(2)} m` : `${heightCm.toFixed(0)} cm`, highlight: true },
          ]
        };
      }
      
      case 'circle': {
        const coords = shape.coordinates as any;
        const radiusM = (coords.radius || 0) / getPixelsPerMeter(pixelsPerMm);
        const radiusCm = radiusM * 100;
        const area = Math.PI * (coords.radius || 0) ** 2;
        const areaSqM = area / (getPixelsPerMeter(pixelsPerMm) ** 2);
        
        return {
          type: 'Cirkel',
          displayValues: [
            { label: 'Radie', value: radiusM >= 1 ? `${radiusM.toFixed(2)} m` : `${radiusCm.toFixed(0)} cm` },
            { label: 'Area', value: `${areaSqM.toFixed(2)} m²`, highlight: true },
          ]
        };
      }
      
      case 'text': {
        return {
          type: 'Text',
          displayValues: [
            { label: 'Text', value: shape.text || '' },
            { label: 'Storlek', value: `${shape.metadata?.lengthMM || 16}px` },
          ]
        };
      }
      
      default:
        return {
          type: 'Objekt',
          displayValues: []
        };
    }
  };
  
  const { type, displayValues } = getShapeProperties();
  
  const handleSave = () => {
    onUpdateShape(shape.id, { 
      name: editName,
      notes: notes 
    });
    setIsEditMode(false);
    setIsEditingDimensions(false);
    toast.success('Ändringar sparade!');
  };
  
  const handleCancel = () => {
    setEditName(shape.name || '');
    setNotes(shape.notes || '');
    setIsEditingDimensions(false);
    
    // Reset dimension edits
    if (shape.type === 'wall' || shape.type === 'line') {
      const coords = shape.coordinates as any;
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const lengthPixels = Math.sqrt(dx * dx + dy * dy);
      const lengthMeters = lengthPixels / getPixelsPerMeter(pixelsPerMm);
      setEditLengthM(lengthMeters.toFixed(3));
      setEditThicknessMm(String(shape.thicknessMM || 150));
      setEditHeightMm(String(shape.heightMM || 2400));
    }
    
    setIsEditMode(false);
  };
  
  const handleSaveDimensions = () => {
    if (shape.type !== 'wall' && shape.type !== 'line') return;
    
    // Validate inputs
    const newLengthM = parseFloat(editLengthM);
    const newThicknessMm = parseFloat(editThicknessMm);
    const newHeightMm = parseFloat(editHeightMm);
    
    if (isNaN(newLengthM) || newLengthM <= 0) {
      toast.error('Ogiltig längd. Ange ett positivt tal.');
      return;
    }
    
    if (isNaN(newThicknessMm) || newThicknessMm <= 0) {
      toast.error('Ogiltig tjocklek. Ange ett positivt tal i mm.');
      return;
    }
    
    if (isNaN(newHeightMm) || newHeightMm <= 0) {
      toast.error('Ogiltig höjd. Ange ett positivt tal i mm.');
      return;
    }
    
    // Calculate current length
    const coords = shape.coordinates as any;
    const dx = coords.x2 - coords.x1;
    const dy = coords.y2 - coords.y1;
    const currentLengthPixels = Math.sqrt(dx * dx + dy * dy);
    const currentLengthM = currentLengthPixels / getPixelsPerMeter(pixelsPerMm);
    
    // Scale the wall proportionally if length changed
    const angle = Math.atan2(dy, dx);
    const newLengthPixels = newLengthM * getPixelsPerMeter(pixelsPerMm);
    const newX2 = coords.x1 + Math.cos(angle) * newLengthPixels;
    const newY2 = coords.y1 + Math.sin(angle) * newLengthPixels;
    
    onUpdateShape(shape.id, {
      coordinates: {
        x1: coords.x1,
        y1: coords.y1,
        x2: newX2,
        y2: newY2,
      },
      thicknessMM: newThicknessMm,
      heightMM: newHeightMm,
    });
    
    setIsEditingDimensions(false);
    toast.success('Dimensioner uppdaterade!');
  };
  
  return (
    <div
      className="fixed top-0 right-0 h-screen w-96 bg-white border-l-4 border-blue-500 shadow-2xl z-[100] flex flex-col"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        borderLeft: '4px solid #3b82f6'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-blue-50">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-lg text-blue-900">Objektdetaljer</h3>
          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {shape.type.toUpperCase()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                Spara
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              Redigera
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Type & Name */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700">Typ</Label>
            <div className="mt-2">
              <Badge variant={shape.type === 'wall' || shape.type === 'room' ? 'default' : 'secondary'}>
                {type}
              </Badge>
            </div>
          </div>

          {(shape.type === 'room' || shape.name) && (
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">Namn</Label>
              <div className="mt-2">
                {isEditMode ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ange namn..."
                    className="w-full"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="font-semibold text-gray-800">
                      {shape.name || 'Namnlöst'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Dimensions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-700">Dimensioner</Label>
            </div>
            {isEditMode && (shape.type === 'wall' || shape.type === 'line') && !isEditingDimensions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDimensions(true)}
                className="h-7 px-2 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Ändra längd
              </Button>
            )}
          </div>
          
          <div className="space-y-2 bg-gray-50 rounded-lg p-3">
            {/* Show edit fields when editing wall/line dimensions */}
            {isEditingDimensions && (shape.type === 'wall' || shape.type === 'line') ? (
              <div className="space-y-4 pb-3 border-b border-gray-200">
                {/* Length */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1">
                    Längd (meter):
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editLengthM}
                    onChange={(e) => setEditLengthM(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="3.450"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Väggen skalas proportionellt från startpunkten
                  </p>
                </div>
                
                {/* Thickness */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1">
                    Tjocklek (mm):
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    value={editThicknessMm}
                    onChange={(e) => setEditThicknessMm(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="150"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard: 150mm (innerväggar), 200mm (ytterväggar)
                  </p>
                </div>
                
                {/* Height */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1">
                    Höjd (mm):
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    value={editHeightMm}
                    onChange={(e) => setEditHeightMm(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="2400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard: 2400mm (normal takhöjd)
                  </p>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveDimensions}
                    className="flex-1"
                  >
                    Spara ändringar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingDimensions(false)}
                    className="px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              displayValues.map((prop, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{prop.label}:</span>
                  <span className={`font-${prop.highlight ? 'semibold text-blue-600' : 'medium'}`}>
                    {prop.value}
                  </span>
                </div>
              ))
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-mono">ID:</span>
              <span className="text-xs text-gray-400 font-mono">
                {shape.id.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Visual Properties */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-gray-600" />
            <Label className="text-sm font-medium text-gray-700">Utseende</Label>
          </div>

          <div className="space-y-4 bg-gray-50 rounded-lg p-3">
            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-gray-600">Opacitet</Label>
                <span className="text-xs text-gray-500">{Math.round(opacity)}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={(value) => {
                  setOpacity(value[0]);
                  onUpdateShape(shape.id, { opacity: value[0] / 100 });
                }}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Rotation Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs text-gray-600 flex items-center gap-1">
                  <RotateCw className="h-3 w-3" />
                  Rotation
                </Label>
                <span className="text-xs text-gray-500">{rotation}°</span>
              </div>
              <Input
                type="number"
                value={rotation}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setRotation(value);
                  onUpdateShape(shape.id, { rotation: value });
                }}
                min={-360}
                max={360}
                step={1}
                className="h-8 text-sm"
              />
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Fyllning</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillColor.startsWith('#') ? fillColor : '#3b82f6'}
                    onChange={(e) => {
                      setFillColor(e.target.value);
                      onUpdateShape(shape.id, { color: e.target.value });
                    }}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <Input
                    value={fillColor}
                    onChange={(e) => {
                      setFillColor(e.target.value);
                      onUpdateShape(shape.id, { color: e.target.value });
                    }}
                    className="h-8 text-xs font-mono flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Kontur</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeColor.startsWith('#') ? strokeColor : '#1e40af'}
                    onChange={(e) => {
                      setStrokeColor(e.target.value);
                      onUpdateShape(shape.id, { strokeColor: e.target.value });
                    }}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <Input
                    value={strokeColor}
                    onChange={(e) => {
                      setStrokeColor(e.target.value);
                      onUpdateShape(shape.id, { strokeColor: e.target.value });
                    }}
                    className="h-8 text-xs font-mono flex-1"
                    placeholder="#1e40af"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Layer Controls */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-gray-600" />
            <Label className="text-sm font-medium text-gray-700">Lager-ordning</Label>
            <span className="text-xs text-gray-400 ml-auto">z: {shape.zIndex ?? 0}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                bringToFront(shape.id);
                toast.success('Flyttat längst fram');
              }}
              className="h-9 text-xs gap-1"
            >
              <ChevronsUp className="h-3 w-3" />
              Längst fram
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sendToBack(shape.id);
                toast.success('Flyttat längst bak');
              }}
              className="h-9 text-xs gap-1"
            >
              <ChevronsDown className="h-3 w-3" />
              Längst bak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                bringForward(shape.id);
                toast.success('Flyttat framåt');
              }}
              className="h-9 text-xs gap-1"
            >
              <ArrowUp className="h-3 w-3" />
              Framåt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sendBackward(shape.id);
                toast.success('Flyttat bakåt');
              }}
              className="h-9 text-xs gap-1"
            >
              <ArrowDown className="h-3 w-3" />
              Bakåt
            </Button>
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Beskrivning & Anteckningar
          </Label>
          <p className="text-xs text-gray-500 mt-1 mb-2">
            Lägg till instruktioner, material eller andra viktiga detaljer
          </p>
          {isEditMode ? (
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="T.ex. Vägg ska rivas, 10cm tjocklek, isolering behövs..."
              className="min-h-[120px] resize-y"
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 min-h-[120px]">
              <span className="text-gray-800 whitespace-pre-wrap">
                {notes || 'Inga anteckningar än...'}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Sparas automatiskt efter 1 sekund
          </p>
        </div>

        <Separator />

        {/* Comments Section */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Kommentarer & Diskussion
          </Label>
          <CommentsSection
            drawingObjectId={shape.id}
            projectId={projectId}
          />
        </div>
        
        {/* Footer hint */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Tips:</strong> Dra objektet för att flytta, använd hörnen för att ändra storlek
          </p>
        </div>
      </div>
    </div>
  );
};
