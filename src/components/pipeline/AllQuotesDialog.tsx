import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  ChevronRight,
  Check,
  Send,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import type { QuoteSummary } from "./types";

interface AllQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotes: QuoteSummary[];
  acceptedTotal: number;
  currency?: string | null;
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  draft: {
    icon: FileText,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  sent: {
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  accepted: {
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  rejected: {
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  expired: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
};

export function AllQuotesDialog({
  open,
  onOpenChange,
  quotes,
  acceptedTotal,
  currency,
}: AllQuotesDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const getLocale = () => (i18n.language === "sv" ? sv : enUS);

  const handleQuoteClick = (quote: QuoteSummary) => {
    const returnTo = encodeURIComponent("/start");
    navigate(`/quotes/${quote.id}?returnTo=${returnTo}`);
    onOpenChange(false);
  };

  const formatAmount = (amount: number) => formatCurrency(amount, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("pipeline.allQuotes")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t("pipeline.emptyQuotes")}</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {quotes.map((quote) => {
                const config = statusConfig[quote.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                const amount = quote.total_after_rot || quote.total_amount || 0;

                return (
                  <button
                    key={quote.id}
                    onClick={() => handleQuoteClick(quote)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{quote.title}</span>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs shrink-0", config.bgColor, config.color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {t(`quotes.${quote.status}`)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatAmount(amount)}
                          </span>
                          <span>·</span>
                          {quote.project_name && (
                            <>
                              <span className="truncate">{quote.project_name}</span>
                              <span>·</span>
                            </>
                          )}
                          <span className="shrink-0">
                            {formatDistanceToNow(new Date(quote.updated_at || quote.created_at), {
                              addSuffix: true,
                              locale: getLocale(),
                            })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {acceptedTotal > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-muted-foreground">{t("pipeline.acceptedTotal")}</span>
              <span className="font-medium text-green-600">{formatAmount(acceptedTotal)}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
