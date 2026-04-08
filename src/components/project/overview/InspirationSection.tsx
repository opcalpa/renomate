import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { usePersistedPreference } from "@/hooks/usePersistedPreference";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Type,
  Plus,
  LayoutGrid,
  Palette,
  Settings,
  Clock,
  Loader2,
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

type DisplaySize = "sm" | "md" | "lg";
type CropPosition = "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right";
type FitMode = "cover" | "contain";
type CropShape = "landscape" | "square" | "portrait" | "circle";

interface InspoPhoto {
  id: string;
  url: string;
  caption: string | null;
  source: string;
  sourceUrl: string | null;
  roomId: string | null;
  roomName: string | null;
  displaySize: DisplaySize;
  sortOrder: number;
  cropPosition: CropPosition;
  fitMode: FitMode;
  cropZoom: number;
  cropOffsetX: number;
  cropOffsetY: number;
  cropShape: CropShape;
  gridColSpan: number;
  gridRowSpan: number;
}


const hexLuminance = (hex: string) => {
  const h = hex.replace("#", "");
  return (parseInt(h.substring(0, 2), 16) || 0) * 0.299
    + (parseInt(h.substring(2, 4), 16) || 0) * 0.587
    + (parseInt(h.substring(4, 6), 16) || 0) * 0.114;
};

const MOODBOARD_BACKGROUNDS = [
  { id: "white", color: "#ffffff", label: "Pure White" },
  { id: "linen", color: "#F3EDE4", label: "Warm Linen" },
  { id: "greige", color: "#D6CFC7", label: "Soft Greige" },
  { id: "sage", color: "#C5CDB0", label: "Pale Sage" },
  { id: "mauve", color: "#C4AEAD", label: "Dusty Mauve" },
  { id: "charcoal", color: "#4A4A48", label: "Warm Charcoal" },
  { id: "navy", color: "#1E2A3A", label: "Deep Navy" },
  { id: "black", color: "#141414", label: "Rich Black" },
] as const;

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
  const [inspoView, setInspoView] = usePersistedPreference<"gallery" | "moodboard" | "beforeafter">("inspo-view-mode", "gallery");
  const [collapsed, setCollapsed] = usePersistedPreference("inspo-collapsed", false);
  const [moodboardBg, setMoodboardBg] = usePersistedPreference("moodboard-bg", "#f5f0eb");
  const [moodboardGap, setMoodboardGap] = usePersistedPreference("moodboard-gap", true);
  const [moodboardGapSize, setMoodboardGapSize] = usePersistedPreference("moodboard-gap-size", 8);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [dragPhotoId, setDragPhotoId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const moodboardGridRef = useRef<HTMLDivElement>(null);
  const inspoRef = useRef<HTMLDivElement>(null);

  // Check for room filter deep-link from room details
  useEffect(() => {
    try {
      const stored = localStorage.getItem("inspo-room-filter");
      if (stored) {
        const roomId = JSON.parse(stored) as string;
        localStorage.removeItem("inspo-room-filter");
        setSelectedRoom(roomId);
        setCollapsed(false);
        // Scroll into view after render
        setTimeout(() => inspoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      }
    } catch { /* ignore */ }
  }, []);

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
          .select("id, url, caption, linked_to_id, linked_to_type, source, source_url, display_size, sort_order, crop_position, fit_mode, crop_zoom, crop_offset_x, crop_offset_y, crop_shape, grid_col_span, grid_row_span")
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
          sourceUrl: p.source_url || null,
          displaySize: (p.display_size as DisplaySize) || "md",
          sortOrder: p.sort_order || 0,
          cropPosition: (p.crop_position as CropPosition) || "center",
          fitMode: (p.fit_mode as FitMode) || "cover",
          cropZoom: p.crop_zoom ?? 1.0,
          cropOffsetX: p.crop_offset_x ?? 50,
          cropOffsetY: p.crop_offset_y ?? 50,
          cropShape: (p.crop_shape as CropShape) || "landscape",
          gridColSpan: p.grid_col_span ?? 3,
          gridRowSpan: p.grid_row_span ?? 2,
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

  // Before/During/After photos grouped by room
  const beforeAfterByRoom = useMemo(() => {
    const targetPhotos = selectedRoom === "all" ? allPhotos : selectedRoom === "untagged" ? allPhotos.filter((p) => !p.roomId) : allPhotos.filter((p) => p.roomId === selectedRoom);
    const roomGroups = new Map<string, { name: string; before: InspoPhoto[]; during: InspoPhoto[]; after: InspoPhoto[] }>();

    for (const photo of targetPhotos) {
      const key = photo.roomId || "__none__";
      if (!roomGroups.has(key)) {
        roomGroups.set(key, { name: photo.roomName || t("tasks.noRoom"), before: [], during: [], after: [] });
      }
      const group = roomGroups.get(key)!;
      if (photo.source === "before") group.before.push(photo);
      else if (photo.source === "during" || photo.source === "worker_progress") group.during.push(photo);
      else if (photo.source === "after" || photo.source === "worker_completed") group.after.push(photo);
    }

    return Array.from(roomGroups.entries())
      .map(([id, data]) => ({ id, ...data }))
      .filter((g) => g.before.length > 0 || g.during.length > 0 || g.after.length > 0);
  }, [allPhotos, selectedRoom, t]);

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

  // Before/After upload handler — tags photo with source and room
  const [baUploading, setBaUploading] = useState(false);
  const handleBeforeAfterUpload = useCallback(async (file: File, category: "before" | "during" | "after", roomId: string | null) => {
    setBaUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) throw new Error("No profile");

      const uploadFile = await compressImage(file);
      const isCompressed = uploadFile !== file;
      const ext = isCompressed ? "jpg" : (file.name.split(".").pop() || "jpg");
      const path = `projects/${projectId}/before-after/${category}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, uploadFile, { contentType: isCompressed ? "image/jpeg" : file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("project-files").getPublicUrl(path);

      await supabase.from("photos").insert({
        linked_to_type: roomId ? "room" : "project",
        linked_to_id: roomId || projectId,
        url: publicUrl.publicUrl,
        uploaded_by_user_id: profile.id,
        source: category,
      });

      queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
      toast.success(t("inspiration.photoAdded", "Bild tillagd"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBaUploading(false);
    }
  }, [projectId, queryClient, t]);

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

  // Update grid span — optimistic + debounced DB write
  const spanSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateGridSpan = useCallback((photoId: string, colSpan: number, rowSpan: number) => {
    const clamped = { col: Math.max(1, Math.min(6, colSpan)), row: Math.max(1, Math.min(6, rowSpan)) };
    queryClient.setQueryData(["inspiration", projectId], (old: typeof data) => {
      if (!old) return old;
      return { ...old, photos: old.photos.map((p: InspoPhoto) => p.id === photoId ? { ...p, gridColSpan: clamped.col, gridRowSpan: clamped.row } : p) };
    });
    if (spanSaveTimer.current) clearTimeout(spanSaveTimer.current);
    spanSaveTimer.current = setTimeout(async () => {
      await supabase.from("photos").update({ grid_col_span: clamped.col, grid_row_span: clamped.row }).eq("id", photoId);
    }, 300);
  }, [projectId, queryClient, data]);

  // Toggle circle shape
  const toggleCircle = useCallback(async (photoId: string, isCircle: boolean) => {
    const shape = isCircle ? "landscape" : "circle";
    // Circle defaults to 3×3 for a nice visible size
    const updates = shape === "circle"
      ? { crop_shape: shape, grid_col_span: 3, grid_row_span: 3 }
      : { crop_shape: shape };
    queryClient.setQueryData(["inspiration", projectId], (old: typeof data) => {
      if (!old) return old;
      return { ...old, photos: old.photos.map((p: InspoPhoto) => p.id === photoId
        ? { ...p, cropShape: shape as CropShape, ...(shape === "circle" ? { gridColSpan: 3, gridRowSpan: 3 } : {}) }
        : p
      )};
    });
    await supabase.from("photos").update(updates).eq("id", photoId);
  }, [projectId, queryClient, data]);

  // Save zoom + pan — optimistic cache update + debounced DB write
  const cropSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCropTransform = useCallback((photoId: string, zoom: number, offsetX: number, offsetY: number) => {
    // Optimistic: update cache immediately so UI responds instantly
    queryClient.setQueryData(["inspiration", projectId], (old: typeof data) => {
      if (!old) return old;
      return {
        ...old,
        photos: old.photos.map((p: InspoPhoto) =>
          p.id === photoId ? { ...p, cropZoom: zoom, cropOffsetX: offsetX, cropOffsetY: offsetY } : p
        ),
      };
    });
    // Debounce DB write
    if (cropSaveTimer.current) clearTimeout(cropSaveTimer.current);
    cropSaveTimer.current = setTimeout(async () => {
      await supabase.from("photos").update({ crop_zoom: zoom, crop_offset_x: offsetX, crop_offset_y: offsetY }).eq("id", photoId);
    }, 300);
  }, [projectId, queryClient, data]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (spanSaveTimer.current) clearTimeout(spanSaveTimer.current);
      if (cropSaveTimer.current) clearTimeout(cropSaveTimer.current);
    };
  }, []);

  // Reorder: move dragId to position of targetId
  const reorderPhotos = useCallback(async (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const sorted = [...filteredPhotos].sort((a, b) => a.sortOrder - b.sortOrder);
    const dragIdx = sorted.findIndex((p) => p.id === dragId);
    const targetIdx = sorted.findIndex((p) => p.id === targetId);
    if (dragIdx === -1 || targetIdx === -1) return;

    const moved = sorted.splice(dragIdx, 1)[0];
    sorted.splice(targetIdx, 0, moved);

    // Batch update sort_order
    const updates = sorted.map((p, i) => ({ id: p.id, sort_order: i }));
    await Promise.all(updates.map((u) => supabase.from("photos").update({ sort_order: u.sort_order }).eq("id", u.id)));
    queryClient.invalidateQueries({ queryKey: ["inspiration", projectId] });
  }, [filteredPhotos, projectId, queryClient]);

  const hasPhotos = totalCount > 0;

  // Gallery navigation
  const openGallery = (index: number) => setGalleryIndex(index);
  const closeGallery = () => { setGalleryIndex(null); setEditingCaption(null); };
  const galleryPhoto = galleryIndex !== null ? filteredPhotos[galleryIndex] : null;
  const galleryPrev = () => setGalleryIndex((i) => i !== null && i > 0 ? i - 1 : i);
  const galleryNext = () => setGalleryIndex((i) => i !== null && i < filteredPhotos.length - 1 ? i + 1 : i);

  return (
    <Card ref={inspoRef}>
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className={cn("flex items-center justify-between", !collapsed && "mb-3")}>
          {/* Section tabs — Inspiration vs Före & Efter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { if (inspoView === "beforeafter") setInspoView("gallery"); else setCollapsed(!collapsed); }}
              className={cn(
                "text-sm font-semibold uppercase tracking-wide flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                inspoView !== "beforeafter"
                  ? "text-foreground bg-muted/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("inspiration.title")}
              {inspoView !== "beforeafter" && (
                <ChevronDown className={cn("h-3 w-3 transition-transform", collapsed && "-rotate-90")} />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setInspoView("beforeafter"); setCollapsed(false); }}
              className={cn(
                "text-sm font-semibold uppercase tracking-wide flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                inspoView === "beforeafter"
                  ? "text-foreground bg-muted/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {t("inspiration.beforeAfter", "Före & Efter")}
            </button>
          </div>
          <div className="flex items-center gap-2">
          {/* Gallery/Moodboard sub-toggle — only for Inspiration tab */}
          {hasPhotos && inspoView !== "beforeafter" && (
            <div className="flex rounded-md border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setInspoView("gallery")}
                title={t("inspiration.gallery", "Galleri")}
                className={cn("p-1 rounded transition-colors", inspoView === "gallery" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInspoView("moodboard")}
                title="Moodboard"
                className={cn("p-1 rounded transition-colors", inspoView === "moodboard" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {/* Moodboard settings — only when moodboard active */}
          {hasPhotos && inspoView === "moodboard" && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title={t("common.settings", "Inställningar")}
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 space-y-3" align="end">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t("inspiration.background", "Bakgrund")}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODBOARD_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        title={bg.label}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                          moodboardBg === bg.color ? "border-primary scale-110" : "border-muted"
                        )}
                        style={{ backgroundColor: bg.color }}
                        onClick={() => setMoodboardBg(bg.color)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t">
                    <input
                      type="color"
                      value={moodboardBg}
                      onChange={(e) => setMoodboardBg(e.target.value)}
                      className="h-6 w-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={moodboardBg}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setMoodboardBg(e.target.value); }}
                      className="flex-1 px-1.5 py-0.5 text-[10px] font-mono rounded border bg-background w-16 focus:outline-none focus:ring-1 focus:ring-primary"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-1 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{t("inspiration.withGap", "Med mellanrum")}</span>
                    <button
                      type="button"
                      onClick={() => setMoodboardGap(!moodboardGap)}
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors relative",
                        moodboardGap ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        moodboardGap ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  {moodboardGap && (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={2}
                        max={24}
                        step={2}
                        value={moodboardGapSize}
                        onChange={(e) => setMoodboardGapSize(parseInt(e.target.value))}
                        className="flex-1 h-1 accent-primary cursor-pointer"
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">{moodboardGapSize}px</span>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {hasPhotos && (
            <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title={t("inspiration.add")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
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
        </div>

        {/* Collapsible content */}
        {!collapsed && (<>
        {/* Filters row — compact dropdowns */}
        {hasPhotos && rooms.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Room filter dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs hover:bg-accent transition-colors">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  {selectedRoom === "all"
                    ? `${t("common.all")} (${allPhotos.length})`
                    : selectedRoom === "untagged"
                      ? t("inspiration.untagged")
                      : rooms.find((r) => r.id === selectedRoom)?.name || t("common.all")}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start">
                <button
                  type="button"
                  className={cn("flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded", selectedRoom === "all" ? "bg-accent font-medium" : "hover:bg-accent")}
                  onClick={() => setSelectedRoom("all")}
                >
                  {t("common.all")} ({allPhotos.length})
                </button>
                {rooms.map((room) => {
                  const count = allPhotos.filter((p) => p.roomId === room.id).length;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={cn("flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded", selectedRoom === room.id ? "bg-accent font-medium" : "hover:bg-accent")}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      {room.name} {count > 0 && <span className="text-muted-foreground">({count})</span>}
                    </button>
                  );
                })}
                {allPhotos.some((p) => !p.roomId) && (
                  <button
                    type="button"
                    className={cn("flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded", selectedRoom === "untagged" ? "bg-accent font-medium" : "hover:bg-accent")}
                    onClick={() => setSelectedRoom("untagged")}
                  >
                    {t("inspiration.untagged")} ({allPhotos.filter((p) => !p.roomId).length})
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Before/After: phase filter + upload */}
            {inspoView === "beforeafter" && (
              <BeforeAfterUploader
                uploading={baUploading}
                selectedRoomId={selectedRoom !== "all" && selectedRoom !== "untagged" ? selectedRoom : null}
                onUpload={handleBeforeAfterUpload}
              />
            )}
          </div>
        )}

        {/* ===== GALLERY VIEW ===== */}
        {inspoView === "gallery" && (
        <>
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

        </>
        )}

        {/* ===== MOODBOARD VIEW ===== */}
        {inspoView === "moodboard" && (
          <div className="space-y-3">
            {/* Interactive grid — horizontal scroll on mobile */}
            <div
              className="rounded-xl overflow-x-auto overflow-y-hidden transition-colors -mx-1 px-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
            <div
              className="rounded-xl overflow-hidden transition-colors min-w-[600px]"
              style={{ backgroundColor: moodboardBg, padding: moodboardGap ? `${moodboardGapSize + 4}px` : "0" }}
              onClick={() => setSelectedPhotoId(null)}
            >
              {filteredPhotos.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm" style={{ color: hexLuminance(moodboardBg) < 128 ? "#999" : "#888" }}>
                  {t("inspiration.emptyTitle")}
                </div>
              ) : (
                <div
                  ref={moodboardGridRef}
                  className="grid grid-cols-6 auto-rows-[80px] sm:auto-rows-[100px] md:auto-rows-[120px]"
                  style={{ gap: moodboardGap ? `${moodboardGapSize}px` : "0px" }}
                >
                  {filteredPhotos
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((photo) => {
                      const isCircle = photo.cropShape === "circle";
                      // For circles: compute col-span so cell width ≈ cell height (square)
                      let circleColSpan = photo.gridColSpan;
                      if (isCircle && moodboardGridRef.current) {
                        const colW = moodboardGridRef.current.clientWidth / 6;
                        const gap = moodboardGap ? moodboardGapSize : 0;
                        const rowH = 120; // md auto-rows
                        const totalH = photo.gridRowSpan * rowH + (photo.gridRowSpan - 1) * gap;
                        circleColSpan = Math.max(1, Math.min(6, Math.round((totalH + gap) / (colW + gap))));
                      }
                      const spans = { col: isCircle ? circleColSpan : photo.gridColSpan, row: photo.gridRowSpan };
                      const isSelected = selectedPhotoId === photo.id;
                      const isDragging = dragPhotoId === photo.id;
                      const isDragOver = dragOverId === photo.id;
                      const isDark = hexLuminance(moodboardBg) < 128;

                      return (
                        <div
                          key={photo.id}
                          draggable={!isSelected}
                          onDragStart={(e) => { if (!isSelected) { setDragPhotoId(photo.id); e.dataTransfer.effectAllowed = "move"; } }}
                          onDragEnd={() => { setDragPhotoId(null); setDragOverId(null); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(photo.id); }}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={(e) => { e.preventDefault(); if (dragPhotoId) reorderPhotos(dragPhotoId, photo.id); setDragPhotoId(null); setDragOverId(null); }}
                          className={cn(
                            "relative group transition-all",
                            isSelected && isCircle ? "overflow-visible" : "overflow-hidden",
                            !isSelected && "cursor-grab active:cursor-grabbing",
                            isDragging && "opacity-40 scale-95",
                            isDragOver && !isDragging && "ring-2 ring-primary ring-offset-2",
                            isSelected && "ring-2 ring-primary ring-offset-1",
                          )}
                          style={{
                            gridColumn: `span ${Math.min(spans.col, 6)}`,
                            gridRow: `span ${spans.row}`,
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedPhotoId(isSelected ? null : photo.id); }}
                          onDoubleClick={(e) => { e.stopPropagation(); openGallery(filteredPhotos.indexOf(photo)); }}
                          ref={(el) => {
                            if (!el) return;
                            el.onwheel = null;
                          }}
                          onMouseDown={(e) => {
                            if (!isSelected || e.button !== 0) return;
                            if ((e.target as HTMLElement).closest('button, input')) return;
                            e.preventDefault();
                            const el = e.currentTarget as HTMLElement;
                            const img = el.querySelector('img');
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startOx = photo.cropOffsetX;
                            const startOy = photo.cropOffsetY;
                            const onMove = (me: MouseEvent) => {
                              const dx = (me.clientX - startX) * 0.15;
                              const dy = (me.clientY - startY) * 0.15;
                              const nx = Math.max(0, Math.min(100, startOx - dx));
                              const ny = Math.max(0, Math.min(100, startOy - dy));
                              if (img) img.style.objectPosition = `${nx}% ${ny}%`;
                            };
                            const onUp = (me: MouseEvent) => {
                              const dx = (me.clientX - startX) * 0.15;
                              const dy = (me.clientY - startY) * 0.15;
                              const nx = Math.max(0, Math.min(100, startOx - dx));
                              const ny = Math.max(0, Math.min(100, startOy - dy));
                              saveCropTransform(photo.id, photo.cropZoom, nx, ny);
                              window.removeEventListener("mousemove", onMove);
                              window.removeEventListener("mouseup", onUp);
                            };
                            window.addEventListener("mousemove", onMove);
                            window.addEventListener("mouseup", onUp);
                          }}
                        >
                          {/* Image wrapper — clips at circle boundary */}
                          <div
                            className={cn("overflow-hidden", isCircle ? "rounded-full absolute inset-0 m-auto" : "absolute inset-0")}
                            style={isCircle
                              ? { aspectRatio: "1", maxHeight: "100%", maxWidth: "100%" }
                              : { borderRadius: moodboardGap ? "6px" : "0" }
                            }
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || ""}
                              className="w-full h-full object-cover"
                              style={{
                                objectPosition: `${photo.cropOffsetX}% ${photo.cropOffsetY}%`,
                                transform: photo.cropZoom > 1 ? `scale(${photo.cropZoom})` : undefined,
                              }}
                              loading="lazy"
                              draggable={false}
                            />
                            {/* Caption overlay */}
                            {photo.caption && !isCircle && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-5 pointer-events-none">
                                <p className="text-[10px] text-white/90 truncate">{photo.caption}</p>
                              </div>
                            )}
                          </div>
                          {/* Room badge */}
                          {photo.roomName && !isCircle && (
                            <div className={cn("absolute top-1 left-1 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                              <Badge variant="secondary" className={cn("text-[9px] px-1 py-0", isDark ? "bg-white/20 text-white" : "")}>
                                {photo.roomName}
                              </Badge>
                            </div>
                          )}
                          {/* Hover action bar — link room + delete */}
                          <div className={cn(
                            "absolute bottom-1 left-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                            isSelected && "opacity-100"
                          )}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="h-6 w-6 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
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
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full bg-black/40 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                              onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
                            >
                              <Trash2 className="h-3 w-3 text-white" />
                            </button>
                          </div>
                          {/* Controls — circle toggle + zoom */}
                          {isSelected && (
                            <div
                              className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Circle toggle */}
                              <button
                                type="button"
                                className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center text-[11px] transition-colors",
                                  isCircle ? "bg-white text-black" : "text-white/60 hover:text-white"
                                )}
                                onClick={() => toggleCircle(photo.id, isCircle)}
                                title="Circle"
                              >○</button>
                              <div className="w-px h-3 bg-white/20" />
                              {/* Zoom slider */}
                              <button
                                type="button"
                                className="text-[9px] text-white/60 hover:text-white px-0.5"
                                onClick={() => saveCropTransform(photo.id, Math.max(1, photo.cropZoom - 0.2), photo.cropOffsetX, photo.cropOffsetY)}
                              >−</button>
                              <input
                                type="range"
                                min={1}
                                max={4}
                                step={0.1}
                                value={photo.cropZoom}
                                onChange={(e) => {
                                  const z = parseFloat(e.target.value);
                                  saveCropTransform(photo.id, z, photo.cropOffsetX, photo.cropOffsetY);
                                }}
                                className="w-14 h-1 accent-white cursor-pointer"
                                style={{ WebkitAppearance: "none", appearance: "none", background: "rgba(255,255,255,0.3)", borderRadius: "2px" }}
                              />
                              <button
                                type="button"
                                className="text-[9px] text-white/60 hover:text-white px-0.5"
                                onClick={() => saveCropTransform(photo.id, Math.min(4, photo.cropZoom + 0.2), photo.cropOffsetX, photo.cropOffsetY)}
                              >+</button>
                              <span className="text-[9px] text-white/70 tabular-nums w-6 text-center">{photo.cropZoom.toFixed(1)}×</span>
                            </div>
                          )}
                          {/* Resize handle — bottom-right corner drag */}
                          {isSelected && (
                            <div
                              className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startCol = photo.gridColSpan;
                                const startRow = photo.gridRowSpan;
                                const gridEl = (e.target as HTMLElement).closest('.grid');
                                const cellW = gridEl ? gridEl.clientWidth / 6 : 80;
                                const cellH = 120;
                                const onMove = (me: MouseEvent) => {
                                  const dx = me.clientX - startX;
                                  const dy = me.clientY - startY;
                                  if (isCircle) {
                                    // Circle: uniform resize — use the larger delta
                                    const delta = Math.abs(dx) > Math.abs(dy) ? dx / cellW : dy / cellH;
                                    const newSpan = Math.max(1, Math.min(6, Math.round(startCol + delta)));
                                    updateGridSpan(photo.id, newSpan, newSpan);
                                  } else {
                                    const newCol = Math.max(1, Math.min(6, Math.round(startCol + dx / cellW)));
                                    const newRow = Math.max(1, Math.min(6, Math.round(startRow + dy / cellH)));
                                    updateGridSpan(photo.id, newCol, newRow);
                                  }
                                };
                                const onUp = () => {
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                };
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" className="text-white drop-shadow-md">
                                <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* ===== BEFORE / AFTER VIEW ===== */}
        {inspoView === "beforeafter" && (
          <div className="space-y-4">
            {beforeAfterByRoom.length > 0 && (
              beforeAfterByRoom.map((group) => (
                <div key={group.id} className="rounded-lg border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 border-b">
                    <span className="text-sm font-medium">{group.name}</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x">
                    {(["before", "during", "after"] as const).map((phase) => {
                      const photos = group[phase];
                      const labels = {
                        before: t("inspiration.before", "Före"),
                        during: t("inspiration.during", "Pågående"),
                        after: t("inspiration.after", "Efter"),
                      };
                      return (
                        <div key={phase} className="p-2 space-y-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase text-center">{labels[phase]}</p>
                          {photos.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1">
                              {photos.map((photo) => (
                                <img
                                  key={photo.id}
                                  src={photo.url}
                                  alt={photo.caption || ""}
                                  className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                  loading="lazy"
                                  onClick={() => openGallery(allPhotos.findIndex((p) => p.id === photo.id))}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center aspect-square rounded border-2 border-dashed text-muted-foreground/30">
                              <Camera className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        </>)}
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
                      {galleryPhoto.sourceUrl ? (
                        <a
                          href={galleryPhoto.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-[140px]"
                          title={galleryPhoto.sourceUrl}
                        >
                          {galleryPhoto.source === "pinterest" ? "Pinterest" : new URL(galleryPhoto.sourceUrl).hostname.replace("www.", "")}
                        </a>
                      ) : (
                        <span>{t("inspiration.upload")}</span>
                      )}
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

/** Upload widget for Before/After photos — pick phase + room + file */
function BeforeAfterUploader({
  uploading,
  selectedRoomId,
  onUpload,
}: {
  uploading: boolean;
  selectedRoomId: string | null;
  onUpload: (file: File, category: "before" | "during" | "after", roomId: string | null) => void;
}) {
  const { t } = useTranslation();
  const [selectedPhase, setSelectedPhase] = useState<"before" | "during" | "after">("before");

  const phases = [
    { key: "before" as const, label: t("inspiration.before", "Före"), color: "text-amber-600 bg-amber-50 border-amber-200" },
    { key: "during" as const, label: t("inspiration.during", "Pågående"), color: "text-blue-600 bg-blue-50 border-blue-200" },
    { key: "after" as const, label: t("inspiration.after", "Efter"), color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Phase selector — compact pills */}
      <div className="flex rounded-md border bg-muted/30 p-0.5">
        {phases.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setSelectedPhase(p.key)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              selectedPhase === p.key ? p.color : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Upload button */}
      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer ml-auto">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        {uploading ? t("common.uploading", "Laddar upp...") : t("inspiration.uploadPhoto", "Välj bild")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload(file, selectedPhase, selectedRoomId);
              e.target.value = "";
            }
          }}
        />
      </label>
    </div>
  );
}
