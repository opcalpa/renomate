import { useTranslation } from "react-i18next";
import { MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeStatus, STATUS_META } from "@/lib/projectStatus";
import type { OverviewProject } from "./types";

interface ProjectHeaderProps {
  project: OverviewProject;
  onOpenSettings?: () => void;
}

export function ProjectHeader({ project, onOpenSettings }: ProjectHeaderProps) {
  const { t } = useTranslation();
  const status = normalizeStatus(project.status);
  const meta = STATUS_META[status];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-lg font-semibold leading-tight">{project.name}</h1>
        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onOpenSettings}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}
        >
          {t(meta.labelKey)}
        </span>
      </div>

      {(project.address || project.description) && (
        <div className="flex flex-col gap-0.5">
          {project.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.address}
            </p>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
