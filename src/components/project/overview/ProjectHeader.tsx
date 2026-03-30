import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Camera, X, Loader2, GripVertical, Check } from "lucide-react";
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
  const [coverPosition, setCoverPosition] = useState(project.cover_image_position ?? 50);
  const [repositioning, setRepositioning] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setCoverPosition(project.cover_image_position ?? 50);
  }, [project.cover_image_position]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `projects/${project.id}/${Date.now()}.${ext}`;

      if (coverUrl) {
        const oldPath = coverUrl.split("/project-files/")[1];
        if (oldPath) await supabase.storage.from("project-files").remove([oldPath]);
      }

      const { error } = await supabase.storage.from("project-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        console.error("Cover upload failed:", { error, path, fileType: file.type, fileSize: file.size });
        toast.error(error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(path);
      setCoverUrl(publicUrl);
      setCoverPosition(50);

      await supabase.from("projects").update({
        cover_image_url: publicUrl,
        cover_image_position: 50,
      } as Record<string, unknown>).eq("id", project.id);
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
    await supabase.from("projects").update({
      cover_image_url: null,
      cover_image_position: 50,
    } as Record<string, unknown>).eq("id", project.id);
    onCoverChange?.(null);
  };

  const handleDoubleClick = useCallback(() => {
    if (!coverUrl) return;
    setRepositioning(true);
    setDragStartPos(coverPosition);
  }, [coverUrl, coverPosition]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!repositioning) return;
    e.preventDefault();
    setDragStartY(e.clientY);
    setDragStartPos(coverPosition);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [repositioning, coverPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY === null || !containerRef.current) return;
    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - dragStartY;
    // Moving mouse down = showing higher part of image = lower object-position %
    const deltaPct = -(deltaY / containerHeight) * 100;
    const newPos = Math.max(0, Math.min(100, dragStartPos + deltaPct));
    setCoverPosition(newPos);
  }, [dragStartY, dragStartPos]);

  const handlePointerUp = useCallback(() => {
    setDragStartY(null);
  }, []);

  const handleSavePosition = useCallback(async () => {
    setRepositioning(false);
    const rounded = Math.round(coverPosition);
    await supabase.from("projects").update({
      cover_image_position: rounded,
    } as Record<string, unknown>).eq("id", project.id);
  }, [coverPosition, project.id]);

  const handleCancelReposition = useCallback(() => {
    setRepositioning(false);
    setCoverPosition(project.cover_image_position ?? 50);
  }, [project.cover_image_position]);

  return (
    <div className="space-y-3">
      {/* Hero / Cover image */}
      <div className="relative group">
        {coverUrl ? (
          <div
            ref={containerRef}
            className={`relative h-40 sm:h-52 rounded-xl overflow-hidden ${repositioning ? "ring-2 ring-primary cursor-grab active:cursor-grabbing" : ""}`}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={coverUrl}
              alt={project.name}
              className="w-full h-full object-cover select-none"
              style={{ objectPosition: `center ${coverPosition}%` }}
              draggable={false}
            />
            {/* Repositioning overlay */}
            {repositioning && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none">
                  <GripVertical className="h-3.5 w-3.5" />
                  {t("overview.dragToReposition", "Dra för att justera")}
                </div>
              </div>
            )}
            {/* Reposition save/cancel buttons */}
            {repositioning && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1 shadow-lg"
                  onClick={handleSavePosition}
                >
                  <Check className="h-3.5 w-3.5" />
                  {t("common.save", "Spara")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs shadow-lg"
                  onClick={handleCancelReposition}
                >
                  {t("common.cancel", "Avbryt")}
                </Button>
              </div>
            )}
            {/* Normal hover controls */}
            {!repositioning && (
              <>
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
              </>
            )}
          </div>
        ) : null}
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
          <h1 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight">{project.name}</h1>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title={t("overview.addCoverPhoto", "Add project photo")}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </Button>
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
