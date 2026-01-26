import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PinterestPicker, type SelectedPin } from "@/components/pinterest";
import { isPinterestConfigured } from "@/services/pinterest";
import type { Photo } from "./types";

// Pinterest Logo SVG
const PinterestLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

interface PhotoSectionProps {
  roomId: string;
}

export function PhotoSection({ roomId }: PhotoSectionProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pinterestPickerOpen, setPinterestPickerOpen] = useState(false);
  const [importingPins, setImportingPins] = useState(false);

  const loadPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("linked_to_type", "room")
        .eq("linked_to_id", roomId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos((data as Photo[]) || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Kunde inte ladda bilder");
    } finally {
      setLoadingPhotos(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du måste vara inloggad för att ladda upp bilder");
        return;
      }

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} är inte en bild`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} är för stor (max 10MB)`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${roomId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("room-photos")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Kunde inte ladda upp ${file.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("room-photos").getPublicUrl(fileName);

        const { error: dbError } = await supabase.from("photos").insert({
          linked_to_type: "room",
          linked_to_id: roomId,
          url: publicUrl,
          caption: file.name,
          uploaded_by_user_id: user.id,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Kunde inte spara ${file.name}`);
          continue;
        }
      }

      toast.success("Bilder uppladdade!");
      loadPhotos();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Kunde inte ladda upp bilder");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna bild?")) return;

    try {
      const urlParts = photoUrl.split("/room-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: storageError } = await supabase.storage
          .from("room-photos")
          .remove([filePath]);

        if (storageError) {
          console.warn("Could not delete from storage:", storageError);
        }
      }

      const { error: dbError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photoId);

      if (dbError) throw dbError;

      toast.success("Bild borttagen");
      loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Kunde inte ta bort bild");
    }
  };

  const handlePinterestImport = async (selectedPins: SelectedPin[]) => {
    if (selectedPins.length === 0) return;

    setImportingPins(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du måste vara inloggad");
        return;
      }

      let successCount = 0;
      for (const pin of selectedPins) {
        const { error } = await supabase.from("photos").insert({
          linked_to_type: "room",
          linked_to_id: roomId,
          url: pin.imageUrl,
          caption: pin.title || "Pinterest import",
          uploaded_by_user_id: user.id,
          source: "pinterest",
          source_url: pin.sourceUrl,
          pinterest_pin_id: pin.pinId,
        });

        if (!error) {
          successCount++;
        } else {
          console.error("Error importing pin:", error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'bild' : 'bilder'} importerade från Pinterest`);
        loadPhotos();
      } else {
        toast.error("Kunde inte importera bilder");
      }
    } catch (error) {
      console.error("Pinterest import error:", error);
      toast.error("Ett fel uppstod vid import");
    } finally {
      setImportingPins(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-600" />
          <Label>Bilder</Label>
        </div>
        <div className="text-xs text-gray-500">
          {photos.length} {photos.length === 1 ? "bild" : "bilder"}
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
            ${
              uploading
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
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

      {/* Pinterest Import Button */}
      {isPinterestConfigured() && (
        <Button
          variant="outline"
          onClick={() => setPinterestPickerOpen(true)}
          disabled={importingPins}
          className="w-full gap-2 border-[#E60023]/30 text-[#E60023] hover:bg-[#E60023]/5 hover:border-[#E60023]"
        >
          {importingPins ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PinterestLogo className="h-4 w-4" />
          )}
          {importingPins ? "Importerar..." : "Importera från Pinterest"}
        </Button>
      )}

      {/* Pinterest Picker Dialog */}
      <PinterestPicker
        open={pinterestPickerOpen}
        onOpenChange={setPinterestPickerOpen}
        onSelect={handlePinterestImport}
        multiSelect={true}
        maxSelect={20}
      />

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
                  alt={photo.caption || "Rumsbild"}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                {/* Pinterest badge */}
                {photo.source === 'pinterest' && (
                  <div
                    className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm"
                    title="Importerad från Pinterest"
                  >
                    <PinterestLogo className="h-3.5 w-3.5 text-[#E60023]" />
                  </div>
                )}
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
  );
}
