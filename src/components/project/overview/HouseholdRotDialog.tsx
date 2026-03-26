/**
 * HouseholdRotDialog
 * Shown once for homeowners after project creation.
 * Asks if there are more people in the household for double ROT.
 * Options: invite co-owner OR just add personnummer for ROT.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HouseholdRotDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteCoOwner?: () => void; // Navigate to TeamManagement
}

export function HouseholdRotDialog({
  projectId,
  open,
  onOpenChange,
  onInviteCoOwner,
}: HouseholdRotDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"ask" | "addPnr" | "done">("ask");
  const [partnerName, setPartnerName] = useState("");
  const [partnerPnr, setPartnerPnr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddForRot = async () => {
    if (!partnerName.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("project_rot_persons").insert({
      project_id: projectId,
      name: partnerName.trim(),
      personnummer: partnerPnr.trim() || null,
    });

    if (error) {
      console.error("Error adding ROT person:", error);
      toast.error(t("rot.addError", "Kunde inte lägga till"));
    } else {
      setStep("done");
    }
    setSaving(false);
  };

  const handleDismiss = async () => {
    // Mark as asked so we don't show again
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_asked_household: true } as Record<string, unknown>)
        .eq("user_id", user.id);
    }
    onOpenChange(false);
  };

  const handleInvite = async () => {
    await handleDismiss();
    onInviteCoOwner?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            {t("household.title", "Fler i hushållet?")}
          </DialogTitle>
          <DialogDescription>
            {t("household.description", "Är ni fler som genomför renoveringen? Med två personer kan ni nyttja dubbelt ROT-avdrag — upp till 100 000 kr.")}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Ask */}
        {step === "ask" && (
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4"
              onClick={() => setStep("addPnr")}
            >
              <div className="flex items-center gap-3 text-left">
                <Shield className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("household.addForRot", "Lägg till för ROT-avdrag")}</p>
                  <p className="text-xs text-muted-foreground">{t("household.addForRotDesc", "Ange namn och personnummer — ingen inbjudan behövs")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4"
              onClick={handleInvite}
            >
              <div className="flex items-center gap-3 text-left">
                <UserPlus className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("household.inviteCoOwner", "Bjud in som delägare")}</p>
                  <p className="text-xs text-muted-foreground">{t("household.inviteCoOwnerDesc", "Delad projektledning med samma rättigheter + dubbelt ROT")}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleDismiss}
            >
              {t("household.noThanks", "Vi är bara en person")}
            </Button>
          </div>
        )}

        {/* Step 2: Add personnummer for ROT */}
        {step === "addPnr" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("rot.namePlaceholder", "Namn")}</Label>
              <Input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder={t("household.partnerNamePlaceholder", "Partnerns namn")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("rot.pnrPlaceholder", "Personnummer")}</Label>
              <Input
                value={partnerPnr}
                onChange={(e) => setPartnerPnr(e.target.value)}
                placeholder="ÅÅÅÅMMDD-XXXX"
              />
              <p className="text-xs text-muted-foreground">
                {t("household.pnrNote", "Behövs för ROT-avdrag. Sparas säkert.")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("ask")}>
                {t("common.back", "Tillbaka")}
              </Button>
              <Button className="flex-1" onClick={handleAddForRot} disabled={!partnerName.trim() || saving}>
                {t("common.add", "Lägg till")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="text-center py-4 space-y-3">
            <div className="rounded-full bg-green-100 p-3 mx-auto w-fit">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">{t("household.added", "ROT-person tillagd!")}</p>
            <p className="text-sm text-muted-foreground">
              {t("household.addedDesc", "Ert ROT-utrymme har fördubblats. Du kan hantera ROT-personer i projektöversikten.")}
            </p>
            <Button onClick={handleDismiss} className="w-full">
              {t("common.done", "Klar")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
