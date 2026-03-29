import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, ShoppingCart, ClipboardList, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface BudgetMaterial {
  id: string;
  name: string;
  price_total: number | null;
  task_id: string | null;
  room_id: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planned: BudgetMaterial | null;
  projectId: string;
  currentProfileId: string | null;
  currency?: string | null;
  usedAmount?: number;
  onCreated: () => void;
}

type FlowStep = "choose" | "receipt" | "purchase" | "request";

export function NewPurchaseFromBudgetDialog({
  open,
  onOpenChange,
  planned,
  projectId,
  currentProfileId,
  currency,
  usedAmount = 0,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<FlowStep>("choose");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const remaining = (planned?.price_total ?? 0) - usedAmount;

  const reset = useCallback(() => {
    setStep("choose");
    setAmount("");
    setDescription("");
  }, []);

  const handleClose = useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [onOpenChange, reset]);

  const handleSave = useCallback(async () => {
    if (!planned || !currentProfileId) return;
    setSaving(true);

    const isReceipt = step === "receipt";
    const isRequest = step === "request";
    const parsedAmount = amount ? parseFloat(amount) : null;

    const status = isReceipt ? "paid" : isRequest ? "submitted" : "to_order";

    const { error } = await supabase.from("materials").insert({
      project_id: projectId,
      task_id: planned.task_id,
      room_id: planned.room_id,
      name: planned.name,
      description: description || null,
      quantity: parsedAmount ? 1 : (planned.quantity || 1),
      unit: planned.unit || "st",
      price_per_unit: parsedAmount,
      price_total: parsedAmount,
      paid_amount: isReceipt ? parsedAmount : null,
      status,
      source_material_id: planned.id,
      created_by_user_id: currentProfileId,
    });

    setSaving(false);

    if (error) {
      toast.error(t("purchases.createOrderFailed", "Kunde inte skapa inköp"));
      return;
    }

    const labels: Record<string, string> = {
      receipt: t("purchases.receiptRegistered", "Kvitto registrerat"),
      purchase: t("purchases.purchaseCreated", "Inköp registrerat"),
      request: t("purchases.requestCreated", "Inköpsförfrågan skapad"),
    };
    toast.success(labels[step]);
    handleClose(false);
    onCreated();
  }, [planned, currentProfileId, step, amount, description, projectId, t, handleClose, onCreated]);

  if (!planned) return null;

  const choices = [
    {
      key: "receipt" as FlowStep,
      icon: Receipt,
      title: t("purchases.flowReceipt", "Registrera kvitto"),
      desc: t("purchases.flowReceiptDesc", "Har belopp och kvitto"),
      color: "text-emerald-600",
      bg: "hover:bg-emerald-50 hover:border-emerald-200",
    },
    {
      key: "purchase" as FlowStep,
      icon: ShoppingCart,
      title: t("purchases.flowPurchase", "Registrera inköp"),
      desc: t("purchases.flowPurchaseDesc", "Vet belopp, kvitto kommer"),
      color: "text-blue-600",
      bg: "hover:bg-blue-50 hover:border-blue-200",
    },
    {
      key: "request" as FlowStep,
      icon: ClipboardList,
      title: t("purchases.flowRequest", "Inköpsförfrågan"),
      desc: t("purchases.flowRequestDesc", "Belopp okänt, någon ska köpa"),
      color: "text-amber-600",
      bg: "hover:bg-amber-50 hover:border-amber-200",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === "choose"
              ? t("purchases.newPurchaseFrom", "Nytt inköp")
              : choices.find((c) => c.key === step)?.title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-medium text-foreground">{planned.name}</span>
            {planned.price_total != null && (
              <>
                {" · "}
                {t("purchases.budgetLabel", "Budget")}: {formatCurrency(planned.price_total, currency)}
                {usedAmount > 0 && (
                  <>
                    {" · "}
                    {t("purchases.remainingLabel", "Kvar")}: {formatCurrency(remaining, currency)}
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <div className="space-y-2 pt-1">
            {choices.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`flex items-start gap-3 w-full rounded-lg border p-3 text-left transition-colors ${c.bg}`}
                onClick={() => setStep(c.key)}
              >
                <c.icon className={`h-5 w-5 mt-0.5 shrink-0 ${c.color}`} />
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs -ml-2 text-muted-foreground"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {t("common.back", "Tillbaka")}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="purchase-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("purchases.amount", "Belopp")} (SEK)
                {step === "request" && (
                  <span className="normal-case tracking-normal font-normal ml-1">
                    — {t("purchases.optional", "valfritt")}
                  </span>
                )}
              </Label>
              <Input
                id="purchase-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={step === "request" ? t("purchases.amountUnknown", "Okänt") : "0"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required={step !== "request"}
                className="text-lg font-semibold tabular-nums"
              />
              {remaining > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setAmount(String(remaining))}
                >
                  {t("purchases.useRemaining", "Fyll i kvarvarande")}: {formatCurrency(remaining, currency)}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("purchases.note", "Anteckning")}
                {step === "request" && (
                  <span className="normal-case tracking-normal font-normal ml-1">
                    — {t("purchases.whatToBuy", "vad ska köpas?")}
                  </span>
                )}
              </Label>
              <Textarea
                id="purchase-desc"
                rows={2}
                placeholder={
                  step === "request"
                    ? t("purchases.requestPlaceholder", "T.ex. 'Behöver 2 burkar vit spackel'")
                    : t("purchases.notePlaceholder", "Valfri anteckning...")
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required={step === "request" && !amount}
              />
            </div>

            <Button
              className="w-full"
              disabled={saving || (step !== "request" && !amount)}
              onClick={handleSave}
            >
              {step === "receipt" && t("purchases.saveReceipt", "Spara kvitto")}
              {step === "purchase" && t("purchases.savePurchase", "Registrera inköp")}
              {step === "request" && t("purchases.saveRequest", "Skicka förfrågan")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
