import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface RotDetailsCardProps {
  personnummer?: string | null;
  propertyAddress?: string | null;
  propertyDesignation?: string | null;
}

function maskPersonnummer(pnr: string): string {
  // Show format like ********-1234 (mask everything except last 4)
  const parts = pnr.split("-");
  if (parts.length === 2) {
    return "********-" + parts[1];
  }
  // Fallback: mask all but last 4 chars
  if (pnr.length > 4) {
    return "*".repeat(pnr.length - 4) + pnr.slice(-4);
  }
  return pnr;
}

export function RotDetailsCard({
  personnummer,
  propertyAddress,
  propertyDesignation,
}: RotDetailsCardProps) {
  const { t } = useTranslation();

  // Don't render if no ROT data exists
  if (!personnummer && !propertyDesignation) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("rot.cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {personnummer && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("rot.customerPersonnummer")}
            </span>
            <span className="font-mono" title={t("rot.masked")}>
              {maskPersonnummer(personnummer)}
            </span>
          </div>
        )}
        {propertyAddress && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("rot.propertyAddress")}
            </span>
            <span>{propertyAddress}</span>
          </div>
        )}
        {propertyDesignation && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("rot.propertyDesignation")}
            </span>
            <span>{propertyDesignation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
