import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloorMapShape, LineCoordinates, RectangleCoordinates } from "./types";
import { getDimensionLabel } from "./utils/geometry";
import { useFloorMapStore } from "./store";
import { convertFromMM, convertToMM } from "./utils/units";

interface Room {
  id: string;
  name: string;
}

interface ShapePropertiesPanelProps {
  shape: FloorMapShape;
  rooms: Room[];
  onRoomAssign: (roomId: string | null) => void;
  onCreateRoom: (name: string) => void;
}

export const ShapePropertiesPanel = ({
  shape,
  rooms,
  onRoomAssign,
  onCreateRoom,
}: ShapePropertiesPanelProps) => {
  const { t } = useTranslation();
  const { updateShape, gridSettings } = useFloorMapStore();
  const [newRoomName, setNewRoomName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });

  const [wallHeight, setWallHeight] = useState(2400); // Default 2.4m in mm
  const [wallThickness, setWallThickness] = useState(100); // Default 100mm wall thickness
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (shape) {
      if (shape.type === 'line' || shape.type === 'wall') {
        const coords = shape.coordinates as LineCoordinates;
        const length = Math.sqrt(
          Math.pow(coords.x2 - coords.x1, 2) + Math.pow(coords.y2 - coords.y1, 2)
        );
        setDimensions({
          width: Math.round(length),
          height: 0,
          x: Math.round(coords.x1),
          y: Math.round(coords.y1),
        });
        setWallHeight(shape.heightMM || 2400);
        setWallThickness(shape.thicknessMM || 100);
      } else if (shape.type === 'rectangle') {
        const coords = shape.coordinates as RectangleCoordinates;
        setDimensions({
          width: Math.round(coords.width),
          height: Math.round(coords.height),
          x: Math.round(coords.left),
          y: Math.round(coords.top),
        });
      }
      // Load notes
      setNotes(shape.notes || "");
    }
  }, [shape]);

  const calculateArea = () => {
    if (!shape || shape.type !== 'rectangle') return 0;
    const coords = shape.coordinates as RectangleCoordinates;
    const area = coords.width * coords.height;
    return Math.round(area);
  };

  const calculatePerimeter = () => {
    if (!shape) return 0;
    
    if (shape.type === 'rectangle') {
      const coords = shape.coordinates as RectangleCoordinates;
      const perimeter = 2 * (coords.width + coords.height);
      return Math.round(perimeter);
    } else if (shape.type === 'line') {
      const coords = shape.coordinates as LineCoordinates;
      const dx = coords.x2 - coords.x1;
      const dy = coords.y2 - coords.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      return Math.round(length);
    }
    
    return 0;
  };

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      onCreateRoom(newRoomName.trim());
      setNewRoomName("");
      setIsDialogOpen(false);
    }
  };

  const handleDimensionChange = (field: 'width' | 'height' | 'x' | 'y', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newDimensions = { ...dimensions, [field]: numValue };
    setDimensions(newDimensions);

    if (shape.type === 'rectangle') {
      const coords = shape.coordinates as RectangleCoordinates;
      updateShape(shape.id, {
        coordinates: {
          ...coords,
          width: field === 'width' ? numValue : coords.width,
          height: field === 'height' ? numValue : coords.height,
          left: field === 'x' ? numValue : coords.left,
          top: field === 'y' ? numValue : coords.top,
        },
      });
      } else if (shape.type === 'line' || shape.type === 'wall') {
        const coords = shape.coordinates as LineCoordinates;
        if (field === 'width') {
        const angle = Math.atan2(coords.y2 - coords.y1, coords.x2 - coords.x1);
        updateShape(shape.id, {
          coordinates: {
            ...coords,
            x2: coords.x1 + numValue * Math.cos(angle),
            y2: coords.y1 + numValue * Math.sin(angle),
          },
        });
      } else if (field === 'x' || field === 'y') {
        const dx = coords.x2 - coords.x1;
        const dy = coords.y2 - coords.y1;
        updateShape(shape.id, {
          coordinates: {
            x1: field === 'x' ? numValue : coords.x1,
            y1: field === 'y' ? numValue : coords.y1,
            x2: field === 'x' ? numValue + dx : coords.x2,
            y2: field === 'y' ? numValue + dy : coords.y2,
          },
        });
      }
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    updateShape(shape.id, { notes: value });
  };

  if (!shape) return null;

  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-4">
      <h3 className="font-semibold text-base">{t("Object Properties")}</h3>
      
      <div className="space-y-2">
        <Label>{t("Type")}</Label>
        <p className="text-sm text-muted-foreground capitalize">{shape.type}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("Dimensions")} ({gridSettings.unit})</Label>
        <div className="grid grid-cols-2 gap-2">
          {shape.type === 'line' || shape.type === 'wall' ? (
            <>
              <div className="col-span-2">
                <Label htmlFor="length" className="text-xs text-muted-foreground">{t("Length")}</Label>
                <Input
                  id="length"
                  type="number"
                  value={convertFromMM(dimensions.width, gridSettings.unit).toFixed(2)}
                  onChange={(e) => {
                    const valueInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                    handleDimensionChange('width', valueInMM.toString());
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="wall-height" className="text-xs text-muted-foreground">{t("Wall Height")}</Label>
                <Input
                  id="wall-height"
                  type="number"
                  value={convertFromMM(wallHeight, gridSettings.unit).toFixed(2)}
                  onChange={(e) => {
                    const heightInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                    setWallHeight(heightInMM);
                    updateShape(shape.id, { heightMM: heightInMM });
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="wall-thickness" className="text-xs text-muted-foreground">{t("Wall Thickness")}</Label>
                <Input
                  id="wall-thickness"
                  type="number"
                  value={convertFromMM(wallThickness, gridSettings.unit).toFixed(2)}
                  onChange={(e) => {
                    const thicknessInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                    setWallThickness(thicknessInMM);
                    updateShape(shape.id, { thicknessMM: thicknessInMM });
                  }}
                  className="h-8 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="width" className="text-xs text-muted-foreground">{t("Width")}</Label>
                <Input
                  id="width"
                  type="number"
                  value={convertFromMM(dimensions.width, gridSettings.unit).toFixed(2)}
                  onChange={(e) => {
                    const valueInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                    handleDimensionChange('width', valueInMM.toString());
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs text-muted-foreground">{t("Height")}</Label>
                <Input
                  id="height"
                  type="number"
                  value={convertFromMM(dimensions.height, gridSettings.unit).toFixed(2)}
                  onChange={(e) => {
                    const valueInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                    handleDimensionChange('height', valueInMM.toString());
                  }}
                  className="h-8 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("Position")} ({gridSettings.unit})</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="pos-x" className="text-xs text-muted-foreground">X</Label>
            <Input
              id="pos-x"
              type="number"
              value={convertFromMM(dimensions.x, gridSettings.unit).toFixed(2)}
              onChange={(e) => {
                const valueInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                handleDimensionChange('x', valueInMM.toString());
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="pos-y" className="text-xs text-muted-foreground">Y</Label>
            <Input
              id="pos-y"
              type="number"
              value={convertFromMM(dimensions.y, gridSettings.unit).toFixed(2)}
              onChange={(e) => {
                const valueInMM = convertToMM(parseFloat(e.target.value) || 0, gridSettings.unit);
                handleDimensionChange('y', valueInMM.toString());
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("Construction Notes & Instructions")}
        </Label>
        <Textarea
          placeholder={t("Add notes, instructions, or specifications for this component...")}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="min-h-[100px] text-sm resize-y"
        />
        <p className="text-xs text-muted-foreground">
          {t("These notes will be saved with this object and can include material specifications, installation instructions, or any relevant details.")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t("Assign to Room")}</Label>
        <div className="flex gap-2">
          <Select
            value={shape.roomId || "unassigned"}
            onValueChange={(value) => 
              onRoomAssign(value === "unassigned" ? null : value)
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("Select room")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">{t("Unassigned")}</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("Create New Room")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">{t("Room Name")}</Label>
                  <Input
                    id="room-name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder={t("Enter room name")}
                  />
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                  {t("Create Room")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {shape.type === "rectangle" && (
        <>
          <div className="space-y-2">
            <Label>{t("Area")}</Label>
            <p className="text-sm text-muted-foreground">
              {convertFromMM(Math.sqrt(calculateArea()), gridSettings.unit).toFixed(2)}² {gridSettings.unit}²
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("Perimeter")}</Label>
            <p className="text-sm text-muted-foreground">
              {convertFromMM(calculatePerimeter(), gridSettings.unit).toFixed(2)} {gridSettings.unit}
            </p>
          </div>
        </>
      )}

      {(shape.type === "line" || shape.type === "wall") && (
        <div className="space-y-2">
          <Label>{t("Wall Length")}</Label>
          <p className="text-sm text-muted-foreground">
            {convertFromMM(calculatePerimeter(), gridSettings.unit).toFixed(2)} {gridSettings.unit}
          </p>
        </div>
      )}
    </div>
  );
};
