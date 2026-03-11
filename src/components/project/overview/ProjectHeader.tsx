import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeStatus, STATUS_META } from "@/lib/projectStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OverviewProject } from "./types";

interface ProjectHeaderProps {
  project: OverviewProject;
  onOpenSettings?: () => void;
  onCoverChange?: (url: string | null) => void;
}

export function ProjectHeader({ project, onOpenSettings, onCoverChange }: ProjectHeaderProps) {
  const { t } = useTranslation();
  const status = normalizeStatus(project.status);
  const meta = STATUS_META[status];
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(project.cover_image_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${project.id}/${Date.now()}.${ext}`;

      // Delete old cover
      if (coverUrl) {
        const oldPath = coverUrl.split("/project-files/")[1];
        if (oldPath) await supabase.storage.from("project-files").remove([oldPath]);
      }

      const { error } = await supabase.storage.from("project-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(path);
      setCoverUrl(publicUrl);

      await supabase.from("projects").update({ cover_image_url: publicUrl } as Record<string, unknown>).eq("id", project.id);
      onCoverChange?.(publicUrl);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveCover = async () => {
    if (!coverUrl) return;
    const oldPath = coverUrl.split("/project-files/")[1];
    if (oldPath) await supabase.storage.from("project-files").remove([oldPath]);

    setCoverUrl(null);
    await supabase.from("projects").update({ cover_image_url: null } as Record<string, unknown>).eq("id", project.id);
    onCoverChange?.(null);
  };

  return (
    <div className="space-y-3">
      {/* Hero / Cover image */}
      <div className="relative group">
        {coverUrl ? (
          <div className="relative h-40 sm:h-52 rounded-lg overflow-hidden">
            <img
              src={coverUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 hover:bg-white"
                onClick={handleRemoveCover}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-28 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Camera className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground/50">
                  {t("overview.addCoverPhoto", "Add project photo")}
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Title + status + address */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold leading-tight">{project.name}</h1>
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onOpenSettings}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}
          >
            {t(meta.labelKey)}
          </span>
        </div>

        {(project.address || project.description) && (
          <div className="flex flex-col gap-0.5">
            {project.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {project.address}
              </p>
            )}
            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
