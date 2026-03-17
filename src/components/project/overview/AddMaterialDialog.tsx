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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Wrench } from "lucide-react";

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
  const [linkMode, setLinkMode] = useState<LinkMode>(
    tasks.length > 0 ? "existing" : "create"
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync kind when initialKind changes (e.g. opening with different button)
  useEffect(() => {
    setKind(initialKind);
  }, [initialKind, open]);

  const reset = () => {
    setName("");
    setKind(initialKind);
    setLinkMode(tasks.length > 0 ? "existing" : "create");
    setSelectedTaskId("");
    setNewTaskTitle("");
  };

  const canSubmit =
    name.trim() &&
    (linkMode === "none" ||
      (linkMode === "existing" && selectedTaskId) ||
      (linkMode === "create" && newTaskTitle.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        kind,
        linkMode,
        existingTaskId: linkMode === "existing" ? selectedTaskId : undefined,
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

          {/* Link mode */}
          <div className="space-y-2">
            <Label>{t("planningTasks.linkToTask")}</Label>
            <RadioGroup
              value={linkMode}
              onValueChange={(v) => setLinkMode(v as LinkMode)}
              className="space-y-2"
            >
              {tasks.length > 0 && (
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="existing" id="link-existing" className="mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="link-existing" className="cursor-pointer font-normal">
                      {t("planningTasks.linkOption")}
                    </Label>
                    {linkMode === "existing" && (
                      <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={t("planningTasks.selectTask")} />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <RadioGroupItem value="create" id="link-create" className="mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="link-create" className="cursor-pointer font-normal">
                    {t("planningTasks.createTaskOption")}
                  </Label>
                  {linkMode === "create" && (
                    <Input
                      className="h-8 text-sm"
                      placeholder={t("planningTasks.newTaskPlaceholder")}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="link-none" />
                <Label htmlFor="link-none" className="cursor-pointer font-normal">
                  {t("planningTasks.noLinkOption")}
                </Label>
              </div>
            </RadioGroup>
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
