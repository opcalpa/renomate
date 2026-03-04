import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardList,
  FileText,
  Send,
  Hammer,
  PauseCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  type ProjectStatus,
  normalizeStatus,
  getStatusCTA,
  STATUS_META,
} from "@/lib/projectStatus";

const STATUS_ICONS: Record<ProjectStatus, React.ElementType> = {
  planning: ClipboardList,
  quote_created: FileText,
  quote_sent: Send,
  quote_rejected: RefreshCw,
  active: Hammer,
  on_hold: PauseCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

interface ProjectStatusCTAProps {
  status: string | null | undefined;
  taskCount?: number;
  quotedAmount?: number | null;
  currency?: string | null;
  onNavigateToTasks?: () => void;
  onCreateQuote?: () => void;
  onViewQuote?: () => void;
  onCreateInvoice?: () => void;
  onReviseQuote?: () => void;
}

export function ProjectStatusCTA({
  status: rawStatus,
  taskCount = 0,
  onNavigateToTasks,
  onCreateQuote,
  onViewQuote,
  onCreateInvoice,
  onReviseQuote,
}: ProjectStatusCTAProps) {
  const { t } = useTranslation();
  const status = normalizeStatus(rawStatus);
  const meta = STATUS_META[status];
  const cta = getStatusCTA(status);
  const Icon = STATUS_ICONS[status];

  if (!cta) return null;

  const handleAction = (action: string) => {
    switch (action) {
      case "navigate_tasks":
        onNavigateToTasks?.();
        break;
      case "create_quote":
      case "send_quote":
        onCreateQuote?.();
        break;
      case "view_quote":
      case "edit_quote":
        onViewQuote?.();
        break;
      case "create_invoice":
        onCreateInvoice?.();
        break;
      case "revise_quote":
        onReviseQuote?.();
        break;
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
              {t(meta.labelKey)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(cta.messageKey)}
            {status === "planning" && taskCount > 0 && (
              <> ({taskCount} {t("projectStatus.cta.addTasks").toLowerCase()})</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {cta.secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => handleAction(cta.secondaryAction!.action)}
            >
              {t(cta.secondaryAction.labelKey)}
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 sm:flex-none gap-1"
            onClick={() => handleAction(cta.primaryAction.action)}
          >
            {t(cta.primaryAction.labelKey)}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
