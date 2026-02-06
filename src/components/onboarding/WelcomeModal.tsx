import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Wrench, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type UserType = "homeowner" | "contractor";
type Step = "language" | "userType";

const LANGUAGES = [
  { code: "en", native: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "sv", native: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "de", native: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "fr", native: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", native: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "pl", native: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "uk", native: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "ro", native: "Rom\u00E2n\u0103", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "lt", native: "Lietuvi\u0173", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "et", native: "Eesti", flag: "\u{1F1EA}\u{1F1EA}" },
];

interface WelcomeModalProps {
  open: boolean;
  profileId: string;
  onComplete: (userType: UserType) => void;
}

export function WelcomeModal({ open, profileId, onComplete }: WelcomeModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>("language");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);

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

    setStep("userType");
  };

  const handleUserTypeContinue = async () => {
    if (!selectedType || !profileId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_user_type: selectedType,
          onboarding_welcome_completed: true,
        })
        .eq("id", profileId);

      if (error) throw error;

      onComplete(selectedType);
    } catch (error) {
      console.error("Error saving user type:", error);
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
        {step === "language" ? (
          <>
            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-2xl font-semibold">
                {t("welcome.chooseLanguage", "Choose your language")}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-5 gap-3 py-4">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    selectedLanguage === lang.code
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-xs font-medium leading-tight text-center">
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>

            <Button
              onClick={handleLanguageContinue}
              disabled={!selectedLanguage}
              className="w-full mt-2"
              size="lg"
            >
              {t("welcome.continue", "Continue")}
            </Button>
          </>
        ) : (
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

            <div className="grid grid-cols-2 gap-4 py-4">
              {userTypes.map(({ type, icon: Icon, labelKey, descKey }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    selectedType === type
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <div
                    className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center",
                      selectedType === type ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-7 w-7",
                        selectedType === type ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{t(labelKey)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t(descKey)}</p>
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
      </DialogContent>
    </Dialog>
  );
}
