import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { FileText, Receipt, Banknote, AlertTriangle, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BuilderSummaryCardsProps {
  projectId: string;
  currency?: string | null;
  onCreateInvoice?: () => void;
}

interface InvoiceSummary {
  contractTotal: number;
  invoicedTotal: number;
  receivedTotal: number;
  unbilledTotal: number;
  overdueTotal: number;
  ataTotal: number;
}

export function BuilderSummaryCards({ projectId, currency, onCreateInvoice }: BuilderSummaryCardsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<InvoiceSummary>({
    contractTotal: 0,
    invoicedTotal: 0,
    receivedTotal: 0,
    unbilledTotal: 0,
    overdueTotal: 0,
    ataTotal: 0,
  });

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  const fetchSummary = async () => {
    const [quotesRes, invoicesRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("id, total_amount, status")
        .eq("project_id", projectId)
        .eq("status", "accepted"),
      supabase
        .from("invoices")
        .select("total_amount, paid_amount, status, due_date, is_ata, sent_at")
        .eq("project_id", projectId)
        .neq("status", "cancelled"),
    ]);

    let contractTotal = (quotesRes.data || []).reduce(
      (sum, q) => sum + (q.total_amount || 0),
      0
    );

    // Fallback: if accepted quotes have total_amount = 0, sum from quote_items
    if (contractTotal === 0 && (quotesRes.data || []).length > 0) {
      const quoteIds = (quotesRes.data || []).map((q) => q.id);
      const { data: itemsData } = await supabase
        .from("quote_items")
        .select("total_price")
        .in("quote_id", quoteIds);
      if (itemsData) {
        contractTotal = itemsData.reduce((sum, i) => sum + (i.total_price || 0), 0);
      }
    }

    const invoices = invoicesRes.data || [];
    // Only count sent/paid/partially_paid invoices as "invoiced" (exclude drafts)
    const sentInvoices = invoices.filter(
      (inv) => inv.status !== "draft"
    );
    const invoicedTotal = sentInvoices.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0
    );
    const receivedTotal = invoices.reduce(
      (sum, inv) => sum + (inv.paid_amount || 0),
      0
    );

    const now = new Date().toISOString().split("T")[0];
    const overdueTotal = invoices
      .filter(
        (inv) =>
          (inv.status === "sent" || inv.status === "partially_paid") &&
          inv.due_date &&
          inv.due_date < now
      )
      .reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);

    const ataTotal = invoices
      .filter((inv) => inv.is_ata)
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    setSummary({
      contractTotal,
      invoicedTotal,
      receivedTotal,
      unbilledTotal: contractTotal - invoicedTotal,
      overdueTotal,
      ataTotal,
    });
  };

  const cards = [
    {
      label: t("budget.builder.contract", "Contract"),
      value: summary.contractTotal,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: t("budget.builder.invoiced", "Invoiced"),
      value: summary.invoicedTotal,
      icon: Receipt,
      color: "text-amber-600",
    },
    {
      label: t("budget.builder.received", "Received"),
      value: summary.receivedTotal,
      icon: Banknote,
      color: "text-green-600",
    },
    {
      label: t("budget.builder.unbilled", "Unbilled"),
      value: summary.unbilledTotal,
      icon: Clock,
      color: "text-muted-foreground",
    },
    {
      label: t("budget.builder.overdue", "Overdue"),
      value: summary.overdueTotal,
      icon: AlertTriangle,
      color: summary.overdueTotal > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      label: t("budget.builder.ata", "ATA"),
      value: summary.ataTotal,
      icon: Plus,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 md:gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-muted/50 rounded-lg p-3 text-center space-y-1"
          >
            <div className="flex items-center justify-center gap-1.5">
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
            <p className={`text-lg font-bold ${card.value < 0 ? "text-destructive" : ""}`}>
              {formatCurrency(card.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateInvoice ? onCreateInvoice() : navigate(`/invoices/new?projectId=${projectId}`)}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("budget.builder.createInvoice", "Create Invoice")}
        </Button>
      </div>
    </div>
  );
}
