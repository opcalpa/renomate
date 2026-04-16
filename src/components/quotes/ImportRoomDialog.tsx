import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { DoorOpen, Check } from "lucide-react";

interface Room {
  id: string;
  name: string;
  dimensions: Record<string, unknown> | null;
}

interface ImportRoomDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onSelect: (roomId: string, areaSqm: number) => void;
  /** Currently selected room ID — shows checkmark */
  selectedRoomId?: string;
}

export function ImportRoomDialog({ open, onClose, projectId, onSelect, selectedRoomId }: ImportRoomDialogProps) {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!open || !projectId) return;
    supabase
      .from("rooms")
      .select("id, name, dimensions")
      .eq("project_id", projectId)
      .then(({ data }) => {
        if (data) setRooms(data as Room[]);
      });
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
            {t("quotes.selectRoom")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t("rooms.noRooms")}</p>
          )}
          {rooms.map((room) => {
            const area = (room.dimensions as Record<string, unknown>)?.area_sqm as number | undefined;
            const isSelected = room.id === selectedRoomId;
            return (
              <button
                key={room.id}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30 hover:bg-accent/50"
                }`}
                onClick={() => {
                  onSelect(room.id, area ?? 0);
                  onClose();
                }}
              >
                {isSelected ? (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{room.name}</span>
                  {area != null && area > 0 && (
                    <span className="block text-xs text-muted-foreground">{area} m²</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
