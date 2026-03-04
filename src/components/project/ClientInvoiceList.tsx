import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDisplayStatus } from "@/services/invoiceService";

interface Invoice {
  id: string;
  title: string;
  invoice_number: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  sent_at: string | null;
  created_at: string;
}

interface ClientInvoiceListProps {
  projectId: string;
  currency?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const invoiceStatusKey = (status: string) => {
  const map: Record<string, string> = {
    partially_paid: "partiallyPaid",
  };
  return map[status] || status;
};

export function ClientInvoiceList({ projectId, currency }: ClientInvoiceListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, title, invoice_number, status, total_amount, paid_amount, due_date, sent_at, created_at")
      .eq("project_id", projectId)
      .in("status", ["sent", "paid", "partially_paid"])
      .order("created_at", { ascending: false });

    setInvoices(data || []);
  };

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("customerView.noInvoices", "No invoices available yet.")}
      </p>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const paidPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("customerView.invoiceTotal", "Total invoiced")}
            </p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{paidPercent}%</p>
        </div>
        <Progress value={paidPercent} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("customerView.paidAmount", "Paid")}: {formatCurrency(totalPaid, currency)}</span>
          <span>{t("customerView.remainingAmount", "Remaining")}: {formatCurrency(totalAmount - totalPaid, currency)}</span>
        </div>
      </div>

      {/* Invoice list */}
      <div className="space-y-2">
        {invoices.map((inv) => {
          const displayStatus = getDisplayStatus(inv);
          const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
          const payProgress = inv.total_amount > 0
            ? Math.round(((inv.paid_amount || 0) / inv.total_amount) * 100)
            : 0;

          return (
            <button
              key={inv.id}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors space-y-2"
              onClick={() => navigate(`/invoices/${inv.id}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {inv.invoice_number || inv.title || t("invoices.untitled", "Untitled")}
                  </p>
                  {inv.due_date && (
                    <p className="text-xs text-muted-foreground">
                      {t("customerView.dueDate", "Due")}: {new Date(inv.due_date).toLocaleDateString("sv-SE")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(inv.total_amount || 0, currency)}</p>
                  <Badge className={`text-[10px] ${STATUS_COLORS[displayStatus] || STATUS_COLORS.sent}`}>
                    {t(`invoices.${invoiceStatusKey(displayStatus)}`)}
                  </Badge>
                </div>
              </div>

              {displayStatus === "partially_paid" && (
                <div className="space-y-1">
                  <Progress value={payProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(remaining, currency)} {t("budget.remaining").toLowerCase()}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
