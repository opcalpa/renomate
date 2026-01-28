import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, XCircle, Link as LinkIcon, Plus, Maximize2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PinterestBoardEmbed, parsePinterestBoardUrl } from "@/components/pinterest";
import { fetchPinterestPin, parsePinterestPinUrl } from "@/services/pinterestOEmbed";
import { PhotoCarousel } from "@/components/ui/photo-carousel";
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
  const [pinterestDialogOpen, setPinterestDialogOpen] = useState(false);
  const [pinterestUrlInput, setPinterestUrlInput] = useState("");
  const [pinterestUrlError, setPinterestUrlError] = useState<string | null>(null);
  const [pinterestBoardUrl, setPinterestBoardUrl] = useState<string | null>(null);
  const [savingPinterest, setSavingPinterest] = useState(false);

  // Pin import state
  const [pinImportDialogOpen, setPinImportDialogOpen] = useState(false);
  const [pinUrlInput, setPinUrlInput] = useState("");
  const [pinUrlError, setPinUrlError] = useState<string | null>(null);
  const [importingPin, setImportingPin] = useState(false);

  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  const loadPinterestBoardUrl = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("pinterest_board_url")
        .eq("id", roomId)
        .single();

      if (error) throw error;
      setPinterestBoardUrl(data?.pinterest_board_url || null);
    } catch (error) {
      console.error("Error loading Pinterest board URL:", error);
    }
  }, [roomId]);

  useEffect(() => {
    loadPhotos();
    loadPinterestBoardUrl();
  }, [loadPhotos, loadPinterestBoardUrl]);

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

      // Get profile ID (foreign key requires profile.id, not auth.uid)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profil hittades inte");
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
          uploaded_by_user_id: profile.id,
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

  const handleAddPinterestBoard = () => {
    setPinterestUrlInput(pinterestBoardUrl || "");
    setPinterestUrlError(null);
    setPinterestDialogOpen(true);
  };

  const savePinterestBoardToDb = async (url: string | null) => {
    setSavingPinterest(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ pinterest_board_url: url })
        .eq("id", roomId);

      if (error) throw error;

      setPinterestBoardUrl(url);
      return true;
    } catch (error) {
      console.error("Error saving Pinterest board URL:", error);
      toast.error("Kunde inte spara Pinterest board");
      return false;
    } finally {
      setSavingPinterest(false);
    }
  };

  const handleSavePinterestBoard = async () => {
    const url = pinterestUrlInput.trim();

    if (!url) {
      // Allow clearing the URL
      const success = await savePinterestBoardToDb(null);
      if (success) {
        setPinterestDialogOpen(false);
        toast.success("Pinterest board borttagen");
      }
      return;
    }

    // Validate URL
    const parsed = parsePinterestBoardUrl(url);
    if (!parsed) {
      setPinterestUrlError("Ogiltig Pinterest board URL. Använd format: pinterest.com/användare/board-namn");
      return;
    }

    const success = await savePinterestBoardToDb(url);
    if (success) {
      setPinterestDialogOpen(false);
      toast.success("Pinterest board tillagd!");
    }
  };

  const handleRemovePinterestBoard = async () => {
    if (confirm("Är du säker på att du vill ta bort Pinterest board?")) {
      const success = await savePinterestBoardToDb(null);
      if (success) {
        toast.success("Pinterest board borttagen");
      }
    }
  };

  // Pin import handlers
  const handleOpenPinImport = () => {
    setPinUrlInput("");
    setPinUrlError(null);
    setPinImportDialogOpen(true);
  };

  const handleImportPin = async () => {
    const url = pinUrlInput.trim();

    if (!url) {
      setPinUrlError("Ange en Pinterest pin URL");
      return;
    }

    // Validate URL format first
    if (!parsePinterestPinUrl(url)) {
      setPinUrlError("Ogiltig Pinterest pin URL. Använd format: pinterest.com/pin/123456789/");
      return;
    }

    setImportingPin(true);
    setPinUrlError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du måste vara inloggad");
        return;
      }

      // Get profile ID (foreign key requires profile.id, not auth.uid)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profil hittades inte");
        return;
      }

      // Fetch pin data via oEmbed
      const pinData = await fetchPinterestPin(url);

      // Save to database
      const { error } = await supabase.from("photos").insert({
        linked_to_type: "room",
        linked_to_id: roomId,
        url: pinData.imageUrl,
        caption: pinData.title,
        uploaded_by_user_id: profile.id,
        source: "pinterest",
        source_url: pinData.sourceUrl,
        pinterest_pin_id: pinData.pinId,
      });

      if (error) throw error;

      toast.success("Pin importerad!");
      setPinImportDialogOpen(false);
      loadPhotos();
    } catch (error) {
      console.error("Error importing pin:", error);
      if (error instanceof Error) {
        setPinUrlError(error.message);
      } else {
        toast.error("Kunde inte importera pin");
      }
    } finally {
      setImportingPin(false);
    }
  };

  // Carousel handlers
  const openCarousel = (index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
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

      {/* Pinterest Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleOpenPinImport}
          className="flex-1 gap-2 border-[#E60023]/30 text-[#E60023] hover:bg-[#E60023]/5 hover:border-[#E60023]"
        >
          <PinterestLogo className="h-4 w-4" />
          Importera Pin
        </Button>
        <Button
          variant="outline"
          onClick={handleAddPinterestBoard}
          className="flex-1 gap-2 border-[#E60023]/30 text-[#E60023] hover:bg-[#E60023]/5 hover:border-[#E60023] opacity-70"
        >
          <Plus className="h-4 w-4" />
          {pinterestBoardUrl ? "Ändra Board" : "Länka Board"}
        </Button>
      </div>

      {/* Pinterest Pin Import Dialog */}
      <Dialog open={pinImportDialogOpen} onOpenChange={setPinImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PinterestLogo className="h-5 w-5 text-[#E60023]" />
              Importera Pinterest Pin
            </DialogTitle>
            <DialogDescription>
              Klistra in länken till en Pinterest pin för att importera bilden till detta rum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin-url">Pin URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="pin-url"
                  placeholder="pinterest.com/pin/123456789/"
                  value={pinUrlInput}
                  onChange={(e) => {
                    setPinUrlInput(e.target.value);
                    setPinUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !importingPin) {
                      handleImportPin();
                    }
                  }}
                  className="pl-9"
                  disabled={importingPin}
                />
              </div>
              {pinUrlError && (
                <p className="text-sm text-red-500">{pinUrlError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Öppna en pin på Pinterest och kopiera URL:en från webbläsaren.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinImportDialogOpen(false)} disabled={importingPin}>
              Avbryt
            </Button>
            <Button onClick={handleImportPin} disabled={importingPin}>
              {importingPin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importerar...
                </>
              ) : (
                "Importera"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pinterest Board URL Dialog */}
      <Dialog open={pinterestDialogOpen} onOpenChange={setPinterestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PinterestLogo className="h-5 w-5 text-[#E60023]" />
              Pinterest Inspiration Board
            </DialogTitle>
            <DialogDescription>
              Klistra in länken till din Pinterest board för att visa den som inspiration för detta rum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pinterest-url">Board URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="pinterest-url"
                    placeholder="pinterest.com/användare/board-namn"
                    value={pinterestUrlInput}
                    onChange={(e) => {
                      setPinterestUrlInput(e.target.value);
                      setPinterestUrlError(null);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              {pinterestUrlError && (
                <p className="text-sm text-red-500">{pinterestUrlError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Öppna din Pinterest board och kopiera URL:en från webbläsaren.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {pinterestBoardUrl && (
              <Button
                variant="ghost"
                onClick={() => {
                  setPinterestUrlInput("");
                  handleSavePinterestBoard();
                }}
                disabled={savingPinterest}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Ta bort board
              </Button>
            )}
            <Button variant="outline" onClick={() => setPinterestDialogOpen(false)} disabled={savingPinterest}>
              Avbryt
            </Button>
            <Button onClick={handleSavePinterestBoard} disabled={savingPinterest}>
              {savingPinterest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                "Spara"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photos Grid (imported pins + uploads) */}
      {loadingPhotos ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : photos.length > 0 ? (
        <ScrollArea className="h-48">
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => openCarousel(index)}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Rumsbild"}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 transition-all group-hover:brightness-90"
                />
                {/* Expand icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2">
                    <Maximize2 className="h-5 w-5 text-white" />
                  </div>
                </div>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id, photo.url);
                  }}
                  className="
                    absolute top-2 right-2
                    opacity-0 group-hover:opacity-100
                    transition-opacity
                    bg-red-500 hover:bg-red-600
                    text-white rounded-full p-1.5
                    z-10
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

      {/* Pinterest Board Embed (secondary - for browsing inspiration) */}
      {pinterestBoardUrl && (
        <PinterestBoardEmbed
          boardUrl={pinterestBoardUrl}
          onRemove={handleRemovePinterestBoard}
          editable={true}
        />
      )}

      {/* Photo Carousel/Lightbox */}
      <PhotoCarousel
        photos={photos}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
      />
    </div>
  );
}
