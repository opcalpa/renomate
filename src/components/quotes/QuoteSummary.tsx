import { useTranslation } from "react-i18next";
import type { QuoteItem } from "./QuoteItemRow";

interface QuoteSummaryProps {
  items: QuoteItem[];
}

export function QuoteSummary({ items }: QuoteSummaryProps) {
  const { t } = useTranslation();

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const vat = subtotal * 0.25;
  const rotEligibleTotal = items
    .filter((i) => i.isRotEligible)
    .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const rotDeduction = rotEligibleTotal * 0.3;
  const totalToPay = subtotal + vat - rotDeduction;

  const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="sticky bottom-0 rounded-lg border bg-card p-4 space-y-1 shadow-lg">
      <div className="flex justify-between text-sm">
        <span>{t("quotes.subtotal")}</span>
        <span>{fmt(subtotal)} kr</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>{t("quotes.vat")}</span>
        <span>{fmt(vat)} kr</span>
      </div>
      {rotDeduction > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>{t("quotes.rotDeduction")}</span>
          <span>-{fmt(rotDeduction)} kr</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-base pt-2 border-t">
        <span>{t("quotes.totalToPay")}</span>
        <span>{fmt(totalToPay)} kr</span>
      </div>
    </div>
  );
}
