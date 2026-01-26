import { useState, useCallback, useEffect } from "react";
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
  onRoomUpdated?: () => void;
  onClose?: () => void;
}

export function useRoomForm({ room, onRoomUpdated, onClose }: UseRoomFormOptions) {
  const [formData, setFormData] = useState<RoomFormData>(DEFAULT_FORM_VALUES);
  const [saving, setSaving] = useState(false);

  const { updateShape, shapes } = useFloorMapStore();

  // Initialize form data from room
  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name || "",
        description: room.description || "",
        color: room.color || "rgba(59, 130, 246, 0.2)",
        status: room.status || "befintligt",
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

  // Save handler
  const handleSave = useCallback(async () => {
    if (!room || !formData.name.trim()) {
      toast.error("Rumsnamn krävs");
      return;
    }

    setSaving(true);
    try {
      // Update rooms table
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
        .eq("id", room.id);

      if (roomError) throw roomError;

      // Update floor_map_shapes table (the shape on canvas)
      await supabase
        .from("floor_map_shapes")
        .update({
          color: formData.color,
          stroke_color: getDarkerColor(formData.color),
        })
        .eq("room_id", room.id);

      // Update canvas state immediately
      const roomShape = shapes.find((s) => s.roomId === room.id && s.type === "room");
      if (roomShape) {
        updateShape(roomShape.id, {
          color: formData.color,
          strokeColor: getDarkerColor(formData.color),
          name: formData.name.trim(),
        });
      }

      toast.success("Rum uppdaterat!");
      onRoomUpdated?.();
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("Kunde inte uppdatera rum");
    } finally {
      setSaving(false);
    }
  }, [room, formData, shapes, updateShape, onRoomUpdated]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!room) return;

    if (
      !confirm(
        "Är du säker på att du vill ta bort detta rum? Denna åtgärd kan inte ångras."
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", room.id);

      if (error) throw error;

      toast.success("Rum borttaget!");
      onRoomUpdated?.();
      onClose?.();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Kunde inte ta bort rum");
    } finally {
      setSaving(false);
    }
  }, [room, onRoomUpdated, onClose]);

  return {
    formData,
    updateFormData,
    updateSpec,
    saving,
    handleSave,
    handleDelete,
  };
}
