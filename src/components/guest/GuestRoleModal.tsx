import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Home, Building2 } from "lucide-react";

interface GuestRoleModalProps {
  open: boolean;
  onSelect: (role: "homeowner" | "contractor") => void;
  onOpenChange: (open: boolean) => void;
}

export function GuestRoleModal({ open, onSelect, onOpenChange }: GuestRoleModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("landing.roleTitle", "How will you use Renomate?")}</DialogTitle>
          <DialogDescription>
            {t("landing.roleDescription", "We'll customize the experience for you.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 pt-2">
          <button
            onClick={() => onSelect("homeowner")}
            className="flex items-center gap-4 p-4 min-h-[72px] rounded-xl border-2 border-transparent bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
              <Home className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold">{t("landing.roleHomeowner", "Homeowner")}</p>
              <p className="text-sm text-muted-foreground">
                {t("landing.roleHomeownerDesc", "I'm planning a renovation for my home")}
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelect("contractor")}
            className="flex items-center gap-4 p-4 min-h-[72px] rounded-xl border-2 border-transparent bg-blue-50 hover:border-blue-300 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">{t("landing.roleContractor", "Professional")}</p>
              <p className="text-sm text-muted-foreground">
                {t("landing.roleContractorDesc", "I manage renovation projects for clients")}
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
