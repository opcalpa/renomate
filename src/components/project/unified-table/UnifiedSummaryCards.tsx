import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/currency";
import type { RowType, UnifiedRow } from "./types";

interface UnifiedSummaryCardsProps {
  rows: UnifiedRow[];
  activeRowTypes: Set<RowType>;
  projectBudget: number;
  extraTotal: number;
  currency?: string | null;
}

export function UnifiedSummaryCards({
  rows,
  activeRowTypes,
  projectBudget,
  extraTotal,
  currency,
}: UnifiedSummaryCardsProps) {
  const { t } = useTranslation();

  const totals = useMemo(() => {
    const filtered = rows.filter((r) => activeRowTypes.has(r.rowType));
    return filtered.reduce(
      (acc, r) => ({
        budget: acc.budget + r.budget,
        ordered: acc.ordered + r.ordered,
        paid: acc.paid + r.paid,
      }),
      { budget: 0, ordered: 0, paid: 0 }
    );
  }, [rows, activeRowTypes]);

  const remaining = projectBudget - totals.ordered - totals.paid;

  const cards = [
    { label: t("common.budget"), value: projectBudget, negative: false },
    { label: t("budget.ordered"), value: totals.ordered, negative: false },
    { label: t("budget.paid"), value: totals.paid, negative: false },
    { label: t("unifiedTable.remaining"), value: remaining, negative: remaining < 0 },
    { label: t("unifiedTable.extra"), value: extraTotal, negative: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          <p className={`text-xl font-bold ${card.negative ? "text-destructive" : ""}`}>
            {formatCurrency(card.value, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}
