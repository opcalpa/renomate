import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxImage {
  id: string;
  url: string;
  caption?: string | null;
  roomName?: string | null;
  filename?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  projectId?: string;
}

/**
 * Unified image lightbox used across the app.
 * Shows image on the left with an info/comments sidebar on the right.
 */
export function ImageLightbox({ images, initialIndex, open, onClose, projectId }: ImageLightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => { setIndex(initialIndex); }, [initialIndex]);

  const photo = images[index];
  if (!photo) return null;

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < images.length - 1 ? i + 1 : i));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="!max-w-[min(1200px,94vw)] w-[94vw] !max-h-[88vh] h-[88vh] !p-0 gap-0 flex flex-col sm:flex-row overflow-hidden !rounded-xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
      >
        <DialogTitle className="sr-only">{t("inspiration.gallery", "Gallery")}</DialogTitle>

        {/* Image area */}
        <div className="relative flex-1 bg-neutral-950 flex items-center justify-center min-h-0 min-w-0">
          <img
            src={photo.url}
            alt={photo.caption || photo.filename || ""}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
          {/* Nav arrows */}
          {index > 0 && (
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}
          {/* Bottom bar */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-6 pb-4 pt-10 pointer-events-none">
            <div className="flex items-end justify-between">
              <div>
                {photo.caption && <p className="text-white text-sm font-medium mb-1">{photo.caption}</p>}
                {photo.roomName && <p className="text-white/60 text-xs">{photo.roomName}</p>}
                {!photo.caption && photo.filename && <p className="text-white/70 text-xs">{photo.filename}</p>}
              </div>
              {images.length > 1 && (
                <span className="text-white/50 text-xs tabular-nums">
                  {index + 1} / {images.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full sm:w-72 shrink-0 border-t sm:border-t-0 sm:border-l bg-background p-4 space-y-4 overflow-y-auto">
          {/* Info */}
          {(photo.caption || photo.filename) && (
            <div>
              <p className="text-sm font-medium">{photo.caption || photo.filename}</p>
              {photo.roomName && <p className="text-xs text-muted-foreground mt-0.5">{photo.roomName}</p>}
            </div>
          )}

          {/* Comments */}
          {projectId && (
            <div className="border-t pt-3">
              <CommentsSection
                entityId={photo.id}
                entityType="photo"
                projectId={projectId}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing lightbox state. Use in any component that shows images.
 *
 * Usage:
 *   const lightbox = useLightbox();
 *   <img onClick={() => lightbox.open(images, 0)} />
 *   <ImageLightbox {...lightbox.props} projectId={projectId} />
 */
export function useLightbox() {
  const [state, setState] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const open = useCallback((images: LightboxImage[], index: number) => {
    setState({ images, index });
  }, []);

  const close = useCallback(() => setState(null), []);

  return {
    open,
    close,
    props: {
      images: state?.images ?? [],
      initialIndex: state?.index ?? 0,
      open: state !== null,
      onClose: close,
    },
  };
}
