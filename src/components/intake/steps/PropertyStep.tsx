import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Building2, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "../IntakeWizard";
import type { PropertyType } from "@/services/intakeService";

interface PropertyStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
}

const PROPERTY_TYPES: Array<{ value: PropertyType; icon: React.ReactNode; labelKey: string }> = [
  { value: "villa", icon: <Home className="h-6 w-6" />, labelKey: "intake.villa" },
  { value: "lagenhet", icon: <Building2 className="h-6 w-6" />, labelKey: "intake.lagenhet" },
  { value: "radhus", icon: <Home className="h-6 w-6" />, labelKey: "intake.radhus" },
  { value: "fritidshus", icon: <TreePine className="h-6 w-6" />, labelKey: "intake.fritidshus" },
  { value: "annat", icon: <MapPin className="h-6 w-6" />, labelKey: "intake.annat" },
];

export function PropertyStep({ formData, updateFormData }: PropertyStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t("intake.step2Title")}</h2>
      </div>

      <div className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="propertyAddress" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t("intake.address")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="propertyAddress"
            value={formData.propertyAddress}
            onChange={(e) => updateFormData({ propertyAddress: e.target.value })}
            placeholder={t("intake.addressPlaceholder")}
            autoComplete="street-address"
          />
        </div>

        {/* Postal code and City */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="propertyPostalCode">{t("intake.postalCode")}</Label>
            <Input
              id="propertyPostalCode"
              value={formData.propertyPostalCode}
              onChange={(e) => updateFormData({ propertyPostalCode: e.target.value })}
              placeholder={t("intake.postalCodePlaceholder")}
              autoComplete="postal-code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyCity">{t("intake.city")}</Label>
            <Input
              id="propertyCity"
              value={formData.propertyCity}
              onChange={(e) => updateFormData({ propertyCity: e.target.value })}
              placeholder={t("intake.cityPlaceholder")}
              autoComplete="address-level2"
            />
          </div>
        </div>

        {/* Property Type */}
        <div className="space-y-3">
          <Label>{t("intake.propertyType")}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateFormData({ propertyType: type.value })}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                  "hover:border-primary/50 hover:bg-accent/50",
                  formData.propertyType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-muted"
                )}
              >
                <div
                  className={cn(
                    "text-muted-foreground",
                    formData.propertyType === type.value && "text-primary"
                  )}
                >
                  {type.icon}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    formData.propertyType === type.value && "text-primary"
                  )}
                >
                  {t(type.labelKey)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
