import { useTranslation } from "react-i18next";
import { MessageSquareText, Lightbulb } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RoomFormData } from "../types";

interface VisionSectionProps {
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
}

export function VisionSection({ formData, updateFormData }: VisionSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-amber-100 rounded-md">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <Label className="text-sm font-medium text-amber-900">
          {t("rooms.visionTitle", "Vad vill du göra i detta rum?")}
        </Label>
      </div>

      <Textarea
        value={formData.description || ""}
        onChange={(e) => updateFormData({ description: e.target.value })}
        placeholder={t(
          "rooms.visionPlaceholder",
          "Beskriv vad du vill göra i detta rum. T.ex. \"Totalrenovering med nytt kök, vit stil med mässingsdetaljer. Vill ha öppen planlösning mot vardagsrummet.\""
        )}
        rows={4}
        className="resize-none bg-white/80 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
      />

      {!formData.description && (
        <div className="flex items-start gap-2 text-xs text-amber-700">
          <MessageSquareText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            {t(
              "rooms.visionHint",
              "Tips: En tydlig beskrivning hjälper hantverkare förstå dina önskemål och ger bättre offerter."
            )}
          </span>
        </div>
      )}
    </div>
  );
}
