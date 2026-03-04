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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePersonnummer } from "@/lib/personnummerValidator";
import { Loader2 } from "lucide-react";

interface RotDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  profileId: string;
  existingPersonnummer?: string | null;
  existingAddress?: string | null;
  existingPropertyDesignation?: string | null;
  onSaved: () => void;
}

export function RotDetailsDialog({
  open,
  onOpenChange,
  projectId,
  profileId,
  existingPersonnummer,
  existingAddress,
  existingPropertyDesignation,
  onSaved,
}: RotDetailsDialogProps) {
  const { t } = useTranslation();
  const [personnummer, setPersonnummer] = useState(existingPersonnummer || "");
  const [address, setAddress] = useState(existingAddress || "");
  const [propertyDesignation, setPropertyDesignation] = useState(
    existingPropertyDesignation || ""
  );
  const [personnummerError, setPersonnummerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate personnummer if provided
    if (personnummer.trim()) {
      const result = validatePersonnummer(personnummer);
      if (!result.valid) {
        setPersonnummerError(t("rot.personnummerInvalid"));
        return;
      }
      setPersonnummerError(null);
    }

    setSaving(true);
    try {
      const normalized = personnummer.trim()
        ? validatePersonnummer(personnummer).normalized
        : null;

      // Save personnummer to profile
      if (normalized) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ personnummer: normalized })
          .eq("id", profileId);
        if (profileError) throw profileError;
      }

      // Save property_designation and address to project
      const projectUpdate: Record<string, unknown> = {};
      if (propertyDesignation.trim()) {
        projectUpdate.property_designation = propertyDesignation.trim();
      }
      if (address.trim()) {
        projectUpdate.address = address.trim();
      }

      if (Object.keys(projectUpdate).length > 0) {
        const { error: projectError } = await supabase
          .from("projects")
          .update(projectUpdate)
          .eq("id", projectId);
        if (projectError) throw projectError;
      }

      toast.success(t("rot.saved"), {
        description: t("rot.savedDescription"),
      });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save ROT details:", error);
      toast.error(t("errors.generic", "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rot.detailsTitle")}</DialogTitle>
          <DialogDescription>{t("rot.detailsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rot-personnummer">{t("rot.personnummer")}</Label>
            <Input
              id="rot-personnummer"
              value={personnummer}
              onChange={(e) => {
                setPersonnummer(e.target.value);
                setPersonnummerError(null);
              }}
              placeholder={t("rot.personnummerPlaceholder")}
            />
            {personnummerError && (
              <p className="text-sm text-destructive">{personnummerError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rot-address">{t("rot.propertyAddress")}</Label>
            <Input
              id="rot-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("rot.propertyAddressHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rot-designation">
              {t("rot.propertyDesignation")}
            </Label>
            <Input
              id="rot-designation"
              value={propertyDesignation}
              onChange={(e) => setPropertyDesignation(e.target.value)}
              placeholder={t("rot.propertyDesignationPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("rot.propertyDesignationHint")}
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            {t("rot.skipForNow")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
