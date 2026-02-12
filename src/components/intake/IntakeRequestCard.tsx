import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { sv, enUS } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Clock,
  MoreVertical,
  Copy,
  Send,
  Eye,
  FileText,
  XCircle,
  Check,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cancelIntakeRequest,
  getIntakeFormUrl,
  type IntakeRequest,
  type IntakeStatus,
} from "@/services/intakeService";

interface IntakeRequestCardProps {
  request: IntakeRequest;
  onView: () => void;
  onUpdated: (request: IntakeRequest) => void;
  highlight?: boolean;
}

const STATUS_CONFIG: Record<
  IntakeStatus,
  { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { labelKey: "intake.statusPending", variant: "outline" },
  submitted: { labelKey: "intake.statusSubmitted", variant: "default" },
  converted: { labelKey: "intake.statusConverted", variant: "secondary" },
  expired: { labelKey: "intake.statusExpired", variant: "destructive" },
  cancelled: { labelKey: "intake.statusCancelled", variant: "destructive" },
};

export function IntakeRequestCard({
  request,
  onView,
  onUpdated,
  highlight = false,
}: IntakeRequestCardProps) {
  const { t, i18n } = useTranslation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const locale = i18n.language === "sv" ? sv : enUS;
  const statusConfig = STATUS_CONFIG[request.status];
  const formUrl = getIntakeFormUrl(request.token);

  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale,
  });

  const submittedTimeAgo = request.submitted_at
    ? formatDistanceToNow(new Date(request.submitted_at), {
        addSuffix: true,
        locale,
      })
    : null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    toast.success(t("intake.linkCopied"));
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelIntakeRequest(request.id);
      onUpdated({ ...request, status: "cancelled" });
      toast.success(t("common.success"));
    } catch (error) {
      console.error("Failed to cancel request:", error);
      toast.error(t("common.error"));
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  const displayName =
    request.customer_name ||
    request.customer_email ||
    t("intake.statusPending");

  const displayAddress = [
    request.property_address,
    request.property_city,
  ]
    .filter(Boolean)
    .join(", ");

  const roomCount = request.rooms_data?.length || 0;

  return (
    <>
      <Card
        className={cn(
          "transition-all hover:shadow-md cursor-pointer",
          highlight && "ring-2 ring-primary/50 bg-primary/5"
        )}
        onClick={onView}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={statusConfig.variant} className="text-xs">
                  {request.status === "submitted" && (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {t(statusConfig.labelKey)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {request.status === "submitted" && submittedTimeAgo
                    ? submittedTimeAgo
                    : timeAgo}
                </span>
              </div>

              {/* Customer name */}
              <h3 className="font-medium truncate">{displayName}</h3>

              {/* Address */}
              {displayAddress && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{displayAddress}</span>
                </p>
              )}

              {/* Room count */}
              {roomCount > 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Home className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {roomCount} {roomCount === 1 ? "rum" : "rum"}
                  </span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {request.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("intake.copyLink")}
                </Button>
              )}

              {request.status === "submitted" && (
                <Button variant="default" size="sm" className="gap-1.5" onClick={onView}>
                  <FileText className="h-3.5 w-3.5" />
                  {t("intake.createQuote")}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t("intake.viewDetails")}
                  </DropdownMenuItem>

                  {request.status === "pending" && (
                    <>
                      <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t("intake.copyLink")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setCancelDialogOpen(true)}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t("intake.cancel")}
                      </DropdownMenuItem>
                    </>
                  )}

                  {request.status === "submitted" && (
                    <DropdownMenuItem onClick={onView}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t("intake.createQuote")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("intake.cancel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("intake.cancelConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? t("common.loading") : t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
