import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Percent, ListChecks } from "lucide-react";
import { PercentMethodForm } from "./PercentMethodForm";
import { CompletedWorkForm } from "./CompletedWorkForm";

type Method = "percent_of_project" | "completed_work";

interface InvoiceMethodDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceMethodDialog({
  projectId,
  open,
  onOpenChange,
}: InvoiceMethodDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("percent_of_project");
  const [step, setStep] = useState<"select" | "form">("select");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep("select");
    }
    onOpenChange(next);
  };

  const handleContinue = () => {
    setStep("form");
  };

  const handleBlankInvoice = () => {
    onOpenChange(false);
    navigate(`/invoices/new?projectId=${projectId}`);
  };

  const handleCreated = (invoiceId: string) => {
    onOpenChange(false);
    navigate(`/invoices/new?editInvoiceId=${invoiceId}&projectId=${projectId}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("invoiceMethod.title")}</DialogTitle>
              <DialogDescription>
                {t("invoiceMethod.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as Method)}
              className="space-y-3 mt-2"
            >
              <label
                htmlFor="method-percent"
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value="percent_of_project" id="method-percent" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="method-percent" className="font-medium cursor-pointer">
                      {t("invoiceMethod.percentOfProject")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("invoiceMethod.percentOfProjectHint")}
                  </p>
                </div>
              </label>

              <label
                htmlFor="method-work"
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value="completed_work" id="method-work" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-green-600" />
                    <Label htmlFor="method-work" className="font-medium cursor-pointer">
                      {t("invoiceMethod.completedWork")}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("invoiceMethod.completedWorkHint")}
                  </p>
                </div>
              </label>
            </RadioGroup>

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline"
                onClick={handleBlankInvoice}
              >
                {t("invoiceMethod.blankInvoice")}
              </button>
              <Button onClick={handleContinue}>
                {t("invoiceMethod.continue")}
              </Button>
            </div>
          </>
        ) : method === "percent_of_project" ? (
          <PercentMethodForm
            projectId={projectId}
            onCreated={handleCreated}
            onBack={() => setStep("select")}
          />
        ) : (
          <CompletedWorkForm
            projectId={projectId}
            onCreated={handleCreated}
            onBack={() => setStep("select")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
