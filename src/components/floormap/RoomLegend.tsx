import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRoomColor } from "./RoomColorPalette";

interface Room {
  id: string;
  name: string;
}

interface RoomLegendProps {
  rooms: Room[];
  assignedRooms: Set<string>;
}

export const RoomLegend = ({ rooms, assignedRooms }: RoomLegendProps) => {
  const { t } = useTranslation();
  if (rooms.length === 0) return null;

  const activeRooms = rooms.filter((room) => assignedRooms.has(room.id));

  if (activeRooms.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t('floormap.roomColors')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeRooms.map((room) => (
          <div key={room.id} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-border flex-shrink-0"
              style={{ backgroundColor: getRoomColor(room.id) }}
            />
            <span className="text-sm truncate">{room.name}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
