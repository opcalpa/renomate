import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Receipt,
  Info,
  Check,
  Send,
  X,
  Clock,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjectInvoicingSummary, type ProjectInvoicingSummary } from "@/services/invoiceMethodService";
import { getDisplayStatus } from "@/services/invoiceService";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS, pl, uk } from "date-fns/locale";

interface CustomerBudgetSectionProps {
  projectId: string;
  currency?: string | null;
}

interface DocRow {
  id: string;
  kind: "quote" | "invoice";
  title: string;
  displayStatus: string;
  amount: number;
  updatedAt: string;
  number: string | null;
  isAta: boolean;
  isRevision: boolean;
}

const quoteStatusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  accepted: { icon: Check, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  sent: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  rejected: { icon: X, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  expired: { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  draft: { icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" },
};

const invoiceStatusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  sent: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  paid: { icon: Check, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  partially_paid: { icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  overdue: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  cancelled: { icon: Clock, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
  draft: { icon: Receipt, color: "text-muted-foreground", bgColor: "bg-muted" },
};

export default function CustomerBudgetSection({ projectId, currency }: CustomerBudgetSectionProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectInvoicingSummary | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [invoicingMethod, setInvoicingMethod] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);

  const getLocale = () => {
    const lang = i18n.language;
    if (lang === "sv") return sv;
    if (lang === "pl") return pl;
    if (lang === "uk") return uk;
    return enUS;
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [summaryData, quotesRes, invoicesRes] = await Promise.all([
        fetchProjectInvoicingSummary(projectId),
        supabase
          .from("quotes")
          .select("id, title, status, total_amount, total_after_rot, updated_at, created_at, is_ata, revised_from")
          .eq("project_id", projectId)
          .in("status", ["accepted", "sent"])
          .order("updated_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, title, status, total_amount, total_after_rot, paid_amount, updated_at, created_at, invoice_number, is_ata, due_date, sent_at, invoicing_method")
          .eq("project_id", projectId)
          .neq("status", "cancelled")
          .neq("status", "draft")
          .order("updated_at", { ascending: false }),
      ]);

      if (cancelled) return;

      setSummary(summaryData);

      const allInvoices = invoicesRes.data || [];
      const paid = allInvoices.reduce((sum, inv) => sum + ((inv.paid_amount as number) || 0), 0);
      setTotalPaid(paid);

      const method = allInvoices.find((inv) => inv.invoicing_method)?.invoicing_method || null;
      setInvoicingMethod(method);

      const rows: DocRow[] = [];

      for (const q of quotesRes.data || []) {
        rows.push({
          id: q.id,
          kind: "quote",
          title: q.title || t("quotes.untitled", "Untitled quote"),
          displayStatus: q.status,
          amount: q.total_after_rot || q.total_amount || 0,
          updatedAt: q.updated_at || q.created_at,
          number: null,
          isAta: q.is_ata ?? false,
          isRevision: !!q.revised_from,
        });
      }

      for (const inv of allInvoices) {
        const display = getDisplayStatus(inv);
        rows.push({
          id: inv.id,
          kind: "invoice",
          title: inv.title || inv.invoice_number || t("invoices.newInvoice", "New invoice"),
          displayStatus: display,
          amount: inv.total_after_rot || inv.total_amount || 0,
          updatedAt: inv.updated_at || inv.created_at,
          number: inv.invoice_number,
          isAta: inv.is_ata ?? false,
          isRevision: false,
        });
      }

      rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setDocs(rows);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [projectId, t]);

  const fmt = (amount: number) => formatCurrency(amount, currency);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!summary || (docs.length === 0 && summary.acceptedQuoteTotal === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2" />
        <p className="text-sm">{t("customerView.noAcceptedQuotes", "No accepted quotes yet.")}</p>
      </div>
    );
  }

  const contractTotal = summary.acceptedQuoteTotal;
  const invoiced = summary.totalInvoicedAmount;
  const paidPct = contractTotal > 0 ? (totalPaid / contractTotal) * 100 : 0;
  const invoicedPct = contractTotal > 0 ? (invoiced / contractTotal) * 100 : 0;

  const handleClick = (row: DocRow) => {
    if (row.kind === "quote") {
      navigate(`/quotes/${row.id}`);
    } else {
      navigate(`/invoices/${row.id}`);
    }
  };

  const getStatusBadge = (row: DocRow) => {
    if (row.kind === "quote") {
      const config = quoteStatusConfig[row.displayStatus] || quoteStatusConfig.draft;
      const Icon = config.icon;
      return (
        <Badge variant="secondary" className={cn("text-xs whitespace-nowrap", config.bgColor, config.color)}>
          <Icon className="h-3 w-3 mr-1" />
          {t(`quotes.${row.displayStatus}`)}
        </Badge>
      );
    }
    const config = invoiceStatusConfig[row.displayStatus] || invoiceStatusConfig.draft;
    const Icon = config.icon;
    const statusKey = row.displayStatus === "partially_paid" ? "partiallyPaid" : row.displayStatus;
    return (
      <Badge variant="secondary" className={cn("text-xs whitespace-nowrap", config.bgColor, config.color)}>
        <Icon className="h-3 w-3 mr-1" />
        {t(`invoices.${statusKey}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Aggregated summary ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{t("customerView.contractTotal", "Contract value")}</span>
          <span className="text-2xl font-bold">{fmt(contractTotal)}</span>
        </div>

        {/* Segmented bar: paid | invoiced-not-paid | remaining */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
          {paidPct > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${Math.min(paidPct, 100)}%` }}
            />
          )}
          {invoicedPct - paidPct > 0 && (
            <div
              className="bg-amber-400 transition-all"
              style={{ width: `${Math.min(invoicedPct - paidPct, 100 - paidPct)}%` }}
            />
          )}
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{t("customerView.totalPaid", "Paid")}</span>
            <span className="font-medium">{fmt(totalPaid)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-muted-foreground">{t("customerView.totalInvoiced", "Invoiced")}</span>
            <span className="font-medium">{fmt(invoiced)}</span>
          </div>
          {contractTotal - invoiced > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">{t("customerView.remaining", "Remaining")}</span>
              <span className="font-medium">{fmt(contractTotal - invoiced)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Percent method note */}
      {invoicingMethod === "percent_of_project" && invoiced > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {t("customerView.percentMethodNote", "Invoiced {{percent}}% of total contract value", {
              percent: summary.totalInvoicedPercent,
            })}
          </span>
        </div>
      )}

      {/* ── Unified document list ── */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("overview.documents", "Documents")}
          </h4>
          <div className="divide-y divide-border">
            {docs.map((row) => (
              <button
                key={`${row.kind}-${row.id}`}
                onClick={() => handleClick(row)}
                className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors group -mx-1 px-1 rounded-md"
              >
                {/* Type icon */}
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  row.kind === "quote" ? "bg-primary/10" : "bg-blue-500/10"
                )}>
                  {row.kind === "quote" ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <Receipt className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{row.title}</span>
                    {row.isAta && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-300">
                        ÄTA
                      </Badge>
                    )}
                    {row.isRevision && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-300">
                        <RefreshCw className="h-2.5 w-2.5 mr-0.5" />
                        Rev
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    {row.number && <span>{row.number} ·</span>}
                    <span>{fmt(row.amount)}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(row.updatedAt), {
                        addSuffix: true,
                        locale: getLocale(),
                      })}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                {getStatusBadge(row)}

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
