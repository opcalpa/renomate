/**
 * TaskCostTable — Inline spreadsheet-style cost breakdown for a task.
 * Shows: Labor row, individual Material rows (same data as planning table sub-rows),
 * Subcontractor row, and customer price footer.
 */

import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";

interface MaterialItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  amount: number;
  markup_percent?: number | null;
}

interface TaskCostTableProps {
  estimatedHours: number | null;
  hourlyRate: number | null;
  subcontractorCost: number | null;
  markupPercent: number | null;
  materialEstimate: number | null;
  materialMarkupPercent: number | null;
  materialItems?: MaterialItem[];
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

  const hasItems = materialItems && materialItems.length > 0;
  const matBase = hasItems
    ? materialItems!.reduce((sum, i) => sum + (i.amount || 0), 0)
    : (materialEstimate || 0);
  const matMarkup = materialMarkupPercent || 0;
  const matTotal = matBase * (1 + matMarkup / 100);

  const customerPrice = laborTotal + ueTotal + matTotal;

  const inputClass = "h-7 text-xs text-right border border-border/30 bg-white dark:bg-background rounded-md focus:border-primary/50 focus:ring-1 focus:ring-primary/20 px-1.5 w-full tabular-nums";

  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 text-xs text-muted-foreground">
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
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="h"
                  className={`${inputClass} pr-4`}
                  value={estimatedHours?.toString() || ""}
                  onChange={(e) => onChange({ estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
                />
                {estimatedHours != null && estimatedHours > 0 && (
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">h</span>
                )}
              </div>
            </td>
            <td className="px-1 py-1">
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="kr/h"
                  className={`${inputClass} pr-6`}
                  value={hourlyRate?.toString() || ""}
                  onChange={(e) => onChange({ hourly_rate: e.target.value ? parseFloat(e.target.value) : null })}
                />
                {hourlyRate != null && hourlyRate > 0 && (
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">kr/h</span>
                )}
              </div>
            </td>
            <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">—</td>
            <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
              {laborTotal > 0 ? formatCurrency(laborTotal, currency) : "—"}
            </td>
          </tr>

          {/* Material rows — individual items when available, aggregate fallback */}
          {hasItems ? (
            materialItems!.map((item) => {
              const itemTotal = item.amount || 0;
              const qtyLabel = item.quantity != null
                ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
                : "—";
              return (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-xs">
                    <span className="text-muted-foreground mr-1">└</span>
                    {item.name || t("taskCost.material", "Material")}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-right text-muted-foreground tabular-nums">{qtyLabel}</td>
                  <td className="px-2 py-1.5 text-xs text-right text-muted-foreground tabular-nums">
                    {item.unit_price != null ? formatCurrency(item.unit_price, currency) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">
                    {item.markup_percent != null ? `${item.markup_percent}%` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-right tabular-nums font-medium">
                    {itemTotal > 0 ? formatCurrency(itemTotal, currency) : "—"}
                  </td>
                </tr>
              );
            })
          ) : (
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
          )}

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
          <tr className="border-t-2 border-primary/20 bg-primary/5">
            <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold">{t("taskCost.customerPrice", "Customer price")}</td>
            <td className="px-3 py-2.5 text-sm text-right font-bold tabular-nums text-primary">
              {customerPrice > 0 ? formatCurrency(customerPrice, currency) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
