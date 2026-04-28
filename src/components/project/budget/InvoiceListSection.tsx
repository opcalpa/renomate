import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, ExternalLink, Download } from "lucide-react";
import { getDisplayStatus } from "@/services/invoiceService";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  title: string;
  invoice_number: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  sent_at: string | null;
  is_ata: boolean;
  created_at: string;
}

interface InvoiceListSectionProps {
  projectId: string;
  currency?: string | null;
  onCreateInvoice?: () => void;
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

export function InvoiceListSection({ projectId, currency, onCreateInvoice }: InvoiceListSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exporting, setExporting] = useState(false);

  const handleSieExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) return;
      const { generateSie4Export, downloadSieFile } = await import("@/services/sieExportService");
      const year = new Date().getFullYear();
      const { content, filename } = await generateSie4Export(profile.id, year);
      if (!content) {
        toast({ description: t("budget.sieNoData", "No invoices to export for this year.") });
        return;
      }
      downloadSieFile(content, filename);
      toast({ description: t("budget.sieExported", "SIE4 file exported") });
    } catch {
      toast({ title: t("common.error"), description: "SIE export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("id, title, invoice_number, status, total_amount, paid_amount, due_date, sent_at, is_ata, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setInvoices(data || []);
  };

  if (invoices.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("budget.builder.invoices", "Invoices")}
            <Badge variant="secondary" className="ml-1">{invoices.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSieExport}
              disabled={exporting}
              className="gap-1 text-muted-foreground"
              title={t("budget.sieExport", "Export SIE4 for accounting")}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SIE</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateInvoice ? onCreateInvoice() : navigate(`/invoices/new?projectId=${projectId}`)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("budget.builder.newInvoice", "New")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {invoices.map((inv) => {
          const displayStatus = getDisplayStatus(inv);
          const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);

          return (
            <button
              key={inv.id}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              onClick={() => navigate(`/invoices/${inv.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium truncate">
                    {inv.invoice_number || inv.title || t("invoices.untitled", "Untitled")}
                  </span>
                  {inv.is_ata && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      ATA
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatCurrency(inv.total_amount || 0, currency)}</span>
                  {displayStatus === "partially_paid" && (
                    <span>({formatCurrency(remaining, currency)} {t("budget.remaining").toLowerCase()})</span>
                  )}
                  {inv.due_date && (
                    <span>{new Date(inv.due_date).toLocaleDateString("sv-SE")}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={STATUS_COLORS[displayStatus] || STATUS_COLORS.draft}>
                  {t(`invoices.${invoiceStatusKey(displayStatus)}`)}
                </Badge>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
