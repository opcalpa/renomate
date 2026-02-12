import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, FileText, ExternalLink } from "lucide-react";
import type { ProjectLockStatus } from "@/services/projectLockService";

interface ProjectLockBannerProps {
  lockStatus: ProjectLockStatus;
  className?: string;
}

export function ProjectLockBanner({ lockStatus, className }: ProjectLockBannerProps) {
  const { t } = useTranslation();

  if (!lockStatus.isLocked) {
    return null;
  }

  return (
    <Alert variant="default" className={className}>
      <Lock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {t("project.lockedForQuote")}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm text-muted-foreground mb-3">
          {t("project.lockedDescription")}
        </p>
        {lockStatus.quote && (
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to={`/quotes/${lockStatus.quote.id}`}>
              <FileText className="h-4 w-4" />
              {t("project.viewQuote")}: {lockStatus.quote.title}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
