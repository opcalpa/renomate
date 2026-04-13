import { useState, useEffect, useRef } from "react";
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
import { ShoppingCart, Handshake, Info, Paperclip, FileText, X } from "lucide-react";
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
    quantity?: number;
    priceTotal?: number;
    markupPercent?: number;
    file?: File;
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
  const [quantity, setQuantity] = useState("1");
  const [priceTotal, setPriceTotal] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind, open]);

  const reset = () => {
    setName("");
    setKind(initialKind);
    setSelectedLink(tasks.length > 0 ? tasks[0].id : "__none__");
    setNewTaskTitle("");
    setQuantity("1");
    setPriceTotal("");
    setMarkupPercent("");
    setAttachedFile(null);
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
      const qty = quantity ? parseFloat(quantity) : undefined;
      const price = priceTotal ? parseFloat(priceTotal) : undefined;
      await onAdd({
        name: name.trim(),
        kind,
        linkMode,
        existingTaskId: linkMode === "existing" ? selectedLink : undefined,
        newTaskTitle: linkMode === "create" ? newTaskTitle.trim() : undefined,
        quantity: qty && !isNaN(qty) ? qty : undefined,
        priceTotal: price && !isNaN(price) ? price : undefined,
        markupPercent: markup && !isNaN(markup) ? markup : undefined,
        file: attachedFile || undefined,
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
                <TooltipContent side="bottom" className="max-w-[300px]">
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
              <ShoppingCart className="h-3.5 w-3.5" />
              {t("planningTasks.typeMaterial")}
            </Button>
            <Button
              type="button"
              variant={kind === "subcontractor" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setKind("subcontractor")}
            >
              <Handshake className="h-3.5 w-3.5" />
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

          {/* Quantity + Price */}
          <div className="flex gap-3">
            <div className="space-y-1.5 w-24">
              <Label>{t("planningTasks.quantity", "Quantity")}</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>{t("planningTasks.unitPrice", "Unit price")}</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                placeholder="0"
                value={priceTotal}
                onChange={(e) => setPriceTotal(e.target.value)}
              />
            </div>
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

          {/* Attach file */}
          <div className="space-y-1.5">
            <input
              ref={attachRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttachedFile(f);
                if (attachRef.current) attachRef.current.value = "";
              }}
            />
            {attachedFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{attachedFile.name}</span>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                  onClick={() => setAttachedFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => attachRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {t("planningTasks.attachFile", "Attach file")}
              </Button>
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
