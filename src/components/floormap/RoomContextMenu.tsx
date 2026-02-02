import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";

interface Room {
  id: string;
  name: string;
}

interface RoomContextMenuProps {
  x: number;
  y: number;
  rooms: Room[];
  currentRoomId?: string;
  onAssignRoom: (roomId: string | null) => void;
  onClose: () => void;
}

export const RoomContextMenu = ({
  x,
  y,
  rooms,
  currentRoomId,
  onAssignRoom,
  onClose,
}: RoomContextMenuProps) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    // Adjust position if menu would go off-screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = x + rect.width > window.innerWidth ? x - rect.width : x;
      const newY = y + rect.height > window.innerHeight ? y - rect.height : y;
      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleSelect = (roomId: string | null) => {
    onAssignRoom(roomId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-scale-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <Card className="w-56 shadow-lg border-border">
        <CardContent className="p-2">
          <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
            {t('roomContextMenu.assignToRoom')}
          </div>
          <Separator className="my-1" />
          <div className="space-y-0.5">
            <Button
              variant="ghost"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={() => handleSelect(null)}
            >
              {!currentRoomId && <Check className="h-4 w-4 mr-2" />}
              {!currentRoomId && <span className="flex-1 text-left">{t('roomContextMenu.unassigned')}</span>}
              {currentRoomId && <span className="flex-1 text-left ml-6">{t('roomContextMenu.unassigned')}</span>}
            </Button>
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant="ghost"
                className="w-full justify-start h-8 px-2 text-sm"
                onClick={() => handleSelect(room.id)}
              >
                {currentRoomId === room.id && <Check className="h-4 w-4 mr-2" />}
                {currentRoomId !== room.id && <span className="w-6" />}
                <span className="flex-1 text-left">{room.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
