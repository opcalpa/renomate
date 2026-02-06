import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFloorMapStore } from "../../store";
import type { Room, RoomFormData } from "../types";
import { DEFAULT_FORM_VALUES } from "../constants";

// Helper function to get darker version for stroke (70% darker)
const getDarkerColor = (rgbaColor: string): string => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = Math.floor(parseInt(match[1]) * 0.7);
    const g = Math.floor(parseInt(match[2]) * 0.7);
    const b = Math.floor(parseInt(match[3]) * 0.7);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
  return rgbaColor;
};

interface UseRoomFormOptions {
  room: Room | null;
  projectId: string;
  onRoomUpdated?: () => void;
  onClose?: () => void;
}

export function useRoomForm({ room, projectId, onRoomUpdated, onClose }: UseRoomFormOptions) {
  const { t } = useTranslation();
  const isNewRoom = !room;
  const [formData, setFormData] = useState<RoomFormData>(DEFAULT_FORM_VALUES);
  const [saving, setSaving] = useState(false);

  const { updateShape, shapes } = useFloorMapStore();

  // Initialize form data from room or defaults for new room
  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name || "",
        description: room.description || "",
        color: room.color || "rgba(59, 130, 246, 0.2)",
        status: room.status || "existing",
        ceiling_height_mm: room.ceiling_height_mm || 2400,
        priority: room.priority || "medium",
        links: room.links || "",
        notes: room.notes || "",
        floor_spec: room.floor_spec || {},
        ceiling_spec: room.ceiling_spec || {},
        wall_spec: room.wall_spec || {},
        joinery_spec: room.joinery_spec || {},
        electrical_spec: room.electrical_spec || {},
        heating_spec: room.heating_spec || {},
      });
    } else {
      // Reset to defaults for new room
      setFormData(DEFAULT_FORM_VALUES);
    }
  }, [room]);

  // Update form data
  const updateFormData = useCallback((updates: Partial<RoomFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Update a specific spec field
  const updateSpec = useCallback(
    <K extends keyof RoomFormData>(specKey: K, updates: Partial<RoomFormData[K]>) => {
      setFormData((prev) => ({
        ...prev,
        [specKey]: { ...(prev[specKey] as object), ...updates },
      }));
    },
    []
  );

  // Save handler - handles both create and update
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error(t('roomForm.nameRequired', 'Room name is required'));
      return;
    }

    setSaving(true);
    try {
      if (isNewRoom) {
        // Create new room
        const { error: createError } = await supabase
          .from("rooms")
          .insert({
            project_id: projectId,
            name: formData.name.trim(),
            description: formData.description?.trim() || null,
            color: formData.color,
            status: formData.status,
            ceiling_height_mm: formData.ceiling_height_mm,
            priority: formData.priority,
            links: formData.links?.trim() || null,
            notes: formData.notes?.trim() || null,
            floor_spec: formData.floor_spec,
            ceiling_spec: formData.ceiling_spec,
            wall_spec: formData.wall_spec,
            joinery_spec: formData.joinery_spec,
            electrical_spec: formData.electrical_spec,
            heating_spec: formData.heating_spec,
          });

        if (createError) throw createError;

        // Mark onboarding step for drawing first room
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ onboarding_drawn_room: true })
            .eq("user_id", user.id);
        }

        toast.success(t('roomForm.roomCreated', 'Room created!'));
        onRoomUpdated?.();
        onClose?.();
      } else {
        // Update existing room
        const { error: roomError } = await supabase
          .from("rooms")
          .update({
            name: formData.name.trim(),
            description: formData.description?.trim() || null,
            color: formData.color,
            status: formData.status,
            ceiling_height_mm: formData.ceiling_height_mm,
            priority: formData.priority,
            links: formData.links?.trim() || null,
            notes: formData.notes?.trim() || null,
            floor_spec: formData.floor_spec,
            ceiling_spec: formData.ceiling_spec,
            wall_spec: formData.wall_spec,
            joinery_spec: formData.joinery_spec,
            electrical_spec: formData.electrical_spec,
            heating_spec: formData.heating_spec,
          })
          .eq("id", room!.id);

        if (roomError) throw roomError;

        // Update floor_map_shapes table (the shape on canvas)
        await supabase
          .from("floor_map_shapes")
          .update({
            color: formData.color,
            stroke_color: getDarkerColor(formData.color),
          })
          .eq("room_id", room!.id);

        // Update canvas state immediately
        const roomShape = shapes.find((s) => s.roomId === room!.id && s.type === "room");
        if (roomShape) {
          updateShape(roomShape.id, {
            color: formData.color,
            strokeColor: getDarkerColor(formData.color),
            name: formData.name.trim(),
          });
        }

        toast.success(t('roomForm.roomUpdated', 'Room updated!'));
        onRoomUpdated?.();
      }
    } catch (error) {
      console.error("Error saving room:", error);
      toast.error(isNewRoom
        ? t('roomForm.couldNotCreate', 'Could not create room')
        : t('roomForm.couldNotUpdate', 'Could not update room'));
    } finally {
      setSaving(false);
    }
  }, [room, isNewRoom, projectId, formData, shapes, updateShape, onRoomUpdated, onClose, t]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!room) return;

    if (
      !confirm(t('roomForm.confirmDelete', 'Are you sure you want to delete this room? This action cannot be undone.'))
    ) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", room.id);

      if (error) throw error;

      toast.success(t('roomForm.roomDeleted', 'Room deleted!'));
      onRoomUpdated?.();
      onClose?.();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t('roomForm.couldNotDelete', 'Could not delete room'));
    } finally {
      setSaving(false);
    }
  }, [room, onRoomUpdated, onClose, t]);

  return {
    formData,
    updateFormData,
    updateSpec,
    saving,
    isNewRoom,
    handleSave,
    handleDelete,
  };
}
