import { useTranslation } from "react-i18next";
import { Link2, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_OPTIONS } from "../constants";
import type { SectionProps } from "../types";

export function SmartDataSection({
  formData,
  updateFormData,
}: SectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Priority */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-600" />
          <Label htmlFor="room-priority">{t("rooms.priority")}</Label>
        </div>
        <Select
          value={formData.priority}
          onValueChange={(value) => updateFormData({ priority: value })}
        >
          <SelectTrigger id="room-priority">
            <SelectValue placeholder={t("rooms.selectPriority", "Select priority")} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Links */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gray-600" />
          <Label htmlFor="links">{t("rooms.links")}</Label>
        </div>
        <Input
          id="links"
          type="url"
          value={formData.links || ""}
          onChange={(e) => updateFormData({ links: e.target.value })}
          placeholder="https://..."
        />
        <p className="text-xs text-gray-500">
          {t("rooms.linksDescription")}
        </p>
      </div>
    </div>
  );
}
