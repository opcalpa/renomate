import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Package, Trash2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  suggestMaterialsMultiRoom,
  parseEstimationSettings,
  type RecipeRoom,
} from "@/lib/materialRecipes";

interface MaterialItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  price_total: number | null;
  formula: string | null;
}

const VAT_RATE = 0.25;

interface MaterialFormulaPopoverProps {
  taskId: string;
  taskTitle: string;
  taskCostCenter: string | null;
  projectId: string;
  materials: MaterialItem[];
  rooms: RecipeRoom[];
  onChanged: () => void;
  /** When true, all prices are shown inc moms (×1.25) */
  isHomeowner?: boolean;
}

export function MaterialFormulaPopover({
  taskId,
  taskTitle,
  taskCostCenter,
  projectId,
  materials,
  rooms,
  onChanged,
  isHomeowner = false,
}: MaterialFormulaPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"quantity" | "price_per_unit" | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  const commitEdit = useCallback(async () => {
    if (!editingId || !editField) return;
    const rawVal = parseFloat(editBuffer);
    if (isNaN(rawVal) || rawVal < 0) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    // Homeowner enters inc moms → convert price back to ex moms for DB
    const val = editField === "price_per_unit" && isHomeowner
      ? Math.round(rawVal / (1 + VAT_RATE))
      : rawVal;

    const updates: Record<string, unknown> = { [editField]: val };
    // Recalculate price_total (always ex moms in DB)
    const mat = materials.find((m) => m.id === editingId);
    if (mat) {
      const qty = editField === "quantity" ? val : (mat.quantity ?? 0);
      const price = editField === "price_per_unit" ? val : (mat.price_per_unit ?? 0);
      updates.price_total = Math.round(qty * price);
      // Update formula description to show it was manually adjusted
      if (editField === "quantity") {
        updates.description = `${qty} ${mat.unit ?? "st"} (manuellt justerat)`;
      }
    }

    const { error } = await supabase
      .from("materials")
      .update(updates)
      .eq("id", editingId);

    if (error) {
      toast.error(t("common.error"));
    } else {
      onChanged();
    }
    setEditingId(null);
    setEditField(null);
  }, [editingId, editField, editBuffer, materials, onChanged, t]);

  const handleDelete = useCallback(async (materialId: string) => {
    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId);

    if (error) {
      toast.error(t("common.error"));
    } else {
      onChanged();
    }
  }, [onChanged, t]);

  const handleRecalculate = useCallback(async () => {
    if (rooms.length === 0) return;
    setRecalculating(true);

    // Fetch user's estimation settings
    const { data: { user } } = await supabase.auth.getUser();
    let settings = parseEstimationSettings(null);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("estimation_settings")
        .eq("user_id", user.id)
        .single();
      if (profile?.estimation_settings) {
        settings = parseEstimationSettings(profile.estimation_settings as Record<string, unknown>);
      }
    }

    const suggestions = suggestMaterialsMultiRoom(
      { cost_center: taskCostCenter, title: taskTitle },
      rooms,
      settings
    );

    if (suggestions.length === 0) {
      toast.error(t("homeownerPlanning.noRecipeForTask", "No recipe available for this task type"));
      setRecalculating(false);
      return;
    }

    // Delete existing auto-generated materials for this task
    for (const mat of materials) {
      await supabase.from("materials").delete().eq("id", mat.id);
    }

    // Get profile id for created_by
    let profileId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      profileId = profile?.id ?? null;
    }

    // Insert recalculated materials
    for (const s of suggestions) {
      await supabase.from("materials").insert({
        project_id: projectId,
        task_id: taskId,
        name: s.nameFallback,
        quantity: s.quantity,
        unit: s.unit,
        price_per_unit: s.unitPrice,
        price_total: s.totalCost,
        status: "planned",
        created_by_user_id: profileId,
        description: s.formula,
      });
    }

    toast.success(t("homeownerPlanning.materialsRecalculated", "Material estimates updated"));
    setRecalculating(false);
    onChanged();
  }, [rooms, taskCostCenter, taskTitle, taskId, projectId, materials, onChanged, t]);

  const startEdit = (id: string, field: "quantity" | "price_per_unit", currentValue: number) => {
    setEditingId(id);
    setEditField(field);
    setEditBuffer(String(currentValue));
  };

  if (materials.length === 0) return null;

  const vatMultiplier = isHomeowner ? 1 + VAT_RATE : 1;
  const vatLabel = isHomeowner ? t("budget.incVat", "ink. moms") : t("budget.exVat", "ex moms");
  const totalCost = materials.reduce((sum, m) => sum + (m.price_total ?? 0), 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className="inline-flex items-center gap-0.5 text-amber-600 shrink-0 cursor-pointer hover:text-amber-700 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="h-3 w-3" />
          <span className="text-[10px]">{materials.length}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b bg-muted/30">
          <p className="text-xs font-medium">
            {t("homeownerPlanning.materialEstimates", "Material estimates")}
            <span className="text-[10px] font-normal text-muted-foreground ml-1">({vatLabel})</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {t("homeownerPlanning.materialEstimatesHint", "Auto-calculated from room dimensions. Click values to adjust.")}
          </p>
        </div>

        <div className="px-3 py-2 space-y-3">
          {materials.map((mat) => (
            <div key={mat.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{mat.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(mat.id)}
                  className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Quantity + unit — editable */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t("homeownerPlanning.quantity", "Qty")}:</span>
                {editingId === mat.id && editField === "quantity" ? (
                  <input
                    autoFocus
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-16 h-5 text-xs text-right font-semibold bg-white border rounded px-1 tabular-nums"
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                    }}
                    onBlur={commitEdit}
                  />
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-green-700 underline decoration-dotted underline-offset-2 hover:text-green-800 cursor-pointer"
                    onClick={() => startEdit(mat.id, "quantity", mat.quantity ?? 0)}
                    title={t("materialRecipes.clickToEdit", "Click to adjust")}
                  >
                    {mat.quantity ?? 0}
                  </button>
                )}
                <span className="text-muted-foreground">{mat.unit ?? "st"}</span>

                <span className="text-muted-foreground ml-1">×</span>

                {/* Unit price — editable */}
                {editingId === mat.id && editField === "price_per_unit" ? (
                  <input
                    autoFocus
                    type="number"
                    step="1"
                    min="0"
                    className="w-16 h-5 text-xs text-right font-semibold bg-white border rounded px-1 tabular-nums"
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                    }}
                    onBlur={commitEdit}
                  />
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-green-700 underline decoration-dotted underline-offset-2 hover:text-green-800 cursor-pointer"
                    onClick={() => startEdit(mat.id, "price_per_unit", Math.round((mat.price_per_unit ?? 0) * vatMultiplier))}
                    title={t("materialRecipes.clickToEdit", "Click to adjust")}
                  >
                    {Math.round((mat.price_per_unit ?? 0) * vatMultiplier).toLocaleString("sv-SE")}
                  </button>
                )}
                <span className="text-muted-foreground">kr/{mat.unit ?? "st"}</span>

                <span className="ml-auto tabular-nums font-medium">
                  = {Math.round((mat.price_total ?? 0) * vatMultiplier).toLocaleString("sv-SE")} kr
                </span>
              </div>

              {/* Formula */}
              {mat.formula && (
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                  {mat.formula}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer with total + recalculate */}
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-medium tabular-nums">
            {t("common.total")}: {Math.round(totalCost * vatMultiplier).toLocaleString("sv-SE")} kr
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-muted-foreground"
            onClick={handleRecalculate}
            disabled={recalculating || rooms.length === 0}
          >
            <RotateCcw className="h-3 w-3" />
            {t("homeownerPlanning.recalculate", "Recalculate")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
