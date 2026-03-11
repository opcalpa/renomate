import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RotReadinessCardProps {
  personnummer?: string | null;
  propertyAddress?: string | null;
  propertyDesignation?: string | null;
  isHomeowner?: boolean;
  hasClient?: boolean;
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
}

function CheckItem({ label, value, ok, masked }: CheckItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
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
    </div>
  );
}

export function RotDetailsCard({
  personnummer,
  propertyAddress,
  propertyDesignation,
  isHomeowner = false,
  hasClient = false,
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

  const missingItems: string[] = [];
  if (!hasPersonnummer) missingItems.push(t("rot.readiness.personnummer", "Personnummer"));
  if (!hasDesignation) missingItems.push(t("rot.readiness.designation", "Property designation"));

  return (
    <Card className={allReady ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"}>
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-center gap-2">
          {allReady ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
          <span className="text-sm font-medium">
            {allReady
              ? t("rot.readiness.ready", "ROT deduction — ready")
              : t("rot.readiness.incomplete", "ROT deduction — details missing")}
          </span>
        </div>

        <div className="space-y-1.5 pl-6">
          <CheckItem
            label={t("rot.customerPersonnummer")}
            value={personnummer}
            ok={hasPersonnummer}
            masked
          />
          <CheckItem
            label={t("rot.propertyDesignation")}
            value={propertyDesignation}
            ok={hasDesignation}
          />
          {hasAddress && (
            <CheckItem
              label={t("rot.propertyAddress")}
              value={propertyAddress}
              ok
            />
          )}
        </div>

        {!allReady && (
          <div className="pl-6 pt-1">
            {isHomeowner ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-amber-700 dark:text-amber-400"
                onClick={() => {
                  if (!hasPersonnummer && onNavigateToProfile) {
                    onNavigateToProfile();
                  } else if (!hasDesignation && onOpenSettings) {
                    onOpenSettings();
                  }
                }}
              >
                {!hasPersonnummer
                  ? t("rot.readiness.homeownerAddPersonnummer", "Add your personnummer in profile settings")
                  : t("rot.readiness.homeownerAddDesignation", "Add property designation in project settings")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {hasClient
                  ? t("rot.readiness.builderAskClient", "Ask your customer to fill in the missing details")
                  : t("rot.readiness.builderInviteClient", "Invite the homeowner to the project to collect ROT details")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
