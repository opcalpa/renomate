import { useTranslation } from "react-i18next";
import { Check, Sparkles } from "lucide-react";
import type { StepProps } from "./types";
import { WHOLE_PROPERTY_KEY } from "./types";

interface TaskPreview {
  label: string;
  scope: string;
}

function buildTaskPreviews(formData: StepProps["formData"]): TaskPreview[] {
  const tasks: TaskPreview[] = [];

  for (const wt of formData.workTypes) {
    const roomIds = formData.matrix[wt.id];
    if (!roomIds?.size) continue;

    if (roomIds.has(WHOLE_PROPERTY_KEY)) {
      tasks.push({ label: wt.label, scope: WHOLE_PROPERTY_KEY });
    } else {
      const roomNames: string[] = [];
      for (const roomId of roomIds) {
        const room = formData.rooms.find((r) => r.id === roomId);
        if (room) roomNames.push(room.name);
      }
      if (roomNames.length > 0) {
        tasks.push({ label: wt.label, scope: roomNames.join(", ") });
      }
    }
  }

  return tasks;
}

export function SummaryStep({ formData }: StepProps) {
  const { t } = useTranslation();

  const taskPreviews = buildTaskPreviews(formData);

  // Count total individual tasks (whole property = 1, per-room = N)
  let totalTaskCount = 0;
  for (const wt of formData.workTypes) {
    const roomIds = formData.matrix[wt.id];
    if (!roomIds?.size) continue;
    if (roomIds.has(WHOLE_PROPERTY_KEY)) {
      totalTaskCount += 1;
    } else {
      totalTaskCount += roomIds.size;
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">
          {t("guidedSetup.readyToCreate")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("guidedSetup.readyToCreateDesc")}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        {/* Project info */}
        <div>
          <p className="text-sm text-muted-foreground">
            {t("guidedSetup.projectName")}
          </p>
          <p className="font-medium">{formData.projectName}</p>
        </div>

        {formData.address && (
          <div>
            <p className="text-sm text-muted-foreground">
              {t("projects.address")}
            </p>
            <p className="font-medium">
              {[formData.address, formData.postalCode, formData.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        {/* Rooms */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {t("guidedSetup.totalRooms")}
          </p>
          <div className="space-y-1">
            {formData.rooms.map((room) => (
              <div key={room.id} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="font-medium">{room.name}</span>
                {(room.width_m && room.depth_m) ? (
                  <span className="text-muted-foreground text-xs">
                    {room.width_m} × {room.depth_m} m ({room.area_sqm} m²)
                  </span>
                ) : room.area_sqm ? (
                  <span className="text-muted-foreground text-xs">
                    {room.area_sqm} m²
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {t("guidedSetup.taskList")}
          </p>
          <div className="space-y-1">
            {taskPreviews.map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="font-medium">{task.label}</span>
                <span className="text-muted-foreground text-xs">
                  {task.scope === WHOLE_PROPERTY_KEY
                    ? `(${t("guidedSetup.wholePropertyLabel")})`
                    : `(${task.scope})`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("guidedSetup.totalTasks")}
            </span>
            <span className="font-medium">
              {totalTaskCount} {t("guidedSetup.tasks")}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("guidedSetup.totalRooms")}
            </span>
            <span className="font-medium">
              {formData.rooms.length} {t("guidedSetup.roomsLabel")}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t("guidedSetup.canEditLater")}
      </p>
    </div>
  );
}
