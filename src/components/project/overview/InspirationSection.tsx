import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { ImageIcon, Plus, ExternalLink, ShoppingCart, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InspirationSectionProps {
  projectId: string;
  currency: string;
  onNavigateToRoom?: (roomId: string) => void;
}

interface RoomInspo {
  roomId: string;
  roomName: string;
  photos: Array<{ id: string; url: string; caption: string | null; source: string }>;
  pinterestBoardUrl: string | null;
  materials: Array<{ id: string; name: string; price: number; photoUrl: string | null }>;
}

export function InspirationSection({ projectId, currency, onNavigateToRoom }: InspirationSectionProps) {
  const { t } = useTranslation();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inspiration", projectId],
    queryFn: async () => {
      // Fetch rooms, room photos, and materials with photos in parallel
      const [roomsRes, photosRes, materialsRes, materialPhotosRes] = await Promise.all([
        supabase
          .from("rooms")
          .select("id, name")
          .eq("project_id", projectId)
          .order("name"),
        supabase
          .from("photos")
          .select("id, url, caption, linked_to_id, source")
          .eq("linked_to_type", "room")
          .order("created_at", { ascending: false }),
        supabase
          .from("materials")
          .select("id, name, price_total, room_id")
          .eq("project_id", projectId)
          .not("room_id", "is", null),
        supabase
          .from("photos")
          .select("id, url, linked_to_id")
          .eq("linked_to_type", "material"),
      ]);

      const rooms = roomsRes.data || [];
      const allPhotos = photosRes.data || [];
      const allMaterials = materialsRes.data || [];
      const allMaterialPhotos = materialPhotosRes.data || [];

      // Build material photo map
      const matPhotoMap = new Map<string, string>();
      for (const p of allMaterialPhotos) {
        if (!matPhotoMap.has(p.linked_to_id)) matPhotoMap.set(p.linked_to_id, p.url);
      }

      // Filter to only rooms in this project
      const roomIds = new Set(rooms.map((r) => r.id));

      const result: RoomInspo[] = rooms.map((room) => ({
        roomId: room.id,
        roomName: room.name,
        photos: allPhotos
          .filter((p) => p.linked_to_id === room.id)
          .slice(0, 12)
          .map((p) => ({ id: p.id, url: p.url, caption: p.caption, source: p.source || "upload" })),
        pinterestBoardUrl: null, // Pinterest board URL fetched separately if needed
        materials: allMaterials
          .filter((m) => m.room_id === room.id)
          .map((m) => ({
            id: m.id,
            name: m.name,
            price: m.price_total || 0,
            photoUrl: matPhotoMap.get(m.id) || null,
          })),
      }));

      // Only return rooms that have some visual content
      return result.filter((r) => r.photos.length > 0 || r.pinterestBoardUrl || r.materials.some((m) => m.photoUrl));
    },
    staleTime: 2 * 60 * 1000,
  });

  const rooms = data || [];

  // Auto-select first room if none selected
  const activeRoom = useMemo(() => {
    if (rooms.length === 0) return null;
    if (selectedRoom && rooms.find((r) => r.roomId === selectedRoom)) return selectedRoom;
    return rooms[0].roomId;
  }, [rooms, selectedRoom]);

  const activeData = rooms.find((r) => r.roomId === activeRoom);

  if (isLoading || rooms.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t("inspiration.title", "Inspiration")}
          </CardTitle>
          {activeRoom && onNavigateToRoom && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onNavigateToRoom(activeRoom)}
            >
              {t("inspiration.openRoom", "Open room")}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Room tabs */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {rooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              onClick={() => setSelectedRoom(room.roomId)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeRoom === room.roomId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {room.roomName}
              <span className="ml-1 opacity-60">{room.photos.length}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      {activeData && (
        <CardContent className="pt-0 space-y-4">
          {/* Photo grid — masonry-style */}
          {activeData.photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {activeData.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || ""}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {photo.source === "pinterest" && (
                    <Badge
                      variant="secondary"
                      className="absolute top-1 right-1 text-[9px] px-1 py-0 bg-red-100 text-red-700"
                    >
                      Pin
                    </Badge>
                  )}
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pinterest board embed placeholder */}
          {activeData.pinterestBoardUrl && (
            <a
              href={activeData.pinterestBoardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed hover:bg-accent transition-colors text-sm text-muted-foreground"
            >
              <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
              </svg>
              {t("inspiration.viewBoard", "View Pinterest board")}
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          )}

          {/* Linked materials with photos */}
          {activeData.materials.some((m) => m.photoUrl) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3" />
                {t("inspiration.linkedMaterials", "Materials for this room")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeData.materials.filter((m) => m.photoUrl).map((mat) => (
                  <div
                    key={mat.id}
                    className="rounded-lg border overflow-hidden bg-card"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={mat.photoUrl!}
                        alt={mat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{mat.name}</p>
                      {mat.price > 0 && (
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(mat.price, currency)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for rooms with no visual content */}
          {activeData.photos.length === 0 && !activeData.pinterestBoardUrl && !activeData.materials.some((m) => m.photoUrl) && (
            <div className="text-center py-6 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("inspiration.empty", "No images yet for this room")}</p>
              <p className="text-xs mt-1">{t("inspiration.emptyHint", "Upload photos or link a Pinterest board in the room details")}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
