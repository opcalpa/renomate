import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepProps } from "./types";

export function PropertyStep({ formData, updateFormData }: StepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t("guidedSetup.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("guidedSetup.titleDesc")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectName">
          {t("guidedSetup.projectName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="projectName"
          value={formData.projectName}
          onChange={(e) => updateFormData({ projectName: e.target.value })}
          placeholder={t("guidedSetup.projectNamePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("projects.address")}</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => updateFormData({ address: e.target.value })}
          placeholder={t("projects.addressPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="postalCode">{t("projects.postalCode")}</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => updateFormData({ postalCode: e.target.value })}
            placeholder="123 45"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">{t("projects.city")}</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => updateFormData({ city: e.target.value })}
            placeholder={t("projects.cityPlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}
