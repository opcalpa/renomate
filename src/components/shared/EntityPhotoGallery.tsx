import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, XCircle, Maximize2, Camera, FileText, Paperclip, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PhotoCarousel } from "@/components/ui/photo-carousel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  source?: string;
  mime_type?: string;
  created_at: string;
}

const isImageFile = (file: File) => file.type.startsWith("image/");
const isImageUrl = (photo: Photo) =>
  !photo.mime_type || photo.mime_type.startsWith("image/");

interface EntityPhotoGalleryProps {
  entityId: string;
  entityType: "task" | "room" | "material" | "shape";
  projectId?: string;
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

export function EntityPhotoGallery({ entityId, entityType, projectId, storagePath }: EntityPhotoGalleryProps) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const bucket = storagePath || "project-files";
  const useProjectPath = !!projectId;
  const legacyFolder = `${entityType}-photos`;

  const loadPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from("photos")
        .select("id, url, caption, source, mime_type, created_at")
        .eq("linked_to_type", entityType)
        .eq("linked_to_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos((data as Photo[]) || []);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error(t('entityPhotos.loadError'));
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
        toast.error(t('entityPhotos.loginRequired'));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error(t('entityPhotos.profileNotFound'));
        return;
      }

      for (const file of fileArray) {
        const isImage = isImageFile(file);
        const isDocument = file.type === "application/pdf" || file.type.includes("word") || file.type === "text/plain";

        if (!isImage && !isDocument) {
          toast.error(t('entityPhotos.unsupportedFormat', { name: file.name }));
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(t('entityPhotos.fileTooLarge', { name: file.name }));
          continue;
        }

        const uploadFile = isImage ? await compressImage(file) : file;
        const fileExt = file.name.split(".").pop() || (isImage ? "jpg" : "pdf");
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fileName = useProjectPath
          ? `projects/${projectId}/attachments/${entityType}/${uniqueName}`
          : `${legacyFolder}/${entityId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, uploadFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(t('entityPhotos.uploadError', { name: file.name }));
          continue;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

        const { error: dbError } = await supabase.from("photos").insert({
          linked_to_type: entityType,
          linked_to_id: entityId,
          url: publicUrl,
          caption: file.name,
          mime_type: file.type,
          uploaded_by_user_id: profile.id,
        });

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(t('entityPhotos.saveError', { name: file.name }));
          continue;
        }

        // Create task_file_links record so file appears in Files tab
        if (useProjectPath) {
          const linkRecord: Record<string, unknown> = {
            project_id: projectId,
            file_path: fileName,
            file_name: file.name,
            file_type: "other",
            file_size: uploadFile.size,
            mime_type: file.type,
            linked_by_user_id: profile.id,
          };
          if (entityType === "task") linkRecord.task_id = entityId;
          else if (entityType === "material") linkRecord.material_id = entityId;

          await supabase.from("task_file_links").insert(linkRecord);
        }
      }

      toast.success(t('entityPhotos.filesUploaded'));
      loadPhotos();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error(t('entityPhotos.uploadFailed'));
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
    if (!confirm(t('entityPhotos.confirmDelete'))) return;

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

      toast.success(t('entityPhotos.photoDeleted'));
      loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error(t('entityPhotos.deleteError'));
    }
  };

  const imagePhotos = photos.filter((p) => isImageUrl(p));
  const docPhotos = photos.filter((p) => !isImageUrl(p));

  const handleDownloadDoc = (photo: Photo) => {
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.caption || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-gray-600" />
          <Label>{t('entityPhotos.photosAndDocuments')}</Label>
        </div>
        <div className="text-xs text-gray-500">
          {photos.length} {t('entityPhotos.fileCount', { count: photos.length })}
        </div>
      </div>

      <div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {t('entityPhotos.photos', 'Photos')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted flex items-center gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {t('entityPhotos.takePhoto')}
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted flex items-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {t('entityPhotos.uploadFile')}
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {loadingPhotos ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-3">
          {/* Document files */}
          {docPhotos.length > 0 && (
            <div className="space-y-1.5">
              {docPhotos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-sm truncate">{doc.caption || "Document"}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      className="p-1.5 rounded-md hover:bg-background transition-colors"
                      title={t('common.download', 'Download')}
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(doc.id, doc.url)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      title={t('entityPhotos.removeFile')}
                    >
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Image gallery */}
          {imagePhotos.length > 0 && (
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-3">
                {imagePhotos.map((photo, index) => (
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
                      title={t('entityPhotos.removePhoto')}
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
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('entityPhotos.noFiles')}</p>
        </div>
      )}

      <PhotoCarousel
        photos={imagePhotos}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
      />
    </div>
  );
}
