import { useTranslation } from "react-i18next";
import { MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { RoomFormData } from "../types";

interface VisionSectionProps {
  formData: RoomFormData;
  updateFormData: (updates: Partial<RoomFormData>) => void;
}

export function VisionSection({ formData, updateFormData }: VisionSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Textarea
        value={formData.description || ""}
        onChange={(e) => updateFormData({ description: e.target.value })}
        placeholder={t(
          "rooms.visionPlaceholder",
          "Beskriv vad du vill göra i detta rum. T.ex. \"Totalrenovering med nytt kök, vit stil med mässingsdetaljer. Vill ha öppen planlösning mot vardagsrummet.\""
        )}
        rows={4}
        className="resize-none border-amber-200 focus:border-amber-400 focus:ring-amber-400"
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
