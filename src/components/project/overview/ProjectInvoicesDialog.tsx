import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Receipt,
  Plus,
  Loader2,
  ChevronRight,
  Check,
  Send,
  Clock,
  Eye,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { getDisplayStatus } from "@/services/invoiceService";

interface ProjectInvoicesDialogProps {
  projectId: string;
  currency?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateInvoice: () => void;
}

interface Invoice {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  total_after_rot: number;
  paid_amount: number;
  created_at: string;
  updated_at: string;
  viewed_at: string | null;
  due_date: string | null;
  sent_at: string | null;
  invoice_number: string | null;
  is_ata: boolean | null;
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  draft: {
    icon: Receipt,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  sent: {
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  paid: {
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  partially_paid: {
    icon: CreditCard,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  overdue: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  cancelled: {
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

export function ProjectInvoicesDialog({
  projectId,
  currency,
  open,
  onOpenChange,
  onCreateInvoice,
}: ProjectInvoicesDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocale = () => (i18n.language === "sv" ? sv : enUS);

  useEffect(() => {
    if (!open) return;

    const fetchInvoices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, title, status, total_amount, total_after_rot, paid_amount, created_at, updated_at, viewed_at, due_date, sent_at, invoice_number, is_ata"
        )
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch invoices:", error);
        setLoading(false);
        return;
      }

      setInvoices(data || []);
      setLoading(false);
    };

    fetchInvoices();
  }, [open, projectId]);

  const handleInvoiceClick = (invoiceId: string) => {
    const returnTo = encodeURIComponent(`/projects/${projectId}`);
    navigate(`/invoices/${invoiceId}?returnTo=${returnTo}`);
    onOpenChange(false);
  };

  const formatAmount = (amount: number) => formatCurrency(amount, currency);

  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.total_after_rot || i.total_amount || 0), 0);

  const receivedTotal = invoices.reduce(
    (sum, i) => sum + (i.paid_amount || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t("invoices.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {t("invoices.noInvoices")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const display = getDisplayStatus(inv);
                const config = statusConfig[display] || statusConfig.draft;
                const StatusIcon = config.icon;
                const amount =
                  inv.total_after_rot || inv.total_amount || 0;

                const statusKey =
                  display === "partially_paid"
                    ? "partiallyPaid"
                    : display;

                return (
                  <button
                    key={inv.id}
                    onClick={() => handleInvoiceClick(inv.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">
                            {inv.title || inv.invoice_number || t("invoices.newInvoice")}
                          </span>
                          {inv.is_ata && (
                            <Badge variant="outline" className="text-xs">
                              ÄTA
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              config.bgColor,
                              config.color
                            )}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {t(`invoices.${statusKey}`)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {inv.invoice_number && (
                            <>
                              <span>{inv.invoice_number}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatAmount(amount)}</span>
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(
                              new Date(inv.updated_at || inv.created_at),
                              { addSuffix: true, locale: getLocale() }
                            )}
                          </span>
                          {inv.status === "sent" && inv.viewed_at && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {t("invoices.viewedByCustomer")}
                              </span>
                            </>
                          )}
                        </div>
                        {(inv.paid_amount ?? 0) > 0 &&
                          inv.status !== "paid" && (
                            <div className="text-xs text-green-600 mt-1">
                              {t("invoices.paidAmount")}:{" "}
                              {formatAmount(inv.paid_amount || 0)}
                            </div>
                          )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {receivedTotal > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-muted-foreground">
                {t("invoices.received")}
              </span>
              <span className="font-medium text-green-600">
                {formatAmount(receivedTotal)}
              </span>
            </div>
          </>
        )}

        <Separator />

        <Button onClick={onCreateInvoice} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t("invoices.createInvoice")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
