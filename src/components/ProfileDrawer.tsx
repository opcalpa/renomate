import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const ProfileContent = lazy(() =>
  import("@/pages/Profile").then((m) => ({ default: m.ProfileContent }))
);

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDrawer({ open, onOpenChange }: ProfileDrawerProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("profile.title", "Profilinställningar")}</SheetTitle>
          <SheetDescription>
            {t("profile.description", "Hantera dina kontoinställningar och preferenser")}
          </SheetDescription>
        </SheetHeader>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          {open && <ProfileContent />}
        </Suspense>
      </SheetContent>
    </Sheet>
  );
}
