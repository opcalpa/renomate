import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Home, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestRoleModalProps {
  open: boolean;
  onSelect: (role: "homeowner" | "contractor") => void;
  onOpenChange: (open: boolean) => void;
}

export function GuestRoleModal({ open, onSelect, onOpenChange }: GuestRoleModalProps) {
  const { t } = useTranslation();

  const roles = [
    {
      type: "homeowner" as const,
      icon: Home,
      label: t("landing.roleHomeowner", "Homeowner"),
      desc: t("landing.roleHomeownerDesc", "I'm planning a renovation for my home"),
    },
    {
      type: "contractor" as const,
      icon: Wrench,
      label: t("landing.roleContractor", "Professional"),
      desc: t("landing.roleContractorDesc", "I manage renovation projects for clients"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden border-0 shadow-lg">
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <img
            src="/brand/svg/mark/mark-green.svg"
            alt="Renofine"
            className="h-12 w-12 mb-4"
          />
          <h2 className="font-display text-xl font-normal tracking-tight text-center">
            {t("landing.roleTitle", "How will you use Renofine?")}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {t("landing.roleDescription", "We'll customize the experience for you.")}
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-lg border transition-all",
                  "hover:border-[#2F5D4E]/50 hover:bg-[#2F5D4E]/5 active:scale-[0.98]",
                  "border-border"
                )}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
