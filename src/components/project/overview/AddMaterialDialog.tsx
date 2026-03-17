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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Wrench, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    markupPercent?: number;
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
  const [selectedLink, setSelectedLink] = useState<string>("__none__");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind, open]);

  const reset = () => {
    setName("");
    setKind(initialKind);
    setSelectedLink(tasks.length > 0 ? tasks[0].id : "__none__");
    setNewTaskTitle("");
    setMarkupPercent("");
  };

  const linkMode: LinkMode =
    selectedLink === "__none__" ? "none" :
    selectedLink === "__create__" ? "create" : "existing";

  const canSubmit =
    name.trim() &&
    (linkMode === "none" ||
      linkMode === "existing" ||
      (linkMode === "create" && newTaskTitle.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const markup = markupPercent ? parseFloat(markupPercent) : undefined;
      await onAdd({
        name: name.trim(),
        kind,
        linkMode,
        existingTaskId: linkMode === "existing" ? selectedLink : undefined,
        newTaskTitle: linkMode === "create" ? newTaskTitle.trim() : undefined,
        markupPercent: markup && !isNaN(markup) ? markup : undefined,
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
          <DialogTitle className="flex items-center gap-2">
            {t("planningTasks.addCost", "Add cost")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px]">
                  <p className="text-xs">{t("planningTasks.addCostHint", "Add materials (tiles, paint, fixtures) or subcontractor costs (electrician, plumber) to your scope.")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

          {/* Link to task — compact dropdown */}
          <div className="space-y-1.5">
            <Label>{t("planningTasks.linkToTask")}</Label>
            <Select value={selectedLink} onValueChange={setSelectedLink}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tasks.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-xs">{t("planningTasks.linkOption")}</SelectLabel>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {tasks.length > 0 && <SelectSeparator />}
                <SelectItem value="__create__">
                  + {t("planningTasks.createTaskOption")}
                </SelectItem>
                <SelectItem value="__none__">
                  {t("planningTasks.noLinkOption")}
                </SelectItem>
              </SelectContent>
            </Select>

            {selectedLink === "__create__" && (
              <Input
                className="h-8 text-sm"
                placeholder={t("planningTasks.newTaskPlaceholder")}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            )}
          </div>

          {/* Markup */}
          <div className="space-y-1.5">
            <Label>{t("planningTasks.markup", "Markup")} (%)</Label>
            <Input
              type="number"
              className="h-9 text-sm w-28"
              placeholder="0"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
            />
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
