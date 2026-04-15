import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { IntakeFormData } from "../IntakeWizard";
import type { PropertyType } from "@/services/intakeService";
import { Home, Building2, TreePine, MapPin } from "lucide-react";

interface DescribeStepProps {
  formData: IntakeFormData;
  updateFormData: (updates: Partial<IntakeFormData>) => void;
  onAnalyze: () => void;
  analyzing: boolean;
}

const PROPERTY_TYPES: Array<{ value: PropertyType; icon: React.ReactNode; labelKey: string }> = [
  { value: "villa", icon: <Home className="h-5 w-5" />, labelKey: "intake.villa" },
  { value: "lagenhet", icon: <Building2 className="h-5 w-5" />, labelKey: "intake.lagenhet" },
  { value: "radhus", icon: <Home className="h-5 w-5" />, labelKey: "intake.radhus" },
  { value: "fritidshus", icon: <TreePine className="h-5 w-5" />, labelKey: "intake.fritidshus" },
  { value: "annat", icon: <MapPin className="h-5 w-5" />, labelKey: "intake.annat" },
];

export function DescribeStep({ formData, updateFormData, onAnalyze, analyzing }: DescribeStepProps) {
  const { t } = useTranslation();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const hasSpeech = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const toggleVoice = useCallback(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as unknown as Record<string, unknown>).webkitSpeechRecognition || (window as unknown as Record<string, unknown>).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new (SpeechRecognition as new () => SpeechRecognition)();
    recognition.lang = "sv-SE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      updateFormData({ description: formData.description + " " + transcript });
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, formData.description, updateFormData]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {t("intake.describeTitle", "Tell us about your renovation")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("intake.describeSubtitle", "Describe in your own words what you want done. Our AI will help organize your wishes.")}
        </p>
      </div>

      {/* Free-text description */}
      <div className="relative">
        <textarea
          className="w-full min-h-[160px] px-4 py-3 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
          placeholder={t(
            "intake.describePlaceholder",
            "e.g. We want to renovate the bathroom — new tiles, new faucets and a walk-in shower. The kitchen needs new cabinet fronts and countertop. We'd also like to repaint the entire apartment..."
          )}
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          disabled={analyzing}
        />
        {hasSpeech && (
          <button
            type="button"
            className={`absolute bottom-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
            }`}
            onClick={toggleVoice}
            title={t("intake.voiceInput", "Voice input")}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Property type */}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("intake.propertyType")}</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateFormData({ propertyType: type.value })}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all text-xs font-medium",
                "hover:border-primary/50 hover:bg-accent/50",
                formData.propertyType === type.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-muted text-muted-foreground"
              )}
            >
              {type.icon}
              <span>{t(type.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Total area */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t("intake.totalArea", "Total area")}</p>
          <p className="text-xs text-muted-foreground">{t("intake.totalAreaHint", "Approximate living area in square meters")}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            className="w-20 h-8 px-2 text-sm text-right rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
            placeholder="—"
            value={formData.totalAreaSqm ?? ""}
            onChange={(e) => updateFormData({ totalAreaSqm: e.target.value ? parseFloat(e.target.value) : undefined })}
            step="1"
            min="0"
          />
          <span className="text-sm text-muted-foreground">m²</span>
        </div>
      </div>

      {/* AI analyze button */}
      {formData.description.length > 10 && (
        <Button
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={onAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {analyzing
            ? t("intake.analyzing", "Analyzing...")
            : t("intake.analyzeButton", "Analyze with AI")}
        </Button>
      )}

      {/* AI results summary */}
      {formData.aiParsed && (
        <div className="rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            {t("intake.aiFoundTitle", "AI found:")}
          </p>
          <p>
            {formData.aiParsed.rooms.length} {t("intake.aiRooms", "rooms")},{" "}
            {formData.aiParsed.globalWorkTypes.length +
              formData.aiParsed.rooms.reduce((s, r) => s + r.suggestedWorkTypes.length, 0)}{" "}
            {t("intake.aiWorkTypes", "work types")}
          </p>
        </div>
      )}
    </div>
  );
}
