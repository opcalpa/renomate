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
  FileText,
  Plus,
  Loader2,
  ChevronRight,
  Check,
  Send,
  X,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS, pl, uk } from "date-fns/locale";

interface ProjectQuotesDialogProps {
  projectId: string;
  currency?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuote: () => void;
}

interface Quote {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  total_after_rot: number;
  created_at: string;
  updated_at: string;
  viewed_at: string | null;
  client_id_ref: string | null;
  is_ata: boolean | null;
  quote_number: string | null;
  revised_from: string | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  draft: { icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" },
  sent: { icon: Send, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  accepted: { icon: Check, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  rejected: { icon: X, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  expired: { icon: Clock, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
};

export function ProjectQuotesDialog({
  projectId,
  currency,
  open,
  onOpenChange,
  onCreateQuote,
}: ProjectQuotesDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Get date-fns locale
  const getLocale = () => {
    const lang = i18n.language;
    if (lang === "sv") return sv;
    if (lang === "pl") return pl;
    if (lang === "uk") return uk;
    return enUS;
  };

  useEffect(() => {
    if (!open) return;

    const fetchQuotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("id, title, status, total_amount, total_after_rot, created_at, updated_at, viewed_at, client_id_ref, is_ata, quote_number, revised_from")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch quotes:", error);
        setLoading(false);
        return;
      }

      setQuotes(data || []);
      setLoading(false);
    };

    fetchQuotes();
  }, [open, projectId]);

  const handleQuoteClick = (quoteId: string) => {
    const returnTo = encodeURIComponent(`/projects/${projectId}`);
    navigate(`/quotes/${quoteId}?returnTo=${returnTo}`);
    onOpenChange(false);
  };

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, currency);
  };

  // Calculate totals for accepted quotes
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted");
  const acceptedTotal = acceptedQuotes.reduce((sum, q) => sum + (q.total_after_rot || q.total_amount || 0), 0);
  const hasAcceptedQuote = acceptedQuotes.length > 0;

  // Find client from existing quotes (for ÄTA pre-fill)
  const existingClientId = acceptedQuotes.find((q) => q.client_id_ref)?.client_id_ref
    || quotes.find((q) => q.client_id_ref)?.client_id_ref
    || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("quotes.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t("quotes.noSavedQuotes")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.map((quote) => {
                const config = statusConfig[quote.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                const amount = quote.total_after_rot || quote.total_amount || 0;

                return (
                  <button
                    key={quote.id}
                    onClick={() => handleQuoteClick(quote.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{quote.title}</span>
                          {quote.is_ata && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              ÄTA
                            </Badge>
                          )}
                          {quote.revised_from && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Rev.
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", config.bgColor, config.color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {t(`quotes.${quote.status}`)}
                          </Badge>
                        </div>
                        {quote.quote_number && (
                          <p className="text-xs text-muted-foreground mb-0.5">{quote.quote_number}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatAmount(amount)}</span>
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(new Date(quote.updated_at || quote.created_at), {
                              addSuffix: true,
                              locale: getLocale(),
                            })}
                          </span>
                          {quote.status === "sent" && quote.viewed_at && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {t("quotes.viewedByCustomer")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {acceptedTotal > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-muted-foreground">{t("quotes.acceptedTotal")}</span>
              <span className="font-medium text-green-600">{formatAmount(acceptedTotal)}</span>
            </div>
          </>
        )}

        <Separator />

        <Button
          onClick={() => {
            if (hasAcceptedQuote) {
              // ÄTA flow: navigate directly with is_ata + existing client
              const params = new URLSearchParams({ projectId });
              params.set("is_ata", "true");
              if (existingClientId) params.set("clientId", existingClientId);
              navigate(`/quotes/new?${params.toString()}`);
              onOpenChange(false);
            } else {
              onCreateQuote();
            }
          }}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {hasAcceptedQuote
            ? t("quotes.createChangeOrder", "Create change order")
            : t("quotes.createQuote")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
