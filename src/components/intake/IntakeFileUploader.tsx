import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Camera, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IntakeFileUploaderProps {
  token: string;
  folder: string; // e.g., "rooms/{roomId}" or "attachments"
  files: string[];
  onFilesChange: (files: string[]) => void;
  accept?: string;
  maxFiles?: number;
  showCamera?: boolean;
  compact?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Compress image to reduce file size
 */
async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
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

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if file is an image
 */
function isImage(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Upload file via edge function (handles anonymous uploads)
 */
async function uploadViaEdgeFunction(
  file: File,
  token: string,
  folder: string
): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("token", token);
  formData.append("folder", folder);

  const { data, error } = await supabase.functions.invoke("intake-upload", {
    body: formData,
  });

  if (error) {
    console.error("Edge function error:", error);
    return null;
  }

  return data?.url || null;
}

export function IntakeFileUploader({
  token,
  folder,
  files,
  onFilesChange,
  accept = "image/*",
  maxFiles = 10,
  showCamera = true,
  compact = false,
}: IntakeFileUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const filesToUpload = Array.from(fileList);
    const remainingSlots = maxFiles - files.length;

    if (filesToUpload.length > remainingSlots) {
      toast.error(t("intake.maxFilesReached", { max: maxFiles }));
      filesToUpload.splice(remainingSlots);
    }

    if (filesToUpload.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(t("intake.fileTooLarge", { name: file.name }));
          continue;
        }

        // Compress images
        const processedFile = await compressImage(file);

        // Upload via edge function (handles anonymous users)
        const url = await uploadViaEdgeFunction(processedFile, token, folder);

        if (!url) {
          toast.error(t("intake.uploadError", { name: file.name }));
          continue;
        }

        newUrls.push(url);
      }

      if (newUrls.length > 0) {
        onFilesChange([...files, ...newUrls]);
        toast.success(t("intake.filesUploaded", { count: newUrls.length }));
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("intake.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (urlToRemove: string) => {
    // Simply remove from the list - files will be cleaned up later or remain orphaned
    // (cleanup can be done via a scheduled function if needed)
    onFilesChange(files.filter((url) => url !== urlToRemove));
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {showCamera && (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handleUpload(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
                disabled={uploading || files.length >= maxFiles}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={uploading || files.length >= maxFiles}
                onClick={() => cameraInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                {t("intake.takePhoto")}
              </Button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
            disabled={uploading || files.length >= maxFiles}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={uploading || files.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {t("intake.chooseFile")}
          </Button>
        </div>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((url, index) => (
              <div
                key={index}
                className="relative group w-16 h-16 rounded-md border overflow-hidden"
              >
                {isImage(url) ? (
                  <img
                    src={url}
                    alt={`File ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload buttons */}
      <div className="flex gap-2">
        {showCamera && (
          <>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
              disabled={uploading || files.length >= maxFiles}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              disabled={uploading || files.length >= maxFiles}
              onClick={() => cameraInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {t("intake.takePhoto")}
            </Button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => {
            handleUpload(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          disabled={uploading || files.length >= maxFiles}
        />
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2", showCamera ? "flex-1" : "w-full")}
          disabled={uploading || files.length >= maxFiles}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t("intake.chooseFiles")}
        </Button>
      </div>

      {/* File preview grid */}
      {files.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {files.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg border overflow-hidden"
            >
              {isImage(url) ? (
                <img
                  src={url}
                  alt={`File ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">PDF</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("intake.noFilesYet")}</p>
        </div>
      )}

      {/* File count indicator */}
      <p className="text-xs text-muted-foreground text-center">
        {t("intake.filesCount", { count: files.length, max: maxFiles })}
      </p>
    </div>
  );
}
