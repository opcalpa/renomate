import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProjectInvoicingSummary,
  createPercentInvoice,
  type ProjectInvoicingSummary,
} from "@/services/invoiceMethodService";

interface PercentMethodFormProps {
  projectId: string;
  onCreated: (invoiceId: string) => void;
  onBack: () => void;
}

export function PercentMethodForm({
  projectId,
  onCreated,
  onBack,
}: PercentMethodFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [summary, setSummary] = useState<ProjectInvoicingSummary | null>(null);
  const [percent, setPercent] = useState<string>("");
  const [isRotEligible, setIsRotEligible] = useState(false);

  useEffect(() => {
    fetchProjectInvoicingSummary(projectId).then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, [projectId]);

  const numPercent = parseFloat(percent) || 0;
  const invoiceAmount = summary
    ? Math.round(summary.acceptedQuoteTotal * (numPercent / 100) * 100) / 100
    : 0;
  const exceedsRemaining = summary
    ? invoiceAmount > summary.remainingAmount + 0.01
    : false;

  const handleCreate = async () => {
    if (!summary || numPercent <= 0 || exceedsRemaining) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      setCreating(false);
      return;
    }

    const invoiceId = await createPercentInvoice(
      projectId,
      profile.id,
      numPercent,
      { isRotEligible }
    );

    setCreating(false);

    if (invoiceId) {
      toast.success(t("invoiceMethod.invoiceCreated"));
      onCreated(invoiceId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary || summary.acceptedQuoteTotal <= 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("invoiceMethod.percentOfProject")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-4">
          {t("invoiceMethod.noAcceptedQuotes")}
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.cancel")}
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("invoiceMethod.percentOfProject")}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {t("invoiceMethod.contractValue")}
            </p>
            <p className="font-semibold">
              {formatCurrency(summary.acceptedQuoteTotal)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {t("invoiceMethod.alreadyInvoiced")}
            </p>
            <p className="font-semibold">
              {formatCurrency(summary.totalInvoicedAmount)}
              <span className="text-xs text-muted-foreground ml-1">
                ({summary.totalInvoicedPercent}%)
              </span>
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {t("invoiceMethod.remaining")}
            </p>
            <p className="font-semibold">
              {formatCurrency(summary.remainingAmount)}
            </p>
          </div>
        </div>

        {/* Percent input */}
        <div>
          <Label htmlFor="invoice-percent">
            {t("invoiceMethod.enterPercent")}
          </Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              id="invoice-percent"
              type="number"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="0"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <div className="flex gap-1 ml-auto">
              {[25, 50, 75, 100].map((p) => (
                <Button
                  key={p}
                  variant={numPercent === p ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setPercent(String(p))}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Amount preview */}
        {numPercent > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
            <span className="text-sm font-medium">
              {t("invoiceMethod.invoiceAmount")}
            </span>
            <span className={`text-lg font-bold ${exceedsRemaining ? "text-destructive" : ""}`}>
              {formatCurrency(invoiceAmount)}
            </span>
          </div>
        )}

        {exceedsRemaining && (
          <p className="text-sm text-destructive">
            {t("invoiceMethod.exceedsRemaining")}
          </p>
        )}

        {/* ROT checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={isRotEligible}
            onCheckedChange={(v) => setIsRotEligible(v === true)}
          />
          <span className="text-sm">{t("invoiceMethod.rotEligible")}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <Button variant="outline" onClick={onBack} disabled={creating}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleCreate}
          disabled={creating || numPercent <= 0 || exceedsRemaining}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {t("invoiceMethod.creating")}
            </>
          ) : (
            t("invoiceMethod.createInvoice")
          )}
        </Button>
      </div>
    </>
  );
}
