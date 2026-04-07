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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronLeft,
  ChevronRight,
  Type,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compressImage";
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Fetch rooms + all inspiration photos
  const { data } = useQuery({
    queryKey: ["inspiration", projectId],
    queryFn: async () => {
      const [roomsRes, photosRes, materialsRes, materialPhotosRes] = await Promise.all([
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
          .select("id, name, price_total, room_id")
          .eq("project_id", projectId)
          .not("room_id", "is", null),
        supabase
          .from("photos")
          .select("id, url, linked_to_id")
          .eq("linked_to_type", "material"),
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

      // Build material photo map
      const matPhotoMap = new Map<string, string>();
      for (const p of (materialPhotosRes.data || [])) {
        if (!matPhotoMap.has(p.linked_to_id)) matPhotoMap.set(p.linked_to_id, p.url);
      }

      // Material cards with room context
      const materialCards = (materialsRes.data || [])
        .filter((m) => matPhotoMap.has(m.id))
        .map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price_total || 0,
          roomId: m.room_id,
          roomName: roomMap.get(m.room_id!) || null,
          photoUrl: matPhotoMap.get(m.id) || null,
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

        const uploadFile = await compressImage(file);
        const isCompressed = uploadFile !== file;

        const ext = isCompressed ? "jpg" : (file.name.split(".").pop() || "jpg");
        const path = `projects/${projectId}/inspiration/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(path, uploadFile, { contentType: isCompressed ? "image/jpeg" : file.type });
        if (uploadError) {
          console.error("Inspiration upload failed:", uploadError);
          toast.error(uploadError.message || t("common.error"));
          continue;
        }

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

      // Detect Pinterest URLs
      const isPinterest = url.includes("pinterest");
      const pinUrl = parsePinterestPinUrl(url);

      if (pinUrl) {
        try {
          const pinData = await fetchPinterestPin(pinUrl, projectId);
          let finalUrl = pinData.storageUrl;

          // If edge function couldn't download to Storage, use proxy-image function
          if (!finalUrl && pinData.imageUrl) {
            try {
              const { data: proxyResult, error: proxyErr } = await supabase.functions.invoke("proxy-image", {
                body: { imageUrl: pinData.imageUrl, projectId, filename: `pin-${pinData.pinId}` },
              });
              if (!proxyErr && proxyResult?.storageUrl) {
                finalUrl = proxyResult.storageUrl;
              }
            } catch {
              // Proxy also failed
            }
          }

          if (!finalUrl) {
            toast.error(t("inspiration.pinFetchFailed"));
            return;
          }

          await supabase.from("photos").insert({
            linked_to_type: "project",
            linked_to_id: projectId,
            url: finalUrl,
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
        } catch (pinErr) {
          console.error("Pinterest pin fetch failed:", pinErr);
          toast.error(t("inspiration.pinFetchFailed"));
        }
        return;
      }

      const boardParsed = parsePinterestBoardUrl(url);
      if (boardParsed) {
        toast.info(t("inspiration.boardHint"));
        setUrlInput("");
        setShowUrlInput(false);
        return;
      }

      // Other Pinterest URLs we can't parse
      if (isPinterest) {
        toast.error(t("inspiration.pinterestInvalid"));
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
    const { error } = await supabase.from("photos").update({ linked_to_type: type, linked_to_id: entityId }).eq("id", photoId);
    if (error) {
      console.error("Failed to link photo:", error);
      toast.error(t("common.error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
    toast.success(t("inspiration.linked"));
  }, [projectId, queryClient, t]);

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    await supabase.from("photos").delete().eq("id", photoId);
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
  }, [projectId, queryClient]);

  // Update caption
  const updateCaption = useCallback(async (photoId: string, caption: string) => {
    const { error } = await supabase.from("photos").update({ caption: caption || null }).eq("id", photoId);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
    setEditingCaption(null);
  }, [projectId, queryClient, t]);

  // Create room and optionally link a photo to it
  const createRoomAndLink = useCallback(async (name: string, photoId?: string) => {
    if (!name.trim() || creatingRoom) return;
    setCreatingRoom(true);
    try {
      const { data, error } = await supabase.from("rooms").insert({ project_id: projectId, name: name.trim() }).select("id").single();
      if (error) { toast.error(error.message); return; }
      if (photoId && data) {
        await supabase.from("photos").update({ linked_to_type: "room", linked_to_id: data.id }).eq("id", photoId);
      }
      queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
      setNewRoomName("");
      toast.success(t("rooms.created", "Rum skapat"));
    } catch { toast.error(t("common.error")); } finally { setCreatingRoom(false); }
  }, [projectId, creatingRoom, queryClient, t]);

  const hasPhotos = totalCount > 0;

  // Gallery navigation
  const openGallery = (index: number) => setGalleryIndex(index);
  const closeGallery = () => { setGalleryIndex(null); setEditingCaption(null); };
  const galleryPhoto = galleryIndex !== null ? filteredPhotos[galleryIndex] : null;
  const galleryPrev = () => setGalleryIndex((i) => i !== null && i > 0 ? i - 1 : i);
  const galleryNext = () => setGalleryIndex((i) => i !== null && i < filteredPhotos.length - 1 ? i + 1 : i);

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
            <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
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
                  onClick={() => { setAddMenuOpen(false); setTimeout(() => fileInputRef.current?.click(), 150); }}
                >
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("inspiration.upload")}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left sm:hidden"
                  onClick={() => {
                    setAddMenuOpen(false);
                    const input = fileInputRef.current;
                    if (input) { setTimeout(() => { input.setAttribute("capture", "environment"); input.click(); input.removeAttribute("capture"); }, 150); }
                  }}
                >
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("inspiration.camera")}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left"
                  onClick={() => { setAddMenuOpen(false); setTimeout(() => setShowUrlInput(true), 100); }}
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
              {filteredPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                  onClick={() => openGallery(idx)}
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

                  {/* Caption overlay — always visible if caption exists */}
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 pointer-events-none">
                      <p className="text-[10px] text-white/90 truncate">{photo.caption}</p>
                    </div>
                  )}

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
                        <div className="flex items-center gap-1 px-1 py-1">
                          <input
                            type="text"
                            placeholder={t("inspiration.newRoom", "Nytt rum...")}
                            className="flex-1 px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") createRoomAndLink(newRoomName, photo.id); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); createRoomAndLink(newRoomName, photo.id); }}
                            disabled={!newRoomName.trim() || creatingRoom}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
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

              {/* Add more tile — same popover as header button */}
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
                  <label
                    htmlFor={`inspo-file-${projectId}`}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent text-left cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("inspiration.upload")}
                  </label>
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
                <label
                  htmlFor={uploading ? undefined : `inspo-file-${projectId}`}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium cursor-pointer",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    uploading && "opacity-50 pointer-events-none"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {t("inspiration.upload")}
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={() => setTimeout(() => setShowUrlInput(true), 100)}
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
                    if (input) { setTimeout(() => { input.setAttribute("capture", "environment"); input.click(); input.removeAttribute("capture"); }, 100); }
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

        {/* File input — sr-only (not display:none) so label htmlFor works */}
        <input
          id={`inspo-file-${projectId}`}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length) {
              const fileArray = Array.from(files);
              e.target.value = "";
              handleUpload(fileArray);
            }
          }}
        />
      </CardContent>

      {/* ===== Fullscreen Gallery Dialog ===== */}
      <Dialog open={galleryIndex !== null} onOpenChange={(open) => { if (!open) closeGallery(); }}>
        <DialogContent
          className="!max-w-[95vw] w-[95vw] !max-h-[92vh] h-[92vh] !p-0 gap-0 flex flex-col sm:flex-row overflow-hidden !rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") galleryPrev();
            if (e.key === "ArrowRight") galleryNext();
          }}
        >
          <DialogTitle className="sr-only">{t("inspiration.gallery", "Inspiration gallery")}</DialogTitle>
          {galleryPhoto && (
            <>
              {/* Image area */}
              <div className="relative flex-1 bg-black flex items-center justify-center min-h-0">
                <img
                  src={galleryPhoto.url}
                  alt={galleryPhoto.caption || ""}
                  className="max-w-full max-h-full object-contain"
                />
                {/* Nav arrows */}
                {galleryIndex !== null && galleryIndex > 0 && (
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); galleryPrev(); }}
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                )}
                {galleryIndex !== null && galleryIndex < filteredPhotos.length - 1 && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                    onClick={(e) => { e.stopPropagation(); galleryNext(); }}
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </button>
                )}
                {/* Counter */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full tabular-nums">
                  {(galleryIndex ?? 0) + 1} / {filteredPhotos.length}
                </div>
              </div>

              {/* Side panel */}
              <div className="w-full sm:w-72 shrink-0 border-t sm:border-t-0 sm:border-l bg-background p-4 space-y-4 overflow-y-auto">
                {/* Caption */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Type className="h-3 w-3" />
                    {t("inspiration.caption", "Beskrivning")}
                  </label>
                  {editingCaption === galleryPhoto.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        autoFocus
                        className="w-full px-2 py-1.5 text-sm rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); updateCaption(galleryPhoto.id, captionDraft); }
                          if (e.key === "Escape") setEditingCaption(null);
                        }}
                        placeholder={t("inspiration.captionPlaceholder", "Beskriv din inspiration...")}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => updateCaption(galleryPhoto.id, captionDraft)}>
                          {t("common.save")}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCaption(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors min-h-[36px]"
                      onClick={() => { setEditingCaption(galleryPhoto.id); setCaptionDraft(galleryPhoto.caption || ""); }}
                    >
                      {galleryPhoto.caption || (
                        <span className="text-muted-foreground italic">{t("inspiration.addCaption", "Lägg till beskrivning...")}</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Details table */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("inspiration.details", "Detaljer")}
                  </label>
                  <div className="text-xs space-y-2">
                    {/* Room — clickable popover to change */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("inspiration.room", "Rum")}</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-sm font-medium hover:underline transition-colors">
                            {galleryPhoto.roomName || <span className="text-muted-foreground italic">{t("inspiration.noRoom", "Ej kopplat")}</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="end" side="bottom">
                          {rooms.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className={cn(
                                "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded text-left transition-colors",
                                galleryPhoto.roomId === r.id ? "bg-primary/10 font-medium" : "hover:bg-accent"
                              )}
                              onClick={() => assignPhoto(galleryPhoto.id, "room", r.id)}
                            >
                              <Home className="h-3 w-3 text-muted-foreground" />
                              {r.name}
                            </button>
                          ))}
                          {galleryPhoto.roomId && (
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded text-left text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-1 border-t"
                              onClick={() => assignPhoto(galleryPhoto.id, "project", projectId)}
                            >
                              <X className="h-3 w-3" />
                              {t("inspiration.unlink")}
                            </button>
                          )}
                          <div className="flex items-center gap-1 px-1 py-1 mt-1 border-t">
                            <input
                              type="text"
                              placeholder={t("inspiration.newRoom", "Nytt rum...")}
                              className="flex-1 px-2 py-1 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") createRoomAndLink(newRoomName, galleryPhoto.id); }}
                            />
                            <button
                              type="button"
                              className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-primary"
                              onClick={() => createRoomAndLink(newRoomName, galleryPhoto.id)}
                              disabled={!newRoomName.trim() || creatingRoom}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("inspiration.source", "Källa")}</span>
                      <span>{galleryPhoto.source === "pinterest" ? "Pinterest" : galleryPhoto.source === "url" ? "URL" : t("inspiration.upload")}</span>
                    </div>
                  </div>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
                  onClick={() => { deletePhoto(galleryPhoto.id); closeGallery(); }}
                >
                  <Trash2 className="h-3 w-3" />
                  {t("common.delete")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
