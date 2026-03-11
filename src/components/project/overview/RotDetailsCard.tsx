import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RotReadinessCardProps {
  personnummer?: string | null;
  propertyAddress?: string | null;
  propertyDesignation?: string | null;
  isHomeowner?: boolean;
  hasClient?: boolean;
  dismissed?: boolean;
  onDismiss?: () => void;
  onOpenSettings?: () => void;
  onNavigateToProfile?: () => void;
}

function maskPersonnummer(pnr: string): string {
  const parts = pnr.split("-");
  if (parts.length === 2) {
    return "********-" + parts[1];
  }
  if (pnr.length > 4) {
    return "*".repeat(pnr.length - 4) + pnr.slice(-4);
  }
  return pnr;
}

interface CheckItemProps {
  label: string;
  value?: string | null;
  ok: boolean;
  masked?: boolean;
  onClick?: () => void;
}

function CheckItem({ label, value, ok, masked, onClick }: CheckItemProps) {
  const content = (
    <>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className={ok ? "text-muted-foreground" : ""}>{label}</span>
      {ok && value && (
        <span className="ml-auto text-xs text-muted-foreground font-mono truncate max-w-[180px]">
          {masked ? maskPersonnummer(value) : value}
        </span>
      )}
    </>
  );

  if (!ok && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 text-sm hover:underline text-amber-700 dark:text-amber-400 cursor-pointer text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">{content}</div>
  );
}

export function RotDetailsCard({
  personnummer,
  propertyAddress,
  propertyDesignation,
  isHomeowner = false,
  hasClient = false,
  dismissed = false,
  onDismiss,
  onOpenSettings,
  onNavigateToProfile,
}: RotReadinessCardProps) {
  const { t } = useTranslation();

  const hasPersonnummer = !!personnummer;
  const hasAddress = !!propertyAddress;
  const hasDesignation = !!propertyDesignation;
  const allReady = hasPersonnummer && hasDesignation;
  const nothingStarted = !hasPersonnummer && !hasDesignation && !hasAddress;

  // Builder with no client yet — don't show
  if (!isHomeowner && !hasClient && nothingStarted) return null;

  // Dismissed by user — don't show (but still show if all ready as positive feedback)
  if (dismissed && !allReady) return null;

  const borderClass = allReady
    ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
    : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20";

  return (
    <div className={`relative rounded-lg border ${borderClass} px-4 py-3 space-y-2`}>
      <div className="flex items-center gap-2">
        {allReady ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1">
          {allReady
            ? t("rot.readiness.ready", "ROT deduction — ready")
            : t("rot.readiness.incomplete", "ROT deduction — details missing")}
        </span>
        {!allReady && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5 pl-6">
        <CheckItem
          label={t("rot.customerPersonnummer")}
          value={personnummer}
          ok={hasPersonnummer}
          masked
          onClick={isHomeowner ? onNavigateToProfile : undefined}
        />
        <CheckItem
          label={t("rot.propertyDesignation")}
          value={propertyDesignation}
          ok={hasDesignation}
          onClick={isHomeowner ? onOpenSettings : undefined}
        />
        {hasAddress && (
          <CheckItem
            label={t("rot.propertyAddress")}
            value={propertyAddress}
            ok
          />
        )}
      </div>

      {/* Builder hint when items are missing */}
      {!allReady && !isHomeowner && (
        <p className="pl-6 pt-1 text-xs text-amber-700 dark:text-amber-400">
          {hasClient
            ? t("rot.readiness.builderAskClient", "Ask your customer to fill in the missing details")
            : t("rot.readiness.builderInviteClient", "Invite the homeowner to the project to collect ROT details")}
        </p>
      )}
    </div>
  );
}
