import { useTranslation } from "react-i18next";
import { Home, Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxFretext } from "../fields/ComboboxFretext";
import {
  ROOM_NAME_SUGGESTION_KEYS,
  ROOM_STATUS_OPTIONS,
} from "../constants";
import type { IdentitySectionProps } from "../types";

export function IdentitySection({
  formData,
  updateFormData,
  areaSqm,
}: IdentitySectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Room name with combobox */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-gray-600" />
          <Label htmlFor="room-name">{t('identitySection.roomName')}</Label>
        </div>
        <ComboboxFretext
          id="room-name"
          suggestionKeys={ROOM_NAME_SUGGESTION_KEYS}
          value={formData.name}
          onChange={(value) => updateFormData({ name: value })}
          placeholder={t('identitySection.selectOrType')}
          searchPlaceholder={t('identitySection.searchOrType')}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="room-status">{t('rooms.status')}</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => updateFormData({ status: value })}
        >
          <SelectTrigger id="room-status">
            <SelectValue placeholder={t('identitySection.selectStatus')} />
          </SelectTrigger>
          <SelectContent>
            {ROOM_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Area (read-only) */}
      {areaSqm !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-gray-600" />
            <Label>{t('rooms.area')}</Label>
          </div>
          <div className="h-10 flex items-center px-3 bg-gray-50 border rounded-md">
            <span className="font-semibold text-blue-600">
              {areaSqm.toFixed(2)} m²
            </span>
          </div>
        </div>
      )}

      {/* Ceiling height */}
      <div className="space-y-2">
        <Label htmlFor="ceiling-height">{t('identitySection.ceilingHeight')}</Label>
        <Input
          id="ceiling-height"
          type="number"
          min={1000}
          max={10000}
          step={100}
          value={formData.ceiling_height_mm}
          onChange={(e) =>
            updateFormData({ ceiling_height_mm: parseInt(e.target.value) || 2400 })
          }
        />
      </div>
    </div>
  );
}
