import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

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
}

export function ImportRoomDialog({ open, onClose, projectId, onSelect }: ImportRoomDialogProps) {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("quotes.selectRoom")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("rooms.noRooms")}</p>
          )}
          {rooms.map((room) => {
            const area = (room.dimensions as Record<string, unknown>)?.area_sqm as number | undefined;
            return (
              <button
                key={room.id}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent min-h-[48px] flex justify-between items-center"
                onClick={() => {
                  onSelect(room.id, area ?? 0);
                  onClose();
                }}
              >
                <span className="font-medium">{room.name}</span>
                {area != null && (
                  <span className="text-sm text-muted-foreground">
                    {t("quotes.roomArea")}: {area} m²
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
