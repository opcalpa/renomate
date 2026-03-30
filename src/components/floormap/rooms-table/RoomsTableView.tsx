import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Trash2 } from "lucide-react";
import { getAreaUnitLabel } from "../utils/units";
import { formatMeasurement } from "../utils/formatting";
import {
  ROOM_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  FLOOR_MATERIAL_OPTIONS,
} from "../room-details/constants";
import type { CeilingSpec } from "../room-details/types";
import { computeWallArea, computePaintEstimate } from "./computations";
import { useRoomInlineEdit } from "./useRoomInlineEdit";
import type { Room, FieldKey, EditableFieldKey, FieldDefinition } from "./types";

interface RoomsTableViewProps {
  rooms: Room[];
  visibleFields: FieldKey[];
  fieldDefinitions: FieldDefinition[];
  selectedRoomIds: Set<string>;
  onRoomClick: (room: Room) => void;
  onToggleSelection: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
  onNavigateToRoom?: (room: Room) => void;
  onPlaceRoom?: (room: Room) => void;
  onRoomUpdated?: () => void;
  onOptimisticUpdate?: (roomId: string, updates: Partial<Room>) => void;
  formatDate: (dateString: string) => string;
}

export function RoomsTableView({
  rooms,
  visibleFields,
  fieldDefinitions,
  selectedRoomIds,
  onRoomClick,
  onToggleSelection,
  onDeleteRoom,
  onNavigateToRoom,
  onPlaceRoom,
  onRoomUpdated,
  onOptimisticUpdate,
  formatDate,
}: RoomsTableViewProps) {
  const { t } = useTranslation();
  const {
    editingCell,
    editValue,
    setEditValue,
    startEditing,
    cancelEditing,
    saveEdit,
  } = useRoomInlineEdit(onRoomUpdated, onOptimisticUpdate);

  const isRoomPlacedOnCanvas = (room: Room): boolean => {
    return !!(
      room.floor_plan_position?.points &&
      room.floor_plan_position.points.length > 0
    );
  };

  const getStatusLabel = useCallback(
    (status: string | null | undefined) => {
      if (!status) return "\u2014";
      const opt = ROOM_STATUS_OPTIONS.find((o) => o.value === status);
      return opt ? t(opt.labelKey) : status;
    },
    [t]
  );

  const getPriorityLabel = useCallback(
    (priority: string | null | undefined) => {
      if (!priority) return "\u2014";
      const opt = PRIORITY_OPTIONS.find((o) => o.value === priority);
      return opt ? t(opt.labelKey) : priority;
    },
    [t]
  );

  const getFloorMaterialLabel = useCallback(
    (material: string | null | undefined) => {
      if (!material) return "\u2014";
      const opt = FLOOR_MATERIAL_OPTIONS.find((o) => o.value === material);
      return opt ? t(opt.labelKey) : material;
    },
    [t]
  );

  const getCellDisplayValue = useCallback(
    (room: Room, field: FieldKey): string => {
      switch (field) {
        case "area":
          return room.dimensions?.area_sqm
            ? `${room.dimensions.area_sqm.toFixed(2)} ${getAreaUnitLabel('metric')}`
            : "\u2014";
        case "width":
          return room.dimensions?.width_mm
            ? formatMeasurement(room.dimensions.width_mm, 'mm')
            : "\u2014";
        case "depth":
          return room.dimensions?.height_mm
            ? formatMeasurement(room.dimensions.height_mm, 'mm')
            : "\u2014";
        case "perimeter":
          return room.dimensions?.perimeter_mm
            ? formatMeasurement(room.dimensions.perimeter_mm, 'm')
            : "\u2014";
        case "status":
          return getStatusLabel(room.status);
        case "floorMaterial":
          return getFloorMaterialLabel(room.floor_spec?.material);
        case "wallColor":
          return room.wall_spec?.main_color || "\u2014";
        case "ceilingHeight":
          return room.ceiling_height_mm
            ? formatMeasurement(room.ceiling_height_mm, 'm')
            : "\u2014";
        case "priority":
          return getPriorityLabel(room.priority);
        case "created":
          return room.created_at ? formatDate(room.created_at) : "\u2014";
        case "description":
          return room.description || "\u2014";
        case "notes":
          return room.notes || "\u2014";
        case "ceilingColor": {
          const cs = room.ceiling_spec as CeilingSpec | null | undefined;
          return room.ceiling_color || cs?.color || "\u2014";
        }
        case "trimColor":
          return room.trim_color || "\u2014";
        case "wallArea": {
          const wa = computeWallArea(room);
          return wa !== null ? `${wa.toFixed(1)} ${getAreaUnitLabel('metric')}` : "\u2014";
        }
        case "paintEstimate": {
          const pe = computePaintEstimate(room);
          return pe !== null ? `~${pe} L` : "\u2014";
        }
        default:
          return "\u2014";
      }
    },
    [getStatusLabel, getPriorityLabel, getFloorMaterialLabel, formatDate]
  );

  const getEditableCurrentValue = useCallback(
    (room: Room, field: EditableFieldKey): string => {
      switch (field) {
        case "area":
          return room.dimensions?.area_sqm
            ? room.dimensions.area_sqm.toFixed(2)
            : "";
        case "width":
          return room.dimensions?.width_mm
            ? String(room.dimensions.width_mm)
            : "";
        case "depth":
          return room.dimensions?.height_mm
            ? String(room.dimensions.height_mm)
            : "";
        case "description":
          return room.description || "";
        case "notes":
          return room.notes || "";
        case "ceilingColor": {
          const cs = room.ceiling_spec as CeilingSpec | null | undefined;
          return room.ceiling_color || cs?.color || "";
        }
        case "trimColor":
          return room.trim_color || "";
        case "wallColor":
          return room.wall_spec?.main_color || "";
        case "floorMaterial":
          return room.floor_spec?.material || "";
        case "ceilingHeight":
          return room.ceiling_height_mm
            ? (room.ceiling_height_mm / 1000).toFixed(2)
            : "";
        case "status":
          return room.status || "";
        case "priority":
          return room.priority || "";
      }
    },
    []
  );

  const isEditing = (roomId: string, field: FieldKey) =>
    editingCell?.roomId === roomId && editingCell?.field === field;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, room: Room) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(room);
      } else if (e.key === "Escape") {
        cancelEditing();
      }
    },
    [saveEdit, cancelEditing]
  );

  const renderSelectCell = (
    room: Room,
    field: "status" | "priority" | "floorMaterial",
    options: { value: string; labelKey: string }[]
  ) => {
    if (isEditing(room.id, field)) {
      return (
        <Select
          value={editValue}
          onValueChange={(v) => {
            setEditValue(v);
            saveEdit(room, v);
          }}
          open
          onOpenChange={(open) => {
            if (!open) cancelEditing();
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const display = getCellDisplayValue(room, field);
    return (
      <button
        type="button"
        className="w-full text-left px-1 py-0.5 rounded hover:bg-muted cursor-pointer text-xs"
        onClick={(e) => {
          e.stopPropagation();
          startEditing(
            room.id,
            field,
            getEditableCurrentValue(room, field)
          );
        }}
      >
        {field === "status" && room.status ? (
          <Badge variant="outline" className="text-xs">
            {display}
          </Badge>
        ) : (
          display
        )}
      </button>
    );
  };

  const renderEditableTextCell = (
    room: Room,
    field: EditableFieldKey
  ) => {
    if (isEditing(room.id, field)) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(room)}
          onKeyDown={(e) => handleKeyDown(e, room)}
          className="h-7 text-xs"
          type={["ceilingHeight", "area", "width", "depth"].includes(field) ? "number" : "text"}
          step={field === "ceilingHeight" || field === "area" ? "0.01" : field === "width" || field === "depth" ? "1" : undefined}
        />
      );
    }

    const display = getCellDisplayValue(room, field);
    return (
      <button
        type="button"
        className="w-full text-left px-1 py-0.5 rounded hover:bg-muted cursor-text text-xs truncate max-w-[200px]"
        onClick={(e) => {
          e.stopPropagation();
          startEditing(
            room.id,
            field,
            getEditableCurrentValue(room, field)
          );
        }}
        title={display !== "\u2014" ? display : undefined}
      >
        {display}
      </button>
    );
  };

  const renderCell = (room: Room, field: FieldKey) => {
    // Select-based editable fields
    if (field === "status") {
      return renderSelectCell(room, "status", ROOM_STATUS_OPTIONS);
    }
    if (field === "priority") {
      return renderSelectCell(room, "priority", PRIORITY_OPTIONS);
    }
    if (field === "floorMaterial") {
      return renderSelectCell(room, "floorMaterial", FLOOR_MATERIAL_OPTIONS);
    }

    // Text/number editable fields
    const def = fieldDefinitions.find((d) => d.key === field);
    if (def?.editable) {
      return renderEditableTextCell(room, field as EditableFieldKey);
    }

    // Read-only fields
    return (
      <span className="text-xs">{getCellDisplayValue(room, field)}</span>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t("rooms.roomName", "Namn")}</TableHead>
            {visibleFields.map((field) => {
              const def = fieldDefinitions.find((f) => f.key === field);
              return (
                <TableHead key={field}>
                  {t(def?.labelKey || field)}
                </TableHead>
              );
            })}
            <TableHead className="w-24 text-right">
              {t("common.actions", "Actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((room) => (
            <TableRow
              key={room.id}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedRoomIds.has(room.id) ? "bg-blue-50" : ""
              }`}
              onClick={() => onRoomClick(room)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedRoomIds.has(room.id)}
                  onCheckedChange={() => onToggleSelection(room.id)}
                />
              </TableCell>
              <TableCell>
                <span className="font-medium">{room.name}</span>
              </TableCell>
              {visibleFields.map((field) => (
                <TableCell
                  key={field}
                  className="text-sm"
                  onClick={(e) => {
                    const def = fieldDefinitions.find((d) => d.key === field);
                    if (def?.editable) e.stopPropagation();
                  }}
                >
                  {renderCell(room, field)}
                </TableCell>
              ))}
              <TableCell
                className="text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            isRoomPlacedOnCanvas(room)
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                              : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          }
                          onClick={() => {
                            if (isRoomPlacedOnCanvas(room)) {
                              onNavigateToRoom?.(room);
                            } else {
                              onPlaceRoom?.(room);
                            }
                          }}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isRoomPlacedOnCanvas(room)
                          ? t("rooms.showOnFloorPlan", "Visa på ritning")
                          : t(
                              "rooms.placeOnFloorPlan",
                              "Placera på ritning"
                            )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {onDeleteRoom && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDeleteRoom(room.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("common.delete", "Ta bort")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
