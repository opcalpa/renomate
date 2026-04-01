import { useState, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ImageIcon,
  Camera,
  Link2,
  Upload,
  X,
  Trash2,
  ShoppingCart,
  Sparkles,
  Home,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchPinterestPin, parsePinterestPinUrl } from "@/services/pinterestOEmbed";
import { parsePinterestBoardUrl } from "@/components/pinterest";

interface InspirationSectionProps {
  projectId: string;
  currency: string;
}

interface InspoPhoto {
  id: string;
  url: string;
  caption: string | null;
  source: string;
  roomId: string | null;
  roomName: string | null;
}

interface Room {
  id: string;
  name: string;
}

export function InspirationSection({ projectId, currency }: InspirationSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Fetch rooms + all inspiration photos
  const { data } = useQuery({
    queryKey: ["inspiration", projectId],
    queryFn: async () => {
      const [roomsRes, photosRes, matPhotosRes] = await Promise.all([
        supabase
          .from("rooms")
          .select("id, name")
          .eq("project_id", projectId)
          .order("name"),
        supabase
          .from("photos")
          .select("id, url, caption, linked_to_id, linked_to_type, source")
          .or(`linked_to_type.eq.room,linked_to_type.eq.project`)
          .order("created_at", { ascending: false }),
        supabase
          .from("materials")
          .select("id, name, price_total, room_id, photos:photos!inner(url)")
          .eq("project_id", projectId)
          .not("room_id", "is", null),
      ]);

      const rooms: Room[] = roomsRes.data || [];
      const roomIds = new Set(rooms.map((r) => r.id));
      const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

      // Room photos + project-level photos
      const photos: InspoPhoto[] = (photosRes.data || [])
        .filter((p) => p.linked_to_type === "project" ? p.linked_to_id === projectId : roomIds.has(p.linked_to_id))
        .map((p) => ({
          id: p.id,
          url: p.url,
          caption: p.caption,
          source: p.source || "upload",
          roomId: p.linked_to_type === "room" ? p.linked_to_id : null,
          roomName: p.linked_to_type === "room" ? (roomMap.get(p.linked_to_id) || null) : null,
        }));

      // Material photos with room context
      const materialCards = (matPhotosRes.data || [])
        .filter((m) => (m.photos as unknown as Array<{ url: string }>)?.length > 0)
        .map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price_total || 0,
          roomId: m.room_id,
          roomName: roomMap.get(m.room_id!) || null,
          photoUrl: (m.photos as unknown as Array<{ url: string }>)[0]?.url,
        }));

      return { rooms, photos, materialCards };
    },
    staleTime: 60 * 1000,
  });

  const rooms = data?.rooms || [];
  const allPhotos = data?.photos || [];
  const materialCards = data?.materialCards || [];

  const filteredPhotos = useMemo(() => {
    if (selectedRoom === "all") return allPhotos;
    if (selectedRoom === "untagged") return allPhotos.filter((p) => !p.roomId);
    return allPhotos.filter((p) => p.roomId === selectedRoom);
  }, [allPhotos, selectedRoom]);

  const totalCount = allPhotos.length + materialCards.filter((m) => m.photoUrl).length;

  // Upload handler
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (uploading) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) throw new Error("No profile");

      let uploaded = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        // Compress large images
        let uploadFile: File | Blob = file;
        if (file.size > 500_000) {
          const img = new Image();
          const url = URL.createObjectURL(file);
          await new Promise((resolve) => { img.onload = resolve; img.src = url; });
          const canvas = document.createElement("canvas");
          const max = 1200;
          let { width, height } = img;
          if (width > max || height > max) {
            const ratio = Math.min(max / width, max / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          uploadFile = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
          );
          URL.revokeObjectURL(url);
        }

        const ext = file.name.split(".").pop() || "jpg";
        const path = `projects/${projectId}/inspiration/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(path, uploadFile, { contentType: file.type });
        if (uploadError) continue;

        const { data: publicUrl } = supabase.storage.from("project-files").getPublicUrl(path);

        await supabase.from("photos").insert({
          linked_to_type: "project",
          linked_to_id: projectId,
          url: publicUrl.publicUrl,
          caption: file.name.replace(/\.[^/.]+$/, ""),
          uploaded_by_user_id: profile.id,
          source: "upload",
        });
        uploaded++;
      }

      if (uploaded > 0) {
        toast.success(t("inspiration.uploaded", { count: uploaded }));
        queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  }, [projectId, uploading, queryClient, t]);

  // URL import handler — smart detection for Pinterest pins, boards, or plain image URLs
  const handleUrlImport = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) throw new Error("No profile");

      // Check if it's a Pinterest pin URL
      const pinUrl = parsePinterestPinUrl(url);
      if (pinUrl) {
        const pinData = await fetchPinterestPin(pinUrl);
        if (pinData) {
          await supabase.from("photos").insert({
            linked_to_type: "project",
            linked_to_id: projectId,
            url: pinData.storageUrl || pinData.imageUrl,
            caption: pinData.title || null,
            source: "pinterest",
            source_url: pinUrl,
            pinterest_pin_id: pinData.pinId,
            uploaded_by_user_id: profile.id,
          });
          toast.success(t("inspiration.pinImported"));
          setUrlInput("");
          setShowUrlInput(false);
          queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
          return;
        }
      }

      // Check if it's a Pinterest board URL
      const boardParsed = parsePinterestBoardUrl(url);
      if (boardParsed) {
        toast.info(t("inspiration.boardHint"));
        setUrlInput("");
        setShowUrlInput(false);
        return;
      }

      // Plain image URL
      await supabase.from("photos").insert({
        linked_to_type: "project",
        linked_to_id: projectId,
        url,
        source: "url",
        source_url: url,
        uploaded_by_user_id: profile.id,
      });
      toast.success(t("inspiration.imported"));
      setUrlInput("");
      setShowUrlInput(false);
      queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  }, [urlInput, projectId, queryClient, t]);

  // Drag and drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  // Fetch tasks for linking
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks-names", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("project_id", projectId)
        .order("title");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Assign photo to entity
  const assignPhoto = useCallback(async (photoId: string, type: string, entityId: string) => {
    await supabase.from("photos").update({ linked_to_type: type, linked_to_id: entityId }).eq("id", photoId);
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
    toast.success(t("inspiration.linked"));
  }, [projectId, queryClient, t]);

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    await supabase.from("photos").delete().eq("id", photoId);
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
  }, [projectId, queryClient]);

  const hasPhotos = totalCount > 0;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("inspiration.title")}
          </h3>
          {hasPhotos && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Upload className="h-3 w-3" />
                  {t("inspiration.add")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="end">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("inspiration.upload")}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left sm:hidden"
                  onClick={() => {
                    const input = fileInputRef.current;
                    if (input) { input.setAttribute("capture", "environment"); input.click(); input.removeAttribute("capture"); }
                  }}
                >
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("inspiration.camera")}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                  onClick={() => setShowUrlInput(true)}
                >
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("inspiration.fromUrl")}
                </button>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Room filter chips — only show when there are photos */}
        {hasPhotos && rooms.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button
              type="button"
              onClick={() => setSelectedRoom("all")}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                selectedRoom === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {t("common.all")} ({allPhotos.length})
            </button>
            {rooms.map((room) => {
              const count = allPhotos.filter((p) => p.roomId === room.id).length;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoom(room.id)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                    selectedRoom === room.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {room.name} {count > 0 && `(${count})`}
                </button>
              );
            })}
            {allPhotos.some((p) => !p.roomId) && (
              <button
                type="button"
                onClick={() => setSelectedRoom("untagged")}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                  selectedRoom === "untagged" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {t("inspiration.untagged")} ({allPhotos.filter((p) => !p.roomId).length})
              </button>
            )}
          </div>
        )}

        {/* Photo grid + drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "rounded-xl border-2 border-dashed transition-colors min-h-[120px]",
            dragging ? "border-primary bg-primary/5" : hasPhotos ? "border-transparent" : "border-muted",
          )}
        >
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-1">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden group"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || ""}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Badges — top right */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    {photo.source === "pinterest" && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-red-100 text-red-700">Pin</Badge>
                    )}
                    {photo.roomName && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">{photo.roomName}</Badge>
                    )}
                  </div>

                  {/* Hover action bar */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {/* Link to entity */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link2 className="h-3 w-3 text-white" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-1" align="start" side="top">
                        {rooms.length > 0 && (
                          <>
                            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{t("inspiration.linkRoom")}</p>
                            {rooms.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                                onClick={() => assignPhoto(photo.id, "room", r.id)}
                              >
                                <Home className="h-3 w-3 text-muted-foreground" />
                                {r.name}
                              </button>
                            ))}
                          </>
                        )}
                        {(tasks?.length ?? 0) > 0 && (
                          <>
                            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-1">{t("inspiration.linkTask")}</p>
                            <div className="max-h-[120px] overflow-y-auto">
                              {(tasks || []).slice(0, 15).map((task) => (
                                <button
                                  key={task.id}
                                  type="button"
                                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                                  onClick={() => assignPhoto(photo.id, "task", task.id)}
                                >
                                  <Hammer className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate">{task.title}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {photo.roomId && (
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left text-muted-foreground mt-1 border-t"
                            onClick={() => assignPhoto(photo.id, "project", projectId)}
                          >
                            <X className="h-3 w-3" />
                            {t("inspiration.unlink")}
                          </button>
                        )}
                      </PopoverContent>
                    </Popover>

                    {/* Delete */}
                    <button
                      type="button"
                      className="h-6 w-6 rounded-full bg-white/20 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add more tile — popover with all input options */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="aspect-square rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px]">{t("inspiration.addMore")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start" side="top">
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("inspiration.upload")}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left sm:hidden"
                    onClick={() => {
                      const input = fileInputRef.current;
                      if (input) { input.setAttribute("capture", "environment"); input.click(); input.removeAttribute("capture"); }
                    }}
                  >
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("inspiration.camera")}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                    onClick={() => setShowUrlInput(true)}
                  >
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("inspiration.fromUrl")}
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            /* Empty state — welcoming, not sterile */
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-pink-500/70" />
              </div>
              <h4 className="text-sm font-medium mb-1">
                {t("inspiration.emptyTitle")}
              </h4>
              <p className="text-xs text-muted-foreground mb-4 max-w-[300px]">
                {t("inspiration.emptyDesc")}
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t("inspiration.upload")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={() => setShowUrlInput(true)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {t("inspiration.fromUrl")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 sm:hidden"
                  onClick={() => {
                    const input = fileInputRef.current;
                    if (input) { input.setAttribute("capture", "environment"); input.click(); input.removeAttribute("capture"); }
                  }}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t("inspiration.camera")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* URL input overlay */}
        {showUrlInput && (
          <div className="flex gap-2 mt-3">
            <input
              type="url"
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
              placeholder={t("inspiration.urlPlaceholder")}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" onClick={handleUrlImport} disabled={!urlInput.trim() || uploading}>
              {t("common.add")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setUrlInput(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Material cards — only show when viewing a specific room */}
        {selectedRoom !== "all" && selectedRoom !== "untagged" && (() => {
          const roomMats = materialCards.filter((m) => m.roomId === selectedRoom && m.photoUrl);
          if (roomMats.length === 0) return null;
          return (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3" />
                {t("inspiration.linkedMaterials")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roomMats.map((mat) => (
                  <div key={mat.id} className="rounded-lg border overflow-hidden bg-card">
                    <div className="aspect-video overflow-hidden">
                      <img src={mat.photoUrl!} alt={mat.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{mat.name}</p>
                      {mat.price > 0 && <p className="text-[10px] text-muted-foreground">{formatCurrency(mat.price, currency)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ""; }}
        />
      </CardContent>
    </Card>
  );
}
