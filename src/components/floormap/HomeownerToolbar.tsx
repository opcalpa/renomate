import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  MousePointer2,
  Home,
  DoorOpen,
  Armchair,
  Ruler,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Save,
  Undo2,
  Redo2,
  Trash2,
  Minus,
  Pencil,
  Square,
  Circle,
  Type,
  Eraser,
  Scissors,
  Link,
  Triangle,
  Spline,
  ArrowRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFloorMapStore } from "./store";
import { ObjectLibraryPanel } from "./objectLibrary/ObjectLibraryPanel";
import { CanvasSettingsPopover } from "./CanvasSettingsPopover";
import type { UnifiedObjectDefinition } from "./objectLibrary/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tool } from "./types";

interface HomeownerToolbarProps {
  projectId: string;
  onSave: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ToolButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  highlight?: boolean;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon: Icon, label, isActive, onClick, highlight, disabled }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center rounded-lg transition-colors",
          highlight ? "w-12 h-12" : "w-10 h-10",
          disabled && "opacity-40 cursor-not-allowed",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        )}
      >
        <Icon className={highlight ? "h-6 w-6" : "h-5 w-5"} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right">{label}</TooltipContent>
  </Tooltip>
);

// Door/window sub-options
const DOOR_WINDOW_OPTIONS: { tool: Tool; labelKey: string; fallback: string }[] = [
  { tool: "door_line", labelKey: "floormap.tools.doorLine", fallback: "Door" },
  { tool: "window_line", labelKey: "floormap.tools.windowLine", fallback: "Window" },
  { tool: "sliding_door_line", labelKey: "floormap.tools.slidingDoor", fallback: "Sliding Door" },
];

// Extended tools shown when "More" is expanded
const EXTRA_TOOLS: { tool: Tool; icon: React.ElementType; labelKey: string; fallback: string }[] = [
  { tool: "wall", icon: Minus, labelKey: "floormap.wall", fallback: "Wall" },
  { tool: "freehand", icon: Pencil, labelKey: "floormap.tools.freehand", fallback: "Freehand" },
  { tool: "rectangle", icon: Square, labelKey: "floormap.rectangle", fallback: "Rectangle" },
  { tool: "circle", icon: Circle, labelKey: "floormap.circle", fallback: "Circle" },
  { tool: "triangle", icon: Triangle, labelKey: "floormap.tools.triangle", fallback: "Triangle" },
  { tool: "bezier", icon: Spline, labelKey: "floormap.tools.bezier", fallback: "Curve" },
  { tool: "connector", icon: ArrowRight, labelKey: "floormap.tools.connector", fallback: "Connector" },
  { tool: "text", icon: Type, labelKey: "floormap.tools.text", fallback: "Text" },
  { tool: "eraser", icon: Eraser, labelKey: "floormap.tools.eraser", fallback: "Eraser" },
  { tool: "scissors", icon: Scissors, labelKey: "floormap.tools.scissors", fallback: "Split" },
  { tool: "glue", icon: Link, labelKey: "floormap.tools.glue", fallback: "Merge" },
];

export const HomeownerToolbar: React.FC<HomeownerToolbarProps> = ({
  onSave,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const { t } = useTranslation();
  const { activeTool, setActiveTool, setPendingObjectId } = useFloorMapStore();

  const [doorWindowOpen, setDoorWindowOpen] = useState(false);
  const [objectLibraryOpen, setObjectLibraryOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const isDoorWindowActive = (["door_line", "window_line", "sliding_door_line"] as Tool[]).includes(activeTool);
  const isExtraToolActive = EXTRA_TOOLS.some(t => t.tool === activeTool);

  const handleSelectObject = useCallback(
    (definition: UnifiedObjectDefinition) => {
      setPendingObjectId(definition.id);
      setObjectLibraryOpen(false);
      toast.success(
        t("objectLibrary.objectSelected", `${definition.name} selected — click canvas to place`)
      );
    },
    [setPendingObjectId, t]
  );

  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
      {/* Primary tools */}
      <ToolButton
        icon={MousePointer2}
        label={t("floormap.tools.select", "Select")}
        isActive={activeTool === "select"}
        onClick={() => setActiveTool("select")}
      />

      {/* Room — hero tool */}
      <ToolButton
        icon={Home}
        label={t("floormap.tools.room", "Room")}
        isActive={activeTool === "room"}
        onClick={() => setActiveTool("room")}
        highlight
      />

      {/* Door / Window popover */}
      <Popover open={doorWindowOpen} onOpenChange={setDoorWindowOpen}>
        <PopoverTrigger asChild>
          <div>
            <ToolButton
              icon={DoorOpen}
              label={t("floormap.tools.doorWindow", "Door / Window")}
              isActive={isDoorWindowActive}
              onClick={() => setDoorWindowOpen((o) => !o)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-40 p-1">
          {DOOR_WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.tool}
              type="button"
              onClick={() => {
                setActiveTool(opt.tool);
                setDoorWindowOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                activeTool === opt.tool
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-accent"
              )}
            >
              {t(opt.labelKey, opt.fallback)}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Furniture — object library */}
      <Popover open={objectLibraryOpen} onOpenChange={setObjectLibraryOpen}>
        <PopoverTrigger asChild>
          <div>
            <ToolButton
              icon={Armchair}
              label={t("objectLibrary.title", "Furniture")}
              isActive={activeTool === "object"}
              onClick={() => setObjectLibraryOpen((o) => !o)}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-80 p-0">
          <ObjectLibraryPanel onSelect={handleSelectObject} />
        </PopoverContent>
      </Popover>

      {/* Sticky note */}
      <ToolButton
        icon={StickyNote}
        label={t("floormap.tools.stickyNote", "Post-it lapp")}
        isActive={activeTool === "sticky_note"}
        onClick={() => setActiveTool("sticky_note")}
      />

      {/* Measure */}
      <ToolButton
        icon={Ruler}
        label={t("floormap.tools.measure", "Measure")}
        isActive={activeTool === "measure"}
        onClick={() => setActiveTool("measure")}
      />

      {/* Divider */}
      <div className="w-6 h-px bg-border my-1" />

      {/* More tools expand */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              showMore || isExtraToolActive
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent text-muted-foreground"
            )}
          >
            {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {showMore
            ? t("floormap.tools.lessTools", "Fewer tools")
            : t("floormap.tools.moreTools", "More tools")}
        </TooltipContent>
      </Tooltip>

      {showMore && (
        <>
          {/* Drawing & structure tools */}
          {EXTRA_TOOLS.map((item) => (
            <ToolButton
              key={item.tool}
              icon={item.icon}
              label={t(item.labelKey, item.fallback)}
              isActive={activeTool === item.tool}
              onClick={() => setActiveTool(item.tool)}
            />
          ))}

          {/* Divider before actions */}
          <div className="w-6 h-px bg-border my-1" />

          {/* Undo / Redo / Delete / Save */}
          <ToolButton
            icon={Undo2}
            label={t("common.undo", "Undo")}
            isActive={false}
            onClick={onUndo}
            disabled={!canUndo}
          />
          <ToolButton
            icon={Redo2}
            label={t("common.redo", "Redo")}
            isActive={false}
            onClick={onRedo}
            disabled={!canRedo}
          />
          <ToolButton
            icon={Trash2}
            label={t("common.delete", "Delete")}
            isActive={false}
            onClick={onDelete}
          />
          <ToolButton
            icon={Save}
            label={t("common.save", "Save")}
            isActive={false}
            onClick={onSave}
          />

          {/* Divider before settings */}
          <div className="w-6 h-px bg-border my-1" />

          {/* Canvas settings (grid, snap, dimensions, etc.) */}
          <CanvasSettingsPopover />
        </>
      )}
    </div>
  );
};
