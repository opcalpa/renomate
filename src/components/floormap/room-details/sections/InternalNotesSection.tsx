import { useTranslation } from "react-i18next";
import { HardHat } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RoomFormData } from "../types";

interface InternalNotesSectionProps {
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
}

export function InternalNotesSection({ formData, updateFormData }: InternalNotesSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-slate-200 rounded-md">
          <HardHat className="h-4 w-4 text-slate-600" />
        </div>
        <Label className="text-sm font-medium text-slate-700">
          {t("rooms.internalNotes", "Interna anteckningar")}
        </Label>
      </div>

      <Textarea
        value={formData.notes || ""}
        onChange={(e) => updateFormData({ notes: e.target.value })}
        placeholder={t(
          "rooms.internalNotesPlaceholder",
          "Egna anteckningar för byggare/projektledare. T.ex. \"OBS! Asbest bakom kakel. Väntar på elritning från kund.\""
        )}
        rows={3}
        className="resize-none bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
      />

      {!formData.notes && (
        <p className="text-xs text-slate-500">
          {t(
            "rooms.internalNotesHint",
            "Dessa anteckningar syns endast för projektteamet, inte för kunden."
          )}
        </p>
      )}
    </div>
  );
}
