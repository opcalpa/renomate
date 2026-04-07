import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getStatusBadgeColor } from "@/lib/statusColors";
import {
  ChevronDown,
  Camera,
  Loader2,
  ImageIcon,
  Paintbrush,
  Ruler,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomInstruction, RoomTask, ChecklistItem } from "./types";

interface RoomInstructionCardProps {
  room: RoomInstruction;
  canToggleChecklist?: boolean;
  canUploadPhotos?: boolean;
  onChecklistToggle?: (taskId: string, checklistId: string, itemId: string, completed: boolean) => void;
  onPhotoUpload?: (taskId: string | null, roomId: string, category: "progress" | "completed", file: File) => void;
}

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: "toDo", in_progress: "inProgress", on_hold: "onHold",
  };
  return map[s] || s;
};

export function RoomInstructionCard({
  room,
  canToggleChecklist = false,
  canUploadPhotos = false,
  onChecklistToggle,
  onPhotoUpload,
}: RoomInstructionCardProps) {
  const { t } = useTranslation();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const progressPct = room.progress.total > 0
    ? Math.round((room.progress.completed / room.progress.total) * 100)
    : 0;

  const handleFileUpload = async (taskId: string | null, category: "progress" | "completed", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onPhotoUpload) return;
    setUploading(true);
    try {
      await onPhotoUpload(taskId, room.id, category, file);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Room header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">{room.name}</h2>
        {room.dimensions && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Ruler className="h-3.5 w-3.5" />
            {room.dimensions.area_sqm && <span>{room.dimensions.area_sqm} m²</span>}
            {room.dimensions.ceiling_height_mm && (
              <span>{t("rooms.ceilingHeight", "Takhöjd")}: {(room.dimensions.ceiling_height_mm / 1000).toFixed(1)}m</span>
            )}
          </div>
        )}
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <Progress value={progressPct} className="flex-1 h-2" />
          <span className="text-xs font-medium tabular-nums">{progressPct}%</span>
        </div>
      </div>

      {/* Color specs */}
      {(room.wallColor || room.ceilingColor || room.trimColor || room.wallSpec?.main_color) && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
            <Paintbrush className="h-3.5 w-3.5" />
            {t("rooms.colorSpec", "Färgval")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(room.wallSpec?.main_color || room.wallColor) && (
              <ColorSwatch
                label={t("rooms.wall", "Vägg")}
                color={room.wallSpec?.main_color || room.wallColor!}
              />
            )}
            {room.wallSpec?.has_accent_wall && room.wallSpec.accent_wall_color && (
              <ColorSwatch
                label={t("rooms.accentWall", "Fondvägg")}
                color={room.wallSpec.accent_wall_color}
              />
            )}
            {(room.ceilingSpec?.color || room.ceilingColor) && (
              <ColorSwatch
                label={t("rooms.ceiling", "Tak")}
                color={room.ceilingSpec?.color || room.ceilingColor!}
              />
            )}
            {room.trimColor && (
              <ColorSwatch
                label={t("rooms.trim", "Snickerier")}
                color={room.trimColor}
              />
            )}
            {room.floorSpec?.skirting_color && (
              <ColorSwatch
                label={t("rooms.skirting", "Golvsockel")}
                color={room.floorSpec.skirting_color}
              />
            )}
          </div>
        </div>
      )}

      {/* Reference / instruction images */}
      {room.referencePhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {t("rooms.referenceImages", "Förebilder")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {room.referencePhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || ""}
                className="h-24 w-32 rounded-lg object-cover flex-shrink-0 border"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* Tasks with checklists */}
      <div className="space-y-2">
        {room.tasks.map((task) => (
          <TaskSection
            key={task.id}
            task={task}
            expanded={expandedTasks.has(task.id)}
            onToggle={() => toggleTask(task.id)}
            canToggleChecklist={canToggleChecklist}
            canUploadPhotos={canUploadPhotos}
            uploading={uploading}
            onChecklistToggle={onChecklistToggle}
            onFileUpload={(category, e) => handleFileUpload(task.id, category, e)}
          />
        ))}
      </div>

      {/* Materials */}
      {room.materials.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
            <Package className="h-3.5 w-3.5" />
            {t("rooms.materials", "Material")}
          </div>
          <div className="space-y-1">
            {room.materials.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.name}</span>
                <span className="text-muted-foreground text-xs">
                  {m.quantity} {m.unit}
                  {m.vendorName && ` · ${m.vendorName}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room-level photo upload (progress + completed) */}
      {canUploadPhotos && (
        <div className="grid grid-cols-2 gap-2">
          <UploadButton
            label={t("rooms.progressPhoto", "Progressfoto")}
            uploading={uploading}
            onChange={(e) => handleFileUpload(null, "progress", e)}
          />
          <UploadButton
            label={t("rooms.completedPhoto", "Slutfört-foto")}
            uploading={uploading}
            onChange={(e) => handleFileUpload(null, "completed", e)}
          />
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function ColorSwatch({ label, color }: { label: string; color: string }) {
  const isHex = color.startsWith("#");
  return (
    <div className="flex items-center gap-2">
      {isHex ? (
        <div className="h-5 w-5 rounded-full border shadow-sm flex-shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <div className="h-5 w-5 rounded-full border shadow-sm flex-shrink-0 bg-muted" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{color}</p>
      </div>
    </div>
  );
}

function TaskSection({
  task,
  expanded,
  onToggle,
  canToggleChecklist,
  canUploadPhotos,
  uploading,
  onChecklistToggle,
  onFileUpload,
}: {
  task: RoomTask;
  expanded: boolean;
  onToggle: () => void;
  canToggleChecklist: boolean;
  canUploadPhotos: boolean;
  uploading: boolean;
  onChecklistToggle?: (taskId: string, checklistId: string, itemId: string, completed: boolean) => void;
  onFileUpload: (category: "progress" | "completed", e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();
  const totalItems = task.checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const completedItems = task.checklists.reduce((sum, cl) => sum + cl.items.filter((i) => i.completed).length, 0);

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", !expanded && "-rotate-90")} />
        <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
        <Badge className={cn("text-[10px] px-1.5", getStatusBadgeColor(task.status))}>
          {t(`statuses.${statusKey(task.status)}`, task.status)}
        </Badge>
        {totalItems > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{completedItems}/{totalItems}</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
          {/* Description */}
          {task.description && (
            <p className="text-xs text-muted-foreground pt-2 whitespace-pre-line">{task.description}</p>
          )}

          {/* Checklists */}
          {task.checklists.map((cl) => (
            <div key={cl.id} className="space-y-1">
              {cl.title && <p className="text-xs font-medium">{cl.title}</p>}
              {cl.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 py-1 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={item.completed}
                    disabled={!canToggleChecklist}
                    onCheckedChange={(checked) => {
                      onChecklistToggle?.(task.id, cl.id, item.id, !!checked);
                    }}
                  />
                  <span className={cn(item.completed && "line-through text-muted-foreground")}>
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          ))}

          {/* Task photos */}
          {task.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {task.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption || ""}
                  className="h-20 w-20 rounded object-cover flex-shrink-0 border"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadButton({
  label,
  uploading,
  onChange,
}: {
  label: string;
  uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      {label}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
        disabled={uploading}
      />
    </label>
  );
}
