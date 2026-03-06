import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Wrench, ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoViewRole } from "@/hooks/useDemoPreferences";

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

type Step = "language" | "role";

interface DemoRoleModalProps {
  open: boolean;
  onComplete: (role: DemoViewRole, language: string) => void;
  onDismiss: () => void;
}

export function DemoRoleModal({ open, onComplete, onDismiss }: DemoRoleModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>("language");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const selectedInAdditional = ADDITIONAL_LANGUAGES.some((l) => l.code === selectedLanguage);

  const handleLanguageContinue = async () => {
    if (!selectedLanguage) return;
    await i18n.changeLanguage(selectedLanguage);
    setStep("role");
  };

  const handleRoleSelect = (role: DemoViewRole) => {
    onComplete(role, selectedLanguage);
  };

  const userTypes: { type: DemoViewRole; icon: typeof Home; labelKey: string; descKey: string }[] = [
    { type: "homeowner", icon: Home, labelKey: "welcome.homeowner", descKey: "welcome.homeownerDesc" },
    { type: "contractor", icon: Wrench, labelKey: "welcome.contractor", descKey: "welcome.contractorDesc" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-lg">
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
                  <span className="text-sm sm:text-xs font-medium leading-tight text-center">{lang.native}</span>
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

            <Button onClick={handleLanguageContinue} disabled={!selectedLanguage} className="w-full mt-2" size="lg">
              {t("welcome.continue", "Continue")}
            </Button>
          </>
        )}

        {step === "role" && (
          <>
            <DialogHeader className="text-center pb-2">
              <div className="flex items-center mb-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("language")} className="gap-1 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <DialogTitle className="text-2xl font-semibold">
                {t("demo.roleModal.title", "How would you like to explore?")}
              </DialogTitle>
              <DialogDescription className="text-base">
                {t("demo.roleModal.subtitle", "Choose your perspective to see the demo")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 py-4">
              {userTypes.map(({ type, icon: Icon, labelKey, descKey }) => (
                <button
                  key={type}
                  onClick={() => handleRoleSelect(type)}
                  className={cn(
                    "flex items-center sm:flex-col gap-4 sm:gap-3 p-4 sm:p-6 rounded-xl border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98]",
                    "border-border"
                  )}
                >
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                  </div>
                  <div className="text-left sm:text-center flex-1">
                    <p className="font-medium text-base">{t(labelKey)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">{t(descKey)}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
