import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Wrench, Plus, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";

type RowKind = "material" | "subcontractor";
type LinkMode = "existing" | "create" | "none";

interface TaskOption {
  id: string;
  title: string;
}

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskOption[];
  initialKind?: RowKind;
  onAdd: (data: {
    name: string;
    kind: RowKind;
    linkMode: LinkMode;
    existingTaskId?: string;
    newTaskTitle?: string;
  }) => Promise<void>;
}

export function AddMaterialDialog({
  open,
  onOpenChange,
  tasks,
  initialKind = "material",
  onAdd,
}: AddMaterialDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RowKind>(initialKind);
  // "none" = standalone, "create" = new task, or a task ID for existing
  const [selectedLink, setSelectedLink] = useState<string>("none");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind, open]);

  const reset = () => {
    setName("");
    setKind(initialKind);
    setSelectedLink(tasks.length > 0 ? tasks[0].id : "none");
    setNewTaskTitle("");
  };

  // Derive linkMode from selectedLink
  const linkMode: LinkMode =
    selectedLink === "none" ? "none" :
    selectedLink === "create" ? "create" : "existing";

  const canSubmit =
    name.trim() &&
    (linkMode === "none" ||
      linkMode === "existing" ||
      (linkMode === "create" && newTaskTitle.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        kind,
        linkMode,
        existingTaskId: linkMode === "existing" ? selectedLink : undefined,
        newTaskTitle: linkMode === "create" ? newTaskTitle.trim() : undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === "material"
              ? t("planningTasks.addMaterial")
              : t("planningTasks.addSubcontractor")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Kind toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={kind === "material" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setKind("material")}
            >
              <Package className="h-3.5 w-3.5" />
              {t("planningTasks.typeMaterial")}
            </Button>
            <Button
              type="button"
              variant={kind === "subcontractor" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setKind("subcontractor")}
            >
              <Wrench className="h-3.5 w-3.5" />
              {t("planningTasks.typeSubcontractor")}
            </Button>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>
              {kind === "material"
                ? t("planningTasks.materialName")
                : t("planningTasks.typeSubcontractor")}
            </Label>
            <Input
              autoFocus
              placeholder={
                kind === "material"
                  ? t("planningTasks.materialPlaceholder")
                  : t("planningTasks.subcontractorPlaceholder")
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Unified link list */}
          <div className="space-y-1.5">
            <Label>{t("planningTasks.linkToTask")}</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {/* Existing tasks */}
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2",
                    selectedLink === task.id && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => setSelectedLink(task.id)}
                >
                  {task.title}
                </button>
              ))}

              {tasks.length > 0 && <div className="border-t" />}

              {/* Create new task */}
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2",
                  selectedLink === "create" && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => setSelectedLink("create")}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("planningTasks.createTaskOption")}
              </button>

              {/* No link */}
              <button
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground",
                  selectedLink === "none" && "bg-amber-50 text-amber-700 font-medium"
                )}
                onClick={() => setSelectedLink("none")}
              >
                <Link2Off className="h-3.5 w-3.5" />
                {t("planningTasks.noLinkOption")}
              </button>
            </div>

            {/* Inline new task name input */}
            {selectedLink === "create" && (
              <Input
                className="h-8 text-sm mt-1.5"
                placeholder={t("planningTasks.newTaskPlaceholder")}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? "..." : t("common.add", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
