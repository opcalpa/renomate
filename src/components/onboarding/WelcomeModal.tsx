import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Loader2, ArrowLeft, ChevronDown, Plus, FileText, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

type UserType = "homeowner" | "contractor";
type Step = "language" | "userType" | "getStarted";
export type QuickStartChoice = "blank" | "import" | "explore";

// Primary languages shown by default (most common in Nordic construction)
const PRIMARY_LANGUAGES = [
  { code: "sv", native: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "en", native: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "pl", native: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "uk", native: "Українська", flag: "\u{1F1FA}\u{1F1E6}" },
];

// Additional languages shown when expanded
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
  profileId: string;
  onComplete: (userType: UserType, quickStart?: QuickStartChoice) => void;
}

export function WelcomeModal({ open, profileId, onComplete }: WelcomeModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>("language");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // Track when onboarding modal opens
  useEffect(() => {
    if (open) {
      analytics.capture(AnalyticsEvents.ONBOARDING_STARTED);
    }
  }, [open]);

  // Determine which languages to show
  const visibleLanguages = showAllLanguages ? ALL_LANGUAGES : PRIMARY_LANGUAGES;

  // Check if selected language is in additional languages (auto-expand if so)
  const selectedInAdditional = ADDITIONAL_LANGUAGES.some(l => l.code === selectedLanguage);

  const handleLanguageContinue = async () => {
    if (!selectedLanguage) return;

    await i18n.changeLanguage(selectedLanguage);

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
    setStep("userType");
  };

  const handleUserTypeContinue = async () => {
    if (!selectedType || !profileId) return;

    setSaving(true);
    try {
      // Save user type but don't mark onboarding as complete yet
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_user_type: selectedType,
        })
        .eq("id", profileId);

      if (error) throw error;

      analytics.capture(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step: "user_type",
        user_type: selectedType,
      });

      // Move to quick start step
      setStep("getStarted");
    } catch (error) {
      console.error("Error saving user type:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStartChoice = async (choice: QuickStartChoice) => {
    if (!profileId) return;

    setSaving(true);
    try {
      // Now mark onboarding as complete
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_welcome_completed: true,
        })
        .eq("id", profileId);

      if (error) throw error;

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

  const userTypes: { type: UserType; icon: typeof Home; labelKey: string; descKey: string }[] = [
    {
      type: "homeowner",
      icon: Home,
      labelKey: "welcome.homeowner",
      descKey: "welcome.homeownerDesc",
    },
    {
      type: "contractor",
      icon: Wrench,
      labelKey: "welcome.contractor",
      descKey: "welcome.contractorDesc",
    },
  ];

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === "language" && (
          <>
            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-2xl font-semibold">
                {t("welcome.chooseLanguage", "Choose your language")}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
              {(showAllLanguages || selectedInAdditional ? ALL_LANGUAGES : PRIMARY_LANGUAGES).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 sm:p-3 rounded-xl border-2 transition-all min-h-[80px]",
                    "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                    selectedLanguage === lang.code
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <span className="text-3xl sm:text-2xl">{lang.flag}</span>
                  <span className="text-sm sm:text-xs font-medium leading-tight text-center">
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>

            {!showAllLanguages && !selectedInAdditional && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllLanguages(true)}
                className="w-full text-muted-foreground"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {t("welcome.moreLanguages", "+6 more languages")}
              </Button>
            )}

            <Button
              onClick={handleLanguageContinue}
              disabled={!selectedLanguage}
              className="w-full mt-2"
              size="lg"
            >
              {t("welcome.continue", "Continue")}
            </Button>
          </>
        )}

        {step === "userType" && (
          <>
            <DialogHeader className="text-center pb-2">
              <div className="flex items-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("language")}
                  className="gap-1 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <DialogTitle className="text-2xl font-semibold">
                {t("welcome.title")}
              </DialogTitle>
              <DialogDescription className="text-base">
                {t("welcome.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 py-4">
              {userTypes.map(({ type, icon: Icon, labelKey, descKey }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex items-center sm:flex-col gap-4 sm:gap-3 p-4 sm:p-6 rounded-xl border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                    selectedType === type
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <div
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center flex-shrink-0",
                      selectedType === type ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 sm:h-7 sm:w-7",
                        selectedType === type ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="text-left sm:text-center flex-1">
                    <p className="font-medium text-base">{t(labelKey)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">{t(descKey)}</p>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleUserTypeContinue}
              disabled={!selectedType || saving}
              className="w-full mt-2"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving")}
                </>
              ) : (
                t("welcome.continue")
              )}
            </Button>
          </>
        )}

        {step === "getStarted" && (
          <>
            {/* Get Started step */}
            <DialogHeader className="text-center pb-2">
              <div className="flex items-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("userType")}
                  className="gap-1 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <DialogTitle className="text-2xl font-semibold">
                {t("welcome.getStartedTitle", "How would you like to start?")}
              </DialogTitle>
              <DialogDescription className="text-base">
                {t("welcome.getStartedSubtitle", "Choose the best way to begin your first project")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-4">
              {/* Create blank project */}
              <button
                onClick={() => handleQuickStartChoice("blank")}
                disabled={saving}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                  "border-border"
                )}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-base">{t("welcome.createBlankProject", "Create new project")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("welcome.createBlankProjectDesc", "Start fresh and add rooms & tasks manually")}
                  </p>
                </div>
              </button>

              {/* Import from document */}
              <button
                onClick={() => handleQuickStartChoice("import")}
                disabled={saving}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                  "border-border"
                )}
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-base">{t("welcome.importFromDocument", "Import from document")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("welcome.importFromDocumentDesc", "Upload a PDF or text file and let AI create rooms & tasks")}
                  </p>
                </div>
              </button>

              {/* Explore first */}
              <button
                onClick={() => handleQuickStartChoice("explore")}
                disabled={saving}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                  "border-border"
                )}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-base">{t("welcome.exploreFirst", "Explore first")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("welcome.exploreFirstDesc", "Check out the example project to learn how it works")}
                  </p>
                </div>
              </button>
            </div>

            {saving && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeModal;
