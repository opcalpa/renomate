import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { getDateLocale } from "@/lib/dateFnsLocale";

interface PhotoItem {
  name: string;
  url: string;
  createdAt: string;
}

interface RecentPhotosProps {
  projectId: string;
  onViewAll: () => void;
}

export const RecentPhotos = ({ projectId, onViewAll }: RecentPhotosProps) => {
  const { t, i18n } = useTranslation();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPhotos = async () => {
      try {
        const basePath = `projects/${projectId}`;
        const { data: fileList } = await supabase.storage
          .from("project-files")
          .list(basePath, {
            sortBy: { column: "created_at", order: "desc" },
            limit: 30,
          });

        if (!fileList) {
          setPhotos([]);
          return;
        }

        const imageFiles = fileList.filter(
          (f) =>
            !f.id?.startsWith(".") &&
            f.metadata?.mimetype?.startsWith("image/")
        );

        const recentImages = imageFiles.slice(0, 6).map((f) => {
          const { data: urlData } = supabase.storage
            .from("project-files")
            .getPublicUrl(`${basePath}/${f.name}`);

          return {
            name: f.name,
            url: urlData.publicUrl,
            createdAt: f.created_at || new Date().toISOString(),
          };
        });

        setPhotos(recentImages);
      } catch {
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPhotos();
  }, [projectId]);

  if (loading) return null;

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {t("overview.recentPhotos.noPhotos", "No photos yet. Photos uploaded by the team will appear here.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const locale = getDateLocale(i18n.language);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t("overview.recentPhotos.title", "Latest photos")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
            {t("overview.recentPhotos.viewAll", "View all photos")}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.name} className="relative group">
              <div className="aspect-square rounded-md overflow-hidden bg-muted">
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                {formatDistanceToNow(new Date(photo.createdAt), {
                  addSuffix: true,
                  locale,
                })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
