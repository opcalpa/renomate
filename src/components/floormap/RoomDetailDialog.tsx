import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { Home, Ruler, Loader2, Save, X, Trash2, Palette, Check, Upload, Image as ImageIcon, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFloorMapStore } from "./store";

interface Room {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color?: string | null;
  material?: string | null;
  wall_color?: string | null;
  ceiling_color?: string | null;
  trim_color?: string | null;
  dimensions: {
    area_sqm?: number;
    width_mm?: number;
    height_mm?: number;
    perimeter_mm?: number;
  } | null;
  floor_plan_position: {
    points?: { x: number; y: number }[];
  } | null;
  created_at: string;
  updated_at: string;
}

interface RoomDetailDialogProps {
  room: Room | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomUpdated?: () => void;
}

export const RoomDetailDialog = ({
  room,
  projectId,
  open,
  onOpenChange,
  onRoomUpdated,
}: RoomDetailDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("rgba(59, 130, 246, 0.2)"); // Default blue
  const [tempColor, setTempColor] = useState("rgba(59, 130, 246, 0.2)"); // Temp for popup
  const [material, setMaterial] = useState("");
  const [wallColor, setWallColor] = useState("");
  const [ceilingColor, setCeilingColor] = useState("");
  const [trimColor, setTrimColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // Get store functions to update canvas
  const { updateShape, shapes } = useFloorMapStore();

  useEffect(() => {
    if (room) {
      setName(room.name);
      setDescription(room.description || "");
      const roomColor = room.color || "rgba(59, 130, 246, 0.2)";
      setColor(roomColor);
      setTempColor(roomColor); // Initialize temp color
      setMaterial(room.material || "");
      setWallColor(room.wall_color || "");
      setCeilingColor(room.ceiling_color || "");
      setTrimColor(room.trim_color || "");
      loadPhotos();
    }
  }, [room]);

  const loadPhotos = async () => {
    if (!room) return;
    
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('linked_to_type', 'room')
        .eq('linked_to_id', room.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Error loading photos:', error);
      toast.error('Kunde inte ladda bilder');
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Helper function to get darker version for stroke (70% darker)
  const getDarkerColor = (rgbaColor: string): string => {
    const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = Math.floor(parseInt(match[1]) * 0.7);
      const g = Math.floor(parseInt(match[2]) * 0.7);
      const b = Math.floor(parseInt(match[3]) * 0.7);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    }
    return rgbaColor;
  };

  const handleSave = async () => {
    if (!room || !name.trim()) {
      toast.error("Rumsnamn krävs");
      return;
    }

    setSaving(true);
    try {
      // Update rooms table
      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          color: color,
          material: material.trim() || null,
          wall_color: wallColor.trim() || null,
          ceiling_color: ceilingColor.trim() || null,
          trim_color: trimColor.trim() || null,
        })
        .eq("id", room.id);

      if (roomError) throw roomError;

      // Update floor_map_shapes table (the shape on canvas)
      const { error: shapeError } = await supabase
        .from("floor_map_shapes")
        .update({
          color: color,
          stroke_color: getDarkerColor(color),
        })
        .eq("room_id", room.id);

      // Shape color update error is non-critical

      // Update canvas state immediately
      const roomShape = shapes.find(s => s.roomId === room.id && s.type === 'room');
      if (roomShape) {
        updateShape(roomShape.id, {
          color: color,
          strokeColor: getDarkerColor(color),
          name: name.trim(), // Also update name
        });
      }

      toast.success("Rum uppdaterat!");
      onRoomUpdated?.();
    } catch (error: any) {
      console.error("Error updating room:", error);
      toast.error("Kunde inte uppdatera rum");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Är du säker på att du vill ta bort detta rum? Denna åtgärd kan inte ångras.")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", room.id);

      if (error) throw error;

      toast.success("Rum borttaget!");
      onRoomUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast.error("Kunde inte ta bort rum");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !room) return;

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Du måste vara inloggad för att ladda upp bilder');
        return;
      }

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} är inte en bild`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} är för stor (max 10MB)`);
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${room.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('room-photos')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Kunde inte ladda upp ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('room-photos')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('photos')
          .insert({
            linked_to_type: 'room',
            linked_to_id: room.id,
            url: publicUrl,
            caption: file.name,
            uploaded_by_user_id: user.id,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast.error(`Kunde inte spara ${file.name}`);
          continue;
        }
      }

      toast.success('Bilder uppladdade!');
      loadPhotos(); // Reload photos
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Kunde inte ladda upp bilder');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna bild?')) return;

    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/room-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('room-photos')
          .remove([filePath]);

        if (storageError) {
          console.warn('Could not delete from storage:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success('Bild borttagen');
      loadPhotos(); // Reload photos
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Kunde inte ta bort bild');
    }
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <DialogTitle>Rumsdetaljer</DialogTitle>
          </div>
          <DialogDescription>
            Redigera rumsinformation och lägg till kommentarer
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Rumsnamn *</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Vardagsrum, Kök, Sovrum 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-description">Rumsbeskrivning</Label>
              <Textarea
                id="room-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv rummet, dess funktioner, planer för renovering..."
                rows={4}
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-600" />
                  <Label>Bilder</Label>
                </div>
                <div className="text-xs text-gray-500">
                  {photos.length} {photos.length === 1 ? 'bild' : 'bilder'}
                </div>
              </div>

              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`
                    flex items-center justify-center gap-2 w-full h-24
                    border-2 border-dashed rounded-lg
                    transition-all cursor-pointer
                    ${uploading 
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }
                  `}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Laddar upp...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-gray-400" />
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">
                          Klicka för att ladda upp bilder
                        </div>
                        <div className="text-xs text-gray-500">
                          PNG, JPG, GIF upp till 10MB
                        </div>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Photos Grid */}
              {loadingPhotos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : photos.length > 0 ? (
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Rumsbild'}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeletePhoto(photo.id, photo.url)}
                          className="
                            absolute top-2 right-2
                            opacity-0 group-hover:opacity-100
                            transition-opacity
                            bg-red-500 hover:bg-red-600
                            text-white rounded-full p-1.5
                          "
                          title="Ta bort bild"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        {/* Caption */}
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg truncate">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Inga bilder uppladdade än</p>
                </div>
              )}
            </div>

            {/* Material & Color Fields */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="room-material">Material</Label>
                <Input
                  id="room-material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="t.ex. Trägolv, klinker, parkettgolv..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-wall-color">Väggfärg</Label>
                <Input
                  id="room-wall-color"
                  value={wallColor}
                  onChange={(e) => setWallColor(e.target.value)}
                  placeholder="t.ex. Vit, NCS S 0502-Y, Alcro Silkesvit..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-ceiling-color">Takfärg</Label>
                <Input
                  id="room-ceiling-color"
                  value={ceilingColor}
                  onChange={(e) => setCeilingColor(e.target.value)}
                  placeholder="t.ex. Vit, NCS S 0500-N..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-trim-color">Snickerifärg</Label>
                <Input
                  id="room-trim-color"
                  value={trimColor}
                  onChange={(e) => setTrimColor(e.target.value)}
                  placeholder="t.ex. Vit, Alkov gråblå, NCS S 1000-N..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-gray-600" />
                <Label>Rumsfärg på ritning</Label>
              </div>
              
              {/* Color selector with popover */}
              <Popover 
                open={colorPopoverOpen} 
                onOpenChange={(open) => {
                  setColorPopoverOpen(open);
                  if (open) {
                    setTempColor(color); // Reset temp to current when opening
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-16 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center gap-3 px-4"
                  >
                    <div 
                      className="w-12 h-12 rounded-lg border-2"
                      style={{ 
                        backgroundColor: color,
                        borderColor: getDarkerColor(color)
                      }}
                    />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Vald färg</div>
                      <div className="text-xs text-gray-500">Klicka för att ändra</div>
                    </div>
                    <Palette className="h-5 w-5 text-gray-400" />
                  </button>
                </PopoverTrigger>
                
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-3">
                    <div className="font-medium text-sm">Välj rumsfärg</div>
                    
                    {/* Color palette grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Blå', color: 'rgba(59, 130, 246, 0.2)', hex: '#3b82f6' },
                        { name: 'Grön', color: 'rgba(16, 185, 129, 0.2)', hex: '#10b981' },
                        { name: 'Orange', color: 'rgba(245, 158, 11, 0.2)', hex: '#f59e0b' },
                        { name: 'Lila', color: 'rgba(168, 85, 247, 0.2)', hex: '#a855f7' },
                        { name: 'Rosa', color: 'rgba(236, 72, 153, 0.2)', hex: '#ec4899' },
                        { name: 'Cyan', color: 'rgba(6, 182, 212, 0.2)', hex: '#06b6d4' },
                        { name: 'Gul', color: 'rgba(251, 191, 36, 0.2)', hex: '#fbbf24' },
                        { name: 'Grå', color: 'rgba(100, 116, 139, 0.2)', hex: '#64748b' },
                      ].map((colorOption) => (
                        <button
                          key={colorOption.hex}
                          type="button"
                          onClick={() => setTempColor(colorOption.color)}
                          className={`
                            relative h-16 rounded-lg border-2 transition-all hover:scale-105
                            ${tempColor === colorOption.color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
                          `}
                          style={{ backgroundColor: colorOption.color }}
                        >
                          {/* Darker border preview */}
                          <div 
                            className="absolute inset-0 rounded-lg border-4 pointer-events-none"
                            style={{ borderColor: getDarkerColor(colorOption.color) }}
                          />
                          
                          {/* Checkmark if selected */}
                          {tempColor === colorOption.color && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <Check className="h-6 w-6 text-blue-600 bg-white rounded-full p-1" />
                            </div>
                          )}
                          
                          {/* Color name */}
                          <div className="absolute bottom-0 left-0 right-0 bg-white/90 text-xs py-0.5 text-center rounded-b-lg pointer-events-none">
                            {colorOption.name}
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempColor(color); // Reset to original
                          setColorPopoverOpen(false);
                        }}
                        className="flex-1"
                      >
                        Avbryt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setColor(tempColor); // Apply temp color
                          setColorPopoverOpen(false);
                        }}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Använd färg
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Dimensions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">Dimensioner</Label>
            </div>

            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              {room.dimensions?.area_sqm && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Yta:</span>
                  <span className="font-semibold text-blue-600 text-lg">
                    {room.dimensions.area_sqm.toFixed(2)} m²
                  </span>
                </div>
              )}

              {room.dimensions?.perimeter_mm && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Omkrets:</span>
                  <span className="font-medium">
                    {(room.dimensions.perimeter_mm / 1000).toFixed(2)} m
                  </span>
                </div>
              )}

              {room.floor_plan_position?.points && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Antal hörn:</span>
                  <span className="font-medium">
                    {room.floor_plan_position.points.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Kommentarer & Diskussion
            </Label>
            <CommentsSection
              entityId={room.id}
              entityType="room"
              projectId={projectId}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Spara ändringar
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Ta bort rum
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Stäng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
