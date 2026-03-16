/**
 * TaskCostTable — Inline spreadsheet-style cost breakdown for a task.
 * Replaces the old collapsible sections with a clean table view.
 * Shows: Labor, Material, Subcontractor rows with live calculations.
 */

import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";

interface TaskCostTableProps {
  estimatedHours: number | null;
  hourlyRate: number | null;
  subcontractorCost: number | null;
  markupPercent: number | null;
  materialEstimate: number | null;
  materialMarkupPercent: number | null;
  materialItems?: { amount: number; markup_percent?: number | null }[];
  currency?: string | null;
  onChange: (updates: Record<string, number | null>) => void;
}

export function TaskCostTable({
  estimatedHours,
  hourlyRate,
  subcontractorCost,
  markupPercent,
  materialEstimate,
  materialMarkupPercent,
  materialItems,
  currency,
  onChange,
}: TaskCostTableProps) {
  const { t } = useTranslation();

  const laborTotal = (estimatedHours || 0) * (hourlyRate || 0);
  const ueBase = subcontractorCost || 0;
  const ueMarkup = markupPercent || 0;
  const ueTotal = ueBase * (1 + ueMarkup / 100);

  const matBase = materialItems && materialItems.length > 0
    ? materialItems.reduce((sum, i) => sum + (i.amount || 0), 0)
    : (materialEstimate || 0);
  const matMarkup = materialMarkupPercent || 0;
  const matTotal = matBase * (1 + matMarkup / 100);

  const customerPrice = laborTotal + ueTotal + matTotal;

  const inputClass = "h-7 text-xs text-right border-0 bg-transparent focus:bg-background focus:border px-1 w-full tabular-nums";

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs text-muted-foreground">
            <th className="text-left font-medium px-3 py-2 w-[35%]">{t("taskCost.costType", "Cost type")}</th>
            <th className="text-right font-medium px-2 py-2 w-[18%]">{t("taskCost.quantity", "Qty")}</th>
            <th className="text-right font-medium px-2 py-2 w-[18%]">{t("taskCost.unitPrice", "Unit price")}</th>
            <th className="text-right font-medium px-2 py-2 w-[12%]">{t("taskCost.markupShort", "Markup")}</th>
            <th className="text-right font-medium px-3 py-2 w-[17%]">{t("taskCost.total", "Total")}</th>
          </tr>
        </thead>
        <tbody>
          {/* Labor row */}
          <tr className="border-t hover:bg-muted/30">
            <td className="px-3 py-1.5 text-xs font-medium">{t("taskCost.ownLabor", "Own labor")}</td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="h"
                className={inputClass}
                value={estimatedHours?.toString() || ""}
                onChange={(e) => onChange({ estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="kr/h"
                className={inputClass}
                value={hourlyRate?.toString() || ""}
                onChange={(e) => onChange({ hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">—</td>
            <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
              {laborTotal > 0 ? formatCurrency(laborTotal, currency) : "—"}
            </td>
          </tr>

          {/* Material row */}
          <tr className="border-t hover:bg-muted/30">
            <td className="px-3 py-1.5 text-xs font-medium">{t("taskCost.material", "Material")}</td>
            <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">—</td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="kr"
                className={inputClass}
                value={materialEstimate?.toString() || ""}
                onChange={(e) => onChange({ material_estimate: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="%"
                className={inputClass}
                value={materialMarkupPercent?.toString() || ""}
                onChange={(e) => onChange({ material_markup_percent: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
              {matTotal > 0 ? formatCurrency(matTotal, currency) : "—"}
            </td>
          </tr>

          {/* Subcontractor row */}
          <tr className="border-t hover:bg-muted/30">
            <td className="px-3 py-1.5 text-xs font-medium">{t("taskCost.subcontractor", "Subcontractor")}</td>
            <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">—</td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="kr"
                className={inputClass}
                value={subcontractorCost?.toString() || ""}
                onChange={(e) => onChange({ subcontractor_cost: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-1 py-1">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="%"
                className={inputClass}
                value={markupPercent?.toString() || ""}
                onChange={(e) => onChange({ markup_percent: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </td>
            <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
              {ueTotal > 0 ? formatCurrency(ueTotal, currency) : "—"}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-muted/30">
            <td colSpan={4} className="px-3 py-2 text-xs font-semibold">{t("taskCost.customerPrice", "Customer price")}</td>
            <td className="px-3 py-2 text-xs text-right font-bold tabular-nums">
              {customerPrice > 0 ? formatCurrency(customerPrice, currency) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
