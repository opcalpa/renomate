import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "beta-banner-dismissed";

export function BetaBanner() {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm py-2 px-4">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{t("beta.title", "Beta")}</strong>
            {" — "}
            {t("beta.message", "This is a beta version. We recommend regularly exporting your data.")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
