/**
 * GuestMigrationDialog Component
 * Shown after login when user has guest projects to migrate
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, FolderOpen, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  migrateGuestProjects,
  getGuestProjectsForMigration,
} from "@/services/guestMigrationService";
import { clearAllGuestData, exitGuestMode } from "@/services/guestStorageService";
import type { GuestProject } from "@/types/guest.types";

interface GuestMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onComplete: () => void;
}

export function GuestMigrationDialog({
  open,
  onOpenChange,
  profileId,
  onComplete,
}: GuestMigrationDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projects] = useState<GuestProject[]>(() => getGuestProjectsForMigration());
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    projects.map((p) => p.id)
  );
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleAll = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  };

  const handleMigrate = async () => {
    if (selectedProjectIds.length === 0) {
      handleSkip();
      return;
    }

    setMigrating(true);
    setError(null);

    try {
      const result = await migrateGuestProjects(profileId, selectedProjectIds);

      if (result.success) {
        toast({
          title: t('guest.migrationSuccess', 'Projects migrated successfully'),
          description: t('guest.migrationSuccessDescription', '{{count}} project(s) have been saved to your account.', {
            count: result.migratedProjects,
          }),
        });
        onOpenChange(false);
        onComplete();
      } else if (result.migratedProjects > 0) {
        // Partial success
        toast({
          title: t('guest.migrationPartial', 'Some projects migrated'),
          description: t('guest.migrationPartialDescription', '{{count}} project(s) were migrated. Some errors occurred.', {
            count: result.migratedProjects,
          }),
          variant: "destructive",
        });
        onOpenChange(false);
        onComplete();
      } else {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // Clear guest data without migrating
    clearAllGuestData();
    exitGuestMode();
    onOpenChange(false);
    onComplete();
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('guest.migrationTitle', 'Migrate your projects')}</DialogTitle>
          <DialogDescription>
            {t('guest.migrationDescription', 'You have projects saved locally. Would you like to move them to your account?')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Select all checkbox */}
          <div className="flex items-center gap-3 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedProjectIds.length === projects.length}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              {t('common.selectAll', 'Select all')}
            </label>
          </div>

          {/* Project list */}
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => toggleProject(project.id)}
            >
              <Checkbox
                id={`project-${project.id}`}
                checked={selectedProjectIds.includes(project.id)}
                onCheckedChange={() => toggleProject(project.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{project.name}</span>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {project.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {t('common.created', 'Created')}: {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            {t('guest.skip', 'Skip')}
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('guest.migrating', 'Migrating...')}
              </>
            ) : selectedProjectIds.length === projects.length ? (
              t('guest.migrateAll', 'Migrate all')
            ) : selectedProjectIds.length > 0 ? (
              t('guest.migrateSelected', 'Migrate selected ({{count}})', {
                count: selectedProjectIds.length,
              })
            ) : (
              t('guest.skip', 'Skip')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
