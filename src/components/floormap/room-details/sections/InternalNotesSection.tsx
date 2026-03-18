import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import type { RoomFormData } from "../types";

interface InternalNotesSectionProps {
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
}

export function InternalNotesSection({ formData, updateFormData }: InternalNotesSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Textarea
        value={formData.notes || ""}
        onChange={(e) => updateFormData({ notes: e.target.value })}
        placeholder={t(
          "rooms.internalNotesPlaceholder",
          "Egna anteckningar för byggare/projektledare. T.ex. \"OBS! Asbest bakom kakel. Väntar på elritning från kund.\""
        )}
        rows={3}
        className="resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400"
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
