import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Receipt,
  Check,
  Send,
  X,
  Clock,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  Plus,
  RefreshCw,
  Eye,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { getDisplayStatus } from "@/services/invoiceService";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS, pl, uk } from "date-fns/locale";

interface ProjectDocumentsCardProps {
  projectId: string;
  currency?: string | null;
  /** Builder-only: callbacks to create new documents */
  onCreateQuote?: () => void;
  onCreateInvoice?: () => void;
  /** Builder-only: estimated profit shown below the bar */
  estimatedProfit?: number;
  /** Skip Card wrapper (for embedding inside a collapsible section) */
  embedded?: boolean;
  /** Hide draft quotes and draft/cancelled invoices (customer view) */
  excludeDrafts?: boolean;
}

interface DocRow {
  id: string;
  kind: "quote" | "invoice";
  title: string;
  status: string;
  displayStatus: string;
  amount: number;
  updatedAt: string;
  number: string | null;
  isAta: boolean;
  isRevision: boolean;
  viewedAt: string | null;
  paidAmount: number;
}

interface FinancialSummary {
  contractTotal: number;
  invoicedTotal: number;
  totalPaid: number;
}

const quoteStatusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  draft: { icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" },
  sent: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  accepted: { icon: Check, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  rejected: { icon: X, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  expired: { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
};

const invoiceStatusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  draft: { icon: Receipt, color: "text-muted-foreground", bgColor: "bg-muted" },
  sent: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  paid: { icon: Check, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  partially_paid: { icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  overdue: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  cancelled: { icon: Clock, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

export function ProjectDocumentsCard({
  projectId,
  currency,
  onCreateQuote,
  onCreateInvoice,
  estimatedProfit,
  embedded = false,
  excludeDrafts = false,
}: ProjectDocumentsCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [financials, setFinancials] = useState<FinancialSummary>({
    contractTotal: 0,
    invoicedTotal: 0,
    totalPaid: 0,
  });
  const [loading, setLoading] = useState(true);

  const getLocale = () => {
    const lang = i18n.language;
    if (lang === "sv") return sv;
    if (lang === "pl") return pl;
    if (lang === "uk") return uk;
    return enUS;
  };

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);

      let quotesQuery = supabase
        .from("quotes")
        .select("id, title, status, total_amount, total_after_rot, updated_at, created_at, quote_number, is_ata, revised_from, viewed_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (excludeDrafts) {
        quotesQuery = quotesQuery.in("status", ["accepted", "sent"]);
      }

      let invoicesQuery = supabase
        .from("invoices")
        .select("id, title, status, total_amount, total_after_rot, paid_amount, updated_at, created_at, invoice_number, is_ata, due_date, sent_at, viewed_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (excludeDrafts) {
        invoicesQuery = invoicesQuery.neq("status", "draft").neq("status", "cancelled");
      }

      const [quotesRes, invoicesRes] = await Promise.all([quotesQuery, invoicesQuery]);

      if (quotesRes.error) console.error("Failed to fetch quotes:", quotesRes.error);
      if (invoicesRes.error) console.error("Failed to fetch invoices:", invoicesRes.error);

      const allQuotes = quotesRes.data || [];
      const allInvoices = invoicesRes.data || [];

      // Compute financial summary from raw data
      const contractTotal = allQuotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + (q.total_after_rot || q.total_amount || 0), 0);

      const invoicedTotal = allInvoices
        .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled")
        .reduce((sum, inv) => sum + (inv.total_after_rot || inv.total_amount || 0), 0);

      const totalPaid = allInvoices.reduce((sum, inv) => sum + ((inv.paid_amount as number) || 0), 0);

      setFinancials({ contractTotal, invoicedTotal, totalPaid });

      // Build document rows
      const docs: DocRow[] = [];

      for (const q of allQuotes) {
        docs.push({
          id: q.id,
          kind: "quote",
          title: q.title || t("quotes.untitled", "Untitled quote"),
          status: q.status,
          displayStatus: q.status,
          amount: q.total_after_rot || q.total_amount || 0,
          updatedAt: q.updated_at || q.created_at,
          number: q.quote_number,
          isAta: q.is_ata ?? false,
          isRevision: !!q.revised_from,
          viewedAt: q.viewed_at,
          paidAmount: 0,
        });
      }

      for (const inv of allInvoices) {
        const display = getDisplayStatus(inv);
        docs.push({
          id: inv.id,
          kind: "invoice",
          title: inv.title || inv.invoice_number || t("invoices.newInvoice", "New invoice"),
          status: inv.status,
          displayStatus: display,
          amount: inv.total_after_rot || inv.total_amount || 0,
          updatedAt: inv.updated_at || inv.created_at,
          number: inv.invoice_number,
          isAta: inv.is_ata ?? false,
          isRevision: false,
          viewedAt: inv.viewed_at,
          paidAmount: (inv.paid_amount as number) ?? 0,
        });
      }

      docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setRows(docs);
      setLoading(false);
    };

    fetchDocs();
  }, [projectId, excludeDrafts, t]);

  const handleClick = (row: DocRow) => {
    const returnTo = encodeURIComponent(`/projects/${projectId}`);
    if (row.kind === "quote") {
      navigate(`/quotes/${row.id}?returnTo=${returnTo}`);
    } else {
      navigate(`/invoices/${row.id}?returnTo=${returnTo}`);
    }
  };

  const fmt = (amount: number) => formatCurrency(amount, currency);

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

  const { contractTotal, invoicedTotal, totalPaid } = financials;
  const paidPct = contractTotal > 0 ? (totalPaid / contractTotal) * 100 : 0;
  const invoicedPct = contractTotal > 0 ? (invoicedTotal / contractTotal) * 100 : 0;
  const showSummary = contractTotal > 0;

  const content = (
    <>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Financial summary bar ── */}
          {showSummary && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t("customerView.contractTotal", "Contract value")}</span>
                <span className="text-2xl font-bold">{fmt(contractTotal)}</span>
              </div>

              {/* Segmented bar */}
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                {paidPct > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${Math.min(paidPct, 100)}%` }} />
                )}
                {invoicedPct - paidPct > 0 && (
                  <div className="bg-amber-400 transition-all" style={{ width: `${Math.min(invoicedPct - paidPct, 100 - paidPct)}%` }} />
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{t("customerView.totalPaid", "Paid")}</span>
                  <span className="font-medium">{fmt(totalPaid)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-muted-foreground">{t("customerView.totalInvoiced", "Invoiced")}</span>
                  <span className="font-medium">{fmt(invoicedTotal)}</span>
                </div>
                {contractTotal - invoicedTotal > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-muted-foreground">{t("customerView.remaining", "Remaining")}</span>
                    <span className="font-medium">{fmt(contractTotal - invoicedTotal)}</span>
                  </div>
                )}
              </div>

              {/* Builder-only: estimated profit */}
              {(estimatedProfit ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-sm pt-1 border-t">
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-muted-foreground">{t("overview.pulseCards.estProfit", "Est. profit")}</span>
                  <span className="font-medium text-green-600">~{fmt(estimatedProfit!)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Document list ── */}
          {rows.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("overview.documents", "Documents")}
              </h4>
              <div className="divide-y divide-border">
                {rows.map((row) => (
                  <button
                    key={`${row.kind}-${row.id}`}
                    onClick={() => handleClick(row)}
                    className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors group -mx-1 px-1 rounded-md"
                  >
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
                        {row.status === "sent" && row.viewedAt && (
                          <span className="text-green-600 flex items-center gap-0.5 ml-0.5">
                            <Eye className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {getStatusBadge(row)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showSummary && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("overview.noDocuments", "No quotes or invoices yet")}
            </p>
          )}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("overview.documents", "Documents")}
            {rows.length > 0 && (
              <Badge variant="secondary" className="text-xs">{rows.length}</Badge>
            )}
          </CardTitle>
          {(onCreateQuote || onCreateInvoice) && (
            <div className="flex items-center gap-1">
              {onCreateQuote && (
                <Button variant="ghost" size="sm" onClick={onCreateQuote} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" />
                  {t("quotes.title")}
                </Button>
              )}
              {onCreateInvoice && (
                <Button variant="ghost" size="sm" onClick={onCreateInvoice} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" />
                  {t("invoices.title")}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}
