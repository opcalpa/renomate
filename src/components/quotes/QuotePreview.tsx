import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { QuoteItem } from "./QuoteItemRow";

interface QuotePreviewProps {
  open: boolean;
  onClose: () => void;
  title: string;
  projectName: string;
  items: QuoteItem[];
  companyName?: string;
  freeText?: string;
  onSend?: () => void;
}

export function QuotePreview({ open, onClose, title, projectName, items, companyName, freeText, onSend }: QuotePreviewProps) {
  const { t } = useTranslation();

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const vat = subtotal * 0.25;
  const rotEligibleTotal = items.filter((i) => i.isRotEligible).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const rotDeduction = rotEligibleTotal * 0.3;
  const totalToPay = subtotal + vat - rotDeduction;

  const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const today = new Date().toLocaleDateString("sv-SE");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("quotes.preview")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {companyName && <p className="font-semibold text-base">{companyName}</p>}
          <p className="text-muted-foreground">{today}</p>

          <h3 className="font-semibold text-lg">{title}</h3>
          {projectName && <p className="text-muted-foreground">{projectName}</p>}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2">{t("quotes.description")}</th>
                <th className="py-2 text-right">{t("quotes.quantity")}</th>
                <th className="py-2 text-right">{t("common.unit")}</th>
                <th className="py-2 text-right">{t("quotes.unitPrice")}</th>
                <th className="py-2 text-right">{t("quotes.totalAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.description || "—"}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{item.unit}</td>
                  <td className="py-2 text-right">{fmt(item.unitPrice)}</td>
                  <td className="py-2 text-right">{fmt(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {freeText && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground pt-2">{freeText}</p>
          )}

          <div className="space-y-1 pt-2">
            <div className="flex justify-between">
              <span>{t("quotes.subtotal")}</span>
              <span>{fmt(subtotal)} kr</span>
            </div>
            <div className="flex justify-between">
              <span>{t("quotes.vat")}</span>
              <span>{fmt(vat)} kr</span>
            </div>
            {rotDeduction > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("quotes.rotDeduction")}</span>
                <span>-{fmt(rotDeduction)} kr</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>{t("quotes.totalToPay")}</span>
              <span>{fmt(totalToPay)} kr</span>
            </div>
          </div>

          {onSend && (
            <Button className="w-full min-h-[48px]" onClick={onSend}>
              {t("quotes.sendToClient")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
