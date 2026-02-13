import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, FileText, CheckCircle, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useLeadsPipelineData } from "@/hooks/useLeadsPipelineData";
import { AllIntakeRequestsDialog } from "./AllIntakeRequestsDialog";
import { AllQuotesDialog } from "./AllQuotesDialog";
import { QuickQuoteDialog } from "./QuickQuoteDialog";
import { CreateIntakeDialog } from "@/components/intake/CreateIntakeDialog";
import type { IntakeRequest } from "@/services/intakeService";

interface LeadsPipelineSectionProps {
  onRefetch?: () => void;
}

export function LeadsPipelineSection({ onRefetch }: LeadsPipelineSectionProps) {
  const { t } = useTranslation();
  const { data, intakeRequests, quotes, refetch } = useLeadsPipelineData();

  // Dialog states
  const [intakesDialogOpen, setIntakesDialogOpen] = useState(false);
  const [quotesDialogOpen, setQuotesDialogOpen] = useState(false);
  const [createIntakeOpen, setCreateIntakeOpen] = useState(false);
  const [quickQuoteOpen, setQuickQuoteOpen] = useState(false);

  const handleIntakeCreated = (_request: IntakeRequest) => {
    refetch();
    if (onRefetch) onRefetch();
  };

  const handleCreateProjectFromIntake = (intakeId: string) => {
    // Navigate to create project with intake data
    // This could be enhanced to auto-create project from intake
    window.location.href = `/intake-requests/${intakeId}?action=create-project`;
  };

  if (data.loading) {
    return (
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-2xl font-semibold">
          {t("pipeline.myQuotes")}
        </h2>
        <div className="flex gap-2">
          {/* Quick Quote - Primary action */}
          <Button
            onClick={() => setQuickQuoteOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Zap className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("pipeline.quickQuote.button")}</span>
            <span className="sm:hidden">{t("pipeline.quickQuote.buttonShort")}</span>
          </Button>
          {/* Send customer form */}
          <Button
            variant="outline"
            onClick={() => setCreateIntakeOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Mail className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("pipeline.sendCustomerForm")}</span>
            <span className="sm:hidden">{t("intake.sendForm")}</span>
          </Button>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Intake Requests Card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setIntakesDialogOpen(true)}
        >
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("pipeline.intakeRequests")}
              </span>
            </div>
            <p className="text-2xl font-bold">{data.intakeRequests.total}</p>
            {data.intakeRequests.total > 0 && (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {data.intakeRequests.pending > 0 && (
                  <p>
                    {data.intakeRequests.pending} {t("pipeline.awaitingResponse")}
                  </p>
                )}
                {data.intakeRequests.submitted > 0 && (
                  <p>
                    {data.intakeRequests.submitted} {t("pipeline.needsAction")}
                  </p>
                )}
                {data.intakeRequests.unlinked > 0 && (
                  <p>
                    {data.intakeRequests.unlinked} {t("pipeline.unlinked")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes Card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setQuotesDialogOpen(true)}
        >
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("pipeline.quotes")}
              </span>
            </div>
            <p className="text-2xl font-bold">{data.quotes.total}</p>
            {data.quotes.total > 0 && (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {data.quotes.draft > 0 && (
                  <p>
                    {data.quotes.draft} {t("pipeline.draft")}
                  </p>
                )}
                {data.quotes.sent > 0 && (
                  <p>
                    {data.quotes.sent} {t("pipeline.sent")}
                  </p>
                )}
                {data.quotes.accepted > 0 && (
                  <p>
                    {data.quotes.accepted} {t("pipeline.accepted").toLowerCase()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Summary Card */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">
                {t("pipeline.accepted")}
              </span>
            </div>
            <p className="text-2xl font-bold">{data.quotes.accepted}</p>
            {data.quotes.acceptedTotal > 0 && (
              <p className="text-sm text-green-600 font-medium mt-1">
                {formatCurrency(data.quotes.acceptedTotal)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AllIntakeRequestsDialog
        open={intakesDialogOpen}
        onOpenChange={setIntakesDialogOpen}
        intakeRequests={intakeRequests}
        onCreateProject={handleCreateProjectFromIntake}
      />

      <AllQuotesDialog
        open={quotesDialogOpen}
        onOpenChange={setQuotesDialogOpen}
        quotes={quotes}
        acceptedTotal={data.quotes.acceptedTotal}
      />

      <CreateIntakeDialog
        open={createIntakeOpen}
        onOpenChange={setCreateIntakeOpen}
        onCreated={handleIntakeCreated}
      />

      <QuickQuoteDialog
        open={quickQuoteOpen}
        onOpenChange={(open) => {
          setQuickQuoteOpen(open);
          if (!open) {
            refetch();
            if (onRefetch) onRefetch();
          }
        }}
      />
    </div>
  );
}
