import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Loader2, ArrowLeft, ChevronDown, FileText, Eye, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type UserType = "homeowner" | "contractor";
type Step = "language" | "measurement" | "userType" | "getStarted";
export type QuickStartChoice = "guided" | "import" | "blank" | "explore";

const PRIMARY_LANGUAGES = [
  { code: "sv", native: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "en", native: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "pl", native: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "uk", native: "Українська", flag: "\u{1F1FA}\u{1F1E6}" },
];

const ADDITIONAL_LANGUAGES = [
  { code: "de", native: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "fr", native: "Français", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", native: "Español", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "ro", native: "Română", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "lt", native: "Lietuvių", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "et", native: "Eesti", flag: "\u{1F1EA}\u{1F1EA}" },
];

const ALL_LANGUAGES = [...PRIMARY_LANGUAGES, ...ADDITIONAL_LANGUAGES];

interface WelcomeModalProps {
  open: boolean;
  profileId?: string | null;
  onComplete: (userType: UserType, quickStart?: QuickStartChoice) => void;
}

export function WelcomeModal({ open, profileId, onComplete }: WelcomeModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>("language");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<'metric' | 'imperial'>('metric');
  const [saving, setSaving] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // Pre-fill user type from guest selection (avoids asking twice)
  useEffect(() => {
    if (!profileId) {
      const guestType = localStorage.getItem("guest_user_type") as UserType | null;
      if (guestType) setSelectedType(guestType);
    }
  }, [profileId]);

  useEffect(() => {
    if (open) {
      analytics.capture(AnalyticsEvents.ONBOARDING_STARTED);
    }
  }, [open]);

  const selectedInAdditional = ADDITIONAL_LANGUAGES.some(l => l.code === selectedLanguage);
  const hasPreselectedType = !profileId && !!localStorage.getItem("guest_user_type");

  const handleLanguageContinue = async () => {
    if (!selectedLanguage) return;

    await i18n.changeLanguage(selectedLanguage);
    localStorage.setItem("i18nextLng", selectedLanguage);

    if (profileId) {
      try {
        await supabase
          .from("profiles")
          .update({ language_preference: selectedLanguage })
          .eq("id", profileId);
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    }

    analytics.capture(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
      step: "language",
      language: selectedLanguage,
    });

    if (selectedLanguage === "en") {
      setSelectedMeasurement(/^en-(US|LR|MM)$/i.test(navigator.language) ? "imperial" : "metric");
      setStep("measurement");
    } else if (hasPreselectedType) {
      setStep("getStarted");
    } else {
      setStep("userType");
    }
  };

  const handleMeasurementContinue = async () => {
    localStorage.setItem("renofine_measurement_system", selectedMeasurement);
    if (profileId) {
      try {
        await supabase
          .from("profiles")
          .update({ measurement_system: selectedMeasurement } as Record<string, unknown>)
          .eq("id", profileId);
      } catch { /* ignore */ }
    }
    if (hasPreselectedType) {
      setStep("getStarted");
    } else {
      setStep("userType");
    }
  };

  const handleUserTypeContinue = async () => {
    if (!selectedType) return;

    setSaving(true);
    try {
      if (profileId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            onboarding_user_type: selectedType,
            ...(selectedType === "contractor" ? { is_professional: true } : {}),
          })
          .eq("id", profileId);

        if (error) throw error;
      } else {
        localStorage.setItem("guest_user_type", selectedType);
      }

      analytics.capture(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step: "user_type",
        user_type: selectedType,
      });

      setStep("getStarted");
    } catch (error) {
      console.error("Error saving user type:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStartChoice = async (choice: QuickStartChoice) => {
    setSaving(true);
    try {
      if (profileId) {
        const { error } = await supabase
          .from("profiles")
          .update({ onboarding_welcome_completed: true })
          .eq("id", profileId);

        if (error) throw error;
      } else {
        localStorage.setItem("guest_onboarding_completed", "true");
      }

      analytics.capture(AnalyticsEvents.ONBOARDING_COMPLETED, {
        user_type: selectedType,
        quick_start_choice: choice,
      });

      onComplete(selectedType!, choice);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setSaving(false);
    }
  };

  const prevStep = (target: Step) => (
    <button
      onClick={() => setStep(target)}
      className="absolute left-0 top-0 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );

  const stepIndicator = (current: number, total: number) => (
    <div className="flex gap-1.5 justify-center mt-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all",
            i === current ? "w-6 bg-[#1F4D3A]" : "w-1.5 bg-border"
          )}
        />
      ))}
    </div>
  );

  const totalSteps = hasPreselectedType ? 2 : 3;
  const currentStepIndex = step === "language" ? 0
    : step === "measurement" ? 0
    : step === "userType" ? 1
    : hasPreselectedType ? 1 : 2;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <img
            src="/brand/svg/mark/rf-mark-green.svg"
            alt="Renofine"
            className="h-12 w-12 mb-4"
          />
          {stepIndicator(currentStepIndex, totalSteps)}
        </div>

        <div className="px-6 pb-6">
          {step === "language" && (
            <>
              <h2 className="font-display text-xl font-normal tracking-tight text-center mb-1">
                {t("welcome.chooseLanguage", "Choose your language")}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {t("welcome.chooseLanguageDesc", "You can change this later in settings")}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(showAllLanguages || selectedInAdditional ? ALL_LANGUAGES : PRIMARY_LANGUAGES).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                      selectedLanguage === lang.code
                        ? "border-[#1F4D3A] bg-[#1F4D3A]/5"
                        : "border-border hover:border-[#1F4D3A]/30"
                    )}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-xs font-medium">{lang.native}</span>
                  </button>
                ))}
              </div>

              {!showAllLanguages && !selectedInAdditional && (
                <button
                  onClick={() => setShowAllLanguages(true)}
                  className="flex items-center justify-center gap-1 w-full mt-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                  {t("welcome.moreLanguages", "+6 more languages")}
                </button>
              )}

              <Button
                onClick={handleLanguageContinue}
                disabled={!selectedLanguage}
                className="w-full mt-4 bg-[#1F4D3A] hover:bg-[#1F4D3A]/90"
                size="lg"
              >
                {t("welcome.continue", "Continue")}
              </Button>
            </>
          )}

          {step === "measurement" && (
            <>
              <div className="relative mb-1">
                {prevStep("language")}
                <h2 className="font-display text-xl font-normal tracking-tight text-center">
                  {t("onboarding.measurementTitle", "Measurement system")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {t("onboarding.measurementDesc", "How do you measure?")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "metric" as const, label: "Metric", sub: "m, cm, m²" },
                  { key: "imperial" as const, label: "Imperial", sub: "ft, in, sq ft" },
                ] as const).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMeasurement(m.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-5 transition-all",
                      selectedMeasurement === m.key
                        ? "border-[#1F4D3A] bg-[#1F4D3A]/5"
                        : "border-border hover:border-[#1F4D3A]/30"
                    )}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.sub}</span>
                  </button>
                ))}
              </div>

              <Button
                className="w-full mt-4 bg-[#1F4D3A] hover:bg-[#1F4D3A]/90"
                size="lg"
                onClick={handleMeasurementContinue}
              >
                {t("common.continue", "Continue")}
              </Button>
            </>
          )}

          {step === "userType" && (
            <>
              <div className="relative mb-1">
                {prevStep("language")}
                <h2 className="font-display text-xl font-normal tracking-tight text-center">
                  {t("welcome.title")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {t("welcome.subtitle")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { type: "homeowner" as UserType, icon: Home, labelKey: "welcome.homeowner", descKey: "welcome.homeownerDesc" },
                  { type: "contractor" as UserType, icon: Wrench, labelKey: "welcome.contractor", descKey: "welcome.contractorDesc" },
                ]).map(({ type, icon: Icon, labelKey, descKey }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-lg border transition-all",
                      selectedType === type
                        ? "border-[#1F4D3A] bg-[#1F4D3A]/5"
                        : "border-border hover:border-[#1F4D3A]/30"
                    )}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        selectedType === type ? "bg-[#1F4D3A]/10" : "bg-muted"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-6 w-6",
                          selectedType === type ? "text-[#1F4D3A]" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{t(labelKey)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t(descKey)}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleUserTypeContinue}
                disabled={!selectedType || saving}
                className="w-full mt-4 bg-[#1F4D3A] hover:bg-[#1F4D3A]/90"
                size="lg"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("welcome.continue")
                )}
              </Button>
            </>
          )}

          {step === "getStarted" && (
            <>
              <div className="relative mb-1">
                {prevStep(hasPreselectedType ? "language" : "userType")}
                <h2 className="font-display text-xl font-normal tracking-tight text-center">
                  {t("welcome.getStartedTitle", "How would you like to start?")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {t("welcome.getStartedSubtitle", "Choose the best way to begin your first project")}
              </p>

              <div className="flex flex-col gap-2.5">
                {([
                  {
                    choice: "guided" as QuickStartChoice,
                    icon: MessageSquare,
                    labelKey: "welcome.guidedSetup",
                    descKey: "welcome.guidedSetupDesc",
                    recommended: true,
                  },
                  {
                    choice: "import" as QuickStartChoice,
                    icon: FileText,
                    labelKey: "welcome.importDocument",
                    descKey: "welcome.importDocumentDesc",
                    recommended: false,
                  },
                  {
                    choice: "explore" as QuickStartChoice,
                    icon: Eye,
                    labelKey: "welcome.exploreDemo",
                    descKey: "welcome.exploreDemoDesc",
                    recommended: false,
                  },
                ]).map(({ choice, icon: Icon, labelKey, descKey, recommended }) => (
                  <button
                    key={choice}
                    onClick={() => handleQuickStartChoice(choice)}
                    disabled={saving}
                    className={cn(
                      "flex items-center gap-3.5 p-3.5 rounded-lg border transition-all text-left relative",
                      "hover:border-[#1F4D3A]/40 hover:bg-[#1F4D3A]/5 active:scale-[0.99]",
                      recommended ? "border-[#1F4D3A]/30 bg-[#1F4D3A]/5" : "border-border"
                    )}
                  >
                    {recommended && (
                      <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1F4D3A] text-white">
                        {t("welcome.recommended", "Recommended")}
                      </span>
                    )}
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      recommended ? "bg-[#1F4D3A]/10" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", recommended ? "text-[#1F4D3A]" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t(labelKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
                    </div>
                  </button>
                ))}

                <div className="text-center pt-1">
                  <button
                    onClick={() => handleQuickStartChoice("blank")}
                    disabled={saving}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                  >
                    {t("welcome.blankProjectLink", "or start with an empty project")}
                  </button>
                </div>
              </div>

              {saving && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeModal;
