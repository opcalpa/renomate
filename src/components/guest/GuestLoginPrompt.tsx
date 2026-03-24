import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Lock } from "lucide-react";

interface GuestLoginPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the user was trying to do — shown in the description */
  action?: "activate" | "share_rfq" | "save_quote" | "save_project";
  /** Project ID to redirect back to after login */
  projectId?: string;
}

export function GuestLoginPrompt({
  open,
  onOpenChange,
  action = "save_project",
  projectId,
}: GuestLoginPromptProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actionTexts: Record<string, { title: string; desc: string }> = {
    activate: {
      title: t("guest.loginToActivate", "Sign in to activate your project"),
      desc: t("guest.loginToActivateDesc", "Create a free account to activate your project and start collaborating with your team."),
    },
    share_rfq: {
      title: t("guest.loginToShare", "Sign in to share your renovation plan"),
      desc: t("guest.loginToShareDesc", "Create a free account to send your renovation plan to contractors and get quotes."),
    },
    save_quote: {
      title: t("guest.loginToSaveQuote", "Sign in to save your quote"),
      desc: t("guest.loginToSaveQuoteDesc", "Create a free account to save, send, and track your quotes."),
    },
    save_project: {
      title: t("guest.loginToSave", "Sign in to save your project"),
      desc: t("guest.loginToSaveDesc", "Create a free account to save your project and access it from any device."),
    },
  };

  const { title, desc } = actionTexts[action] || actionTexts.save_project;

  const redirectPath = projectId ? `/projects/${projectId}` : "/start";

  const handleAuth = (mode: "signin" | "signup") => {
    onOpenChange(false);
    navigate(`/auth?redirect=${encodeURIComponent(redirectPath)}${mode === "signup" ? "&mode=signup" : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {desc}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button className="w-full gap-2" onClick={() => handleAuth("signup")}>
            <UserPlus className="h-4 w-4" />
            {t("guest.createAccount", "Create free account")}
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => handleAuth("signin")}>
            <LogIn className="h-4 w-4" />
            {t("guest.signIn", "I already have an account")}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-1">
          {t("guest.dataKept", "Your planning data will be saved to your account.")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
