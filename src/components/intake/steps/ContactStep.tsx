import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";
import type { IntakeFormData } from "../IntakeWizard";

interface ContactStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
}

export function ContactStep({ formData, updateFormData }: ContactStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">{t("intake.step1Title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("intake.subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="customerName" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {t("intake.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => updateFormData({ customerName: e.target.value })}
            placeholder={t("intake.namePlaceholder")}
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="customerEmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t("intake.email")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => updateFormData({ customerEmail: e.target.value })}
            placeholder={t("intake.emailPlaceholder")}
            autoComplete="email"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="customerPhone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {t("intake.phone")}
          </Label>
          <Input
            id="customerPhone"
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => updateFormData({ customerPhone: e.target.value })}
            placeholder={t("intake.phonePlaceholder")}
            autoComplete="tel"
          />
        </div>
      </div>
    </div>
  );
}
