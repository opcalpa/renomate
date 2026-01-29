import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, XCircle, Maximize2, Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PhotoCarousel } from "@/components/ui/photo-carousel";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  source?: string;
  created_at: string;
}

interface EntityPhotoGalleryProps {
  entityId: string;
  entityType: "task" | "room" | "material" | "shape";
  storagePath?: string;
}

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

export function EntityPhotoGallery({ entityId, entityType, storagePath }: EntityPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const bucket = storagePath || "project-files";
  const folder = `${entityType}-photos`;

  const loadPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("linked_to_type", entityType)
        .eq("linked_to_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos((data as Photo[]) || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Kunde inte ladda bilder");
    } finally {
      setLoadingPhotos(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du måste vara inloggad för att ladda upp bilder");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profil hittades inte");
        return;
      }

      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} är inte en bild`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} är för stor (max 10MB)`);
          continue;
        }

        const compressed = await compressImage(file);
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${folder}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressed);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Kunde inte ladda upp ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

        const { error: dbError } = await supabase.from("photos").insert({
          linked_to_type: entityType,
          linked_to_id: entityId,
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
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      uploadFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna bild?")) return;

    try {
      const urlParts = photoUrl.split(`/${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from(bucket).remove([filePath]);
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

      <div className="flex gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2"
          disabled={uploading}
          onClick={() => cameraInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Ta foto
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Ladda upp
        </Button>
      </div>

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
                onClick={() => {
                  setCarouselIndex(index);
                  setCarouselOpen(true);
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Bild"}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 transition-all group-hover:brightness-90"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2">
                    <Maximize2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(photo.id, photo.url);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 z-10"
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

      <PhotoCarousel
        photos={photos}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
      />
    </div>
  );
}
