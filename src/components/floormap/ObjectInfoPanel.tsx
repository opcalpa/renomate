import React, { useState, useEffect, useMemo } from 'react';
import { X, Ruler, FileText, Edit2, Home, Loader2, Save, Trash2, Palette, Check, Upload, Image as ImageIcon, XCircle, MessageSquare, Settings } from 'lucide-react';
import { FloorMapShape, Room } from './types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFloorMapStore } from './store';

interface ObjectInfoPanelProps {
  shape: FloorMapShape;
  projectId: string;
  onClose: () => void;
  onUpdateShape: (shapeId: string, updates: Partial<FloorMapShape>) => void;
  pixelsPerMm: number;
  roomData?: Room | null; // Optional room data for room objects
}

export const ObjectInfoPanel: React.FC<ObjectInfoPanelProps> = ({
  shape,
  projectId,
  onClose,
  onUpdateShape,
  pixelsPerMm,
  roomData
}) => {
  // State for general object properties
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState(shape.name || '');
  const [notes, setNotes] = useState(shape.notes || '');
  const [isEditingDimensions, setIsEditingDimensions] = useState(false);

  // State for room-specific properties
  const [roomName, setRoomName] = useState(roomData?.name || '');
  const [roomDescription, setRoomDescription] = useState(roomData?.description || '');
  const [roomColor, setRoomColor] = useState(roomData?.color || '#e5e7eb');
  const [roomMaterial, setRoomMaterial] = useState(roomData?.material || '');
  const [wallColor, setWallColor] = useState(roomData?.wall_color || '#ffffff');
  const [ceilingColor, setCeilingColor] = useState(roomData?.ceiling_color || '#ffffff');
  const [trimColor, setTrimColor] = useState(roomData?.trim_color || '#ffffff');
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dimension state
  const [editLengthM, setEditLengthM] = useState('0');
  const [editThicknessMm, setEditThicknessMm] = useState('150');
  const [editHeightMm, setEditHeightMm] = useState('2400');
  const [editWidthM, setEditWidthM] = useState('0');
  const [editAreaSqm, setEditAreaSqm] = useState('0');

  const getPixelsPerMeter = (pxPerMm: number) => pxPerMm * 1000;

  // Initialize values when shape changes
  useEffect(() => {
    setEditName(shape.name || '');
    setNotes(shape.notes || '');

    // Room data
    setRoomName(roomData?.name || '');
    setRoomDescription(roomData?.description || '');
    setRoomColor(roomData?.color || '#e5e7eb');
    setRoomMaterial(roomData?.material || '');
    setWallColor(roomData?.wall_color || '#ffffff');
    setCeilingColor(roomData?.ceiling_color || '#ffffff');
    setTrimColor(roomData?.trim_color || '#ffffff');

    // Calculate initial values based on shape type
    if (shape.type === 'wall' || shape.type === 'line') {
      const coords = shape.coordinates as any;
      if (coords.x1 !== undefined && coords.y1 !== undefined && coords.x2 !== undefined && coords.y2 !== undefined) {
        const dx = coords.x2 - coords.x1;
        const dy = coords.y2 - coords.y1;
        const lengthPixels = Math.sqrt(dx * dx + dy * dy);
        const lengthMm = lengthPixels / pixelsPerMm;
        const lengthM = (lengthMm / 1000).toFixed(2);
        setEditLengthM(lengthM);
        setEditThicknessMm(shape.strokeWidth ? (shape.strokeWidth / pixelsPerMm).toFixed(0) : '150');
      }
    } else if (shape.type === 'room') {
      // Room dimensions
      const area = roomData?.dimensions?.area_sqm || 0;
      const width = roomData?.dimensions?.width_mm || 0;
      const height = roomData?.dimensions?.height_mm || 2400;
      setEditAreaSqm(area.toFixed(2));
      setEditWidthM((width / 1000).toFixed(2));
      setEditHeightMm(height.toString());
    } else {
      // Template objects - use template dimensions if available
      const templateData = shape.templateData;
      if (templateData?.width) {
        setEditWidthM((templateData.width / 1000).toFixed(2));
      }
      if (templateData?.height) {
        setEditHeightMm(templateData.height.toString());
      }
      if (templateData?.thickness) {
        setEditThicknessMm(templateData.thickness.toString());
      }
    }
  }, [shape, roomData, pixelsPerMm]);

  // Load room images
  useEffect(() => {
    if (shape.type === 'room' && roomData?.id) {
      loadRoomImages();
    }
  }, [shape.type, roomData?.id]);

  const loadRoomImages = async () => {
    if (!roomData?.id) return;

    try {
      const { data, error } = await supabase
        .from('room_photos')
        .select('photo_url')
        .eq('room_id', roomData.id);

      if (error) throw error;
      setRoomImages(data?.map(item => item.photo_url) || []);
    } catch (error) {
      console.error('Error loading room images:', error);
    }
  };

  // Save general object properties
  const saveObjectProperties = () => {
    const updates: Partial<FloorMapShape> = {
      name: editName,
      notes: notes
    };
    onUpdateShape(shape.id, updates);
    setIsEditMode(false);
    toast.success('Objektegenskaper sparade');
  };

  // Save room properties
  const saveRoomProperties = async () => {
    if (!roomData?.id) return;

    setIsSaving(true);
    try {
      const updates = {
        name: roomName,
        description: roomDescription,
        color: roomColor,
        material: roomMaterial,
        wall_color: wallColor,
        ceiling_color: ceilingColor,
        trim_color: trimColor,
        dimensions: {
          ...roomData.dimensions,
          height_mm: parseFloat(editHeightMm) || 2400
        }
      };

      const { error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', roomData.id);

      if (error) throw error;

      // Update the shape with new room data
      onUpdateShape(shape.id, {
        name: roomName,
        notes: roomDescription
      });

      toast.success('Rumsegenskaper sparade');
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error('Kunde inte spara rumsegenskaper');
    } finally {
      setIsSaving(false);
    }
  };

  // Upload room image
  const handleImageUpload = async (file: File) => {
    if (!roomData?.id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${roomData.id}_${Date.now()}.${fileExt}`;
      const filePath = `room-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('room_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('room_photos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('room_photos')
        .insert({
          room_id: roomData.id,
          photo_url: publicUrl,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      setRoomImages(prev => [...prev, publicUrl]);
      toast.success('Bild uppladdad');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Kunde inte ladda upp bild');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove room image
  const removeImage = async (imageUrl: string) => {
    if (!roomData?.id) return;

    try {
      const { error } = await supabase
        .from('room_photos')
        .delete()
        .eq('room_id', roomData.id)
        .eq('photo_url', imageUrl);

      if (error) throw error;

      setRoomImages(prev => prev.filter(url => url !== imageUrl));
      toast.success('Bild borttagen');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Kunde inte ta bort bild');
    }
  };

  const getShapeTitle = () => {
    switch (shape.type) {
      case 'wall': return 'Vägg';
      case 'room': return 'Rum';
      case 'rectangle': return 'Rektangel';
      case 'circle': return 'Cirkel';
      case 'text': return 'Text';
      case 'library_symbol':
      case 'object_library':
        return shape.name || 'Objekt från bibliotek';
      default: return 'Objekt';
    }
  };

  const getShapeColor = () => {
    if (shape.type === 'room') return roomColor;
    return shape.stroke || '#333333';
  };

  const renderGeneralProperties = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Objektegenskaper
        </h3>
        {!isEditMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(true)}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Redigera
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditMode(false);
                setEditName(shape.name || '');
                setNotes(shape.notes || '');
              }}
            >
              Avbryt
            </Button>
            <Button
              size="sm"
              onClick={saveObjectProperties}
            >
              <Save className="h-4 w-4 mr-2" />
              Spara
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="object-name">Namn</Label>
          <Input
            id="object-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={!isEditMode}
            placeholder="Ange namn..."
          />
        </div>

        <div>
          <Label htmlFor="object-notes">Beskrivning</Label>
          <Textarea
            id="object-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditMode}
            placeholder="Ange beskrivning..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderDimensions = () => {
    if (shape.type === 'wall' || shape.type === 'line') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Dimensioner
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Längd (m)</Label>
              <Input
                value={editLengthM}
                onChange={(e) => setEditLengthM(e.target.value)}
                disabled={!isEditingDimensions}
              />
            </div>
            <div>
              <Label>Tjocklek (mm)</Label>
              <Input
                value={editThicknessMm}
                onChange={(e) => setEditThicknessMm(e.target.value)}
                disabled={!isEditingDimensions}
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingDimensions(!isEditingDimensions)}
          >
            {isEditingDimensions ? 'Avbryt' : 'Ändra dimensioner'}
          </Button>
        </div>
      );
    }

    if (shape.type === 'room') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Rumdimensioner
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Yta (m²)</Label>
              <Input value={editAreaSqm} disabled />
            </div>
            <div>
              <Label>Takhöjd (mm)</Label>
              <Input
                value={editHeightMm}
                onChange={(e) => setEditHeightMm(e.target.value)}
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderRoomSpecificProperties = () => {
    if (shape.type !== 'room') return null;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Home className="h-5 w-5" />
            Rumsinformation
          </h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="room-name">Rumsnamn</Label>
              <Input
                id="room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ange rumsnamn..."
              />
            </div>

            <div>
              <Label htmlFor="room-description">Beskrivning</Label>
              <Textarea
                id="room-description"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Beskriv rummet..."
                rows={3}
              />
            </div>

            <div>
              <Label>Material</Label>
              <Input
                value={roomMaterial}
                onChange={(e) => setRoomMaterial(e.target.value)}
                placeholder="t.ex. Trä, Betong, etc."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Färgschema</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Label>Golv:</Label>
              <input
                type="color"
                value={roomColor}
                onChange={(e) => setRoomColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm">{roomColor}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label>Väggar:</Label>
              <input
                type="color"
                value={wallColor}
                onChange={(e) => setWallColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm">{wallColor}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label>Tak:</Label>
              <input
                type="color"
                value={ceilingColor}
                onChange={(e) => setCeilingColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm">{ceilingColor}</span>
            </div>

            <div className="flex items-center gap-2">
              <Label>Lister:</Label>
              <input
                type="color"
                value={trimColor}
                onChange={(e) => setTrimColor(e.target.value)}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm">{trimColor}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Bilder ({roomImages.length})
          </h3>

          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
                id="room-image-upload"
              />
              <label htmlFor="room-image-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isUploading ? 'Laddar upp...' : 'Klicka för att ladda upp bild'}
                </p>
              </label>
            </div>

            {roomImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {roomImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Room photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={saveRoomProperties}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spara rumsegenskaper
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-2xl z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-blue-50">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: getShapeColor() }}
          />
          <div>
            <h2 className="text-lg font-semibold text-blue-900">
              {getShapeTitle().toUpperCase()}
            </h2>
            <p className="text-sm text-blue-600">
              {shape.name || `${shape.type} - ${shape.id.slice(-6)}`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* General Properties */}
          {renderGeneralProperties()}

          {/* Dimensions */}
          {renderDimensions()}

          {/* Room-specific Properties */}
          {renderRoomSpecificProperties()}

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Kommentarer
            </h3>
            <CommentsSection
              projectId={projectId}
              shapeId={shape.id}
              shapeType={shape.type}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};