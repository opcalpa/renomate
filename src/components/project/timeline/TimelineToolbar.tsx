import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar as CalendarIcon,
  RotateCcw,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  Diamond,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTimelineStore } from "./store";
import type { TimelineTask, TimelineMilestone } from "./types";

interface TimelineToolbarProps {
  projectId: string;
  unscheduledTasks: TimelineTask[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
  onProjectDatesChange: (start: string | null, finish: string | null) => void;
  milestones: TimelineMilestone[];
  onMilestonesChange: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onToday: () => void;
  onShowProject: () => void;
  onTaskClick?: (taskId: string) => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  projectId,
  unscheduledTasks,
  projectStartDate,
  projectFinishDate,
  onProjectDatesChange,
  milestones,
  onMilestonesChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPanLeft,
  onPanRight,
  onToday,
  onShowProject,
  onTaskClick,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-3 py-2 border-b bg-background">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Calendar popover — project dates + milestones */}
        <ProjectDatePopover
          projectId={projectId}
          projectStartDate={projectStartDate}
          projectFinishDate={projectFinishDate}
          unscheduledTasks={unscheduledTasks}
          milestones={milestones}
          onDatesChange={onProjectDatesChange}
          onMilestonesChange={onMilestonesChange}
          onShowProject={onShowProject}
          onTaskClick={onTaskClick}
          t={t}
        />

        {/* Visibility toggles */}
        <VisibilityToggles t={t} />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 border rounded-md p-0.5 ml-2">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-7 w-7">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetZoom}
            className="h-7 w-7"
            title={t("timeline.resetZoom", "Reset zoom")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-0.5 ml-2">
          <Button variant="ghost" size="icon" onClick={onPanLeft} className="h-7 w-7">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday} className="h-7 px-2 text-xs">
            {t("timeline.today", "Today")}
          </Button>
          <Button variant="ghost" size="icon" onClick={onPanRight} className="h-7 w-7">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/** Project dates editor + unscheduled tasks list */
function ProjectDatePopover({
  projectId,
  projectStartDate,
  projectFinishDate,
  unscheduledTasks,
  milestones,
  onDatesChange,
  onMilestonesChange,
  onShowProject,
  onTaskClick,
  t,
}: {
  projectId: string;
  projectStartDate: string | null;
  projectFinishDate: string | null;
  unscheduledTasks: TimelineTask[];
  milestones: TimelineMilestone[];
  onDatesChange: (start: string | null, finish: string | null) => void;
  onMilestonesChange: () => void;
  onShowProject: () => void;
  onTaskClick?: (taskId: string) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<"start" | "finish" | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDate, setNewMsDate] = useState<Date | undefined>(undefined);
  const [showMsCalendar, setShowMsCalendar] = useState(false);

  const saveDate = useCallback(async (field: "start_date" | "finish_goal_date", value: string | null) => {
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ [field]: value })
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast.error(t("common.error", "Error"));
      return;
    }
    const newStart = field === "start_date" ? value : projectStartDate;
    const newFinish = field === "finish_goal_date" ? value : projectFinishDate;
    onDatesChange(newStart, newFinish);
    setEditingField(null);
    toast.success(t("common.saved", "Saved"));
  }, [projectId, projectStartDate, projectFinishDate, onDatesChange, t]);

  const handleShowProject = useCallback(() => {
    onShowProject();
  }, [onShowProject]);

  const saveMilestone = useCallback(async () => {
    if (!newMsTitle.trim() || !newMsDate) return;
    setSaving(true);
    const { error } = await supabase.from("milestones").insert({
      project_id: projectId,
      title: newMsTitle.trim(),
      date: format(newMsDate, "yyyy-MM-dd"),
    });
    setSaving(false);
    if (error) { toast.error(t("common.error", "Error")); return; }
    setNewMsTitle("");
    setNewMsDate(undefined);
    setAddingMilestone(false);
    setShowMsCalendar(false);
    onMilestonesChange();
    toast.success(t("common.saved", "Saved"));
  }, [projectId, newMsTitle, newMsDate, onMilestonesChange, t]);

  const deleteMilestone = useCallback(async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) { toast.error(t("common.error", "Error")); return; }
    onMilestonesChange();
  }, [onMilestonesChange, t]);

  const hasDates = !!projectStartDate || !!projectFinishDate;
  const badgeCount = unscheduledTasks.length + (hasDates ? 0 : 1);

  return (
    <Popover onOpenChange={(open) => { if (!open) setEditingField(null); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 relative">
          <CalendarIcon className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Project dates section */}
        <div className="p-3 border-b space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("timeline.projectDates", "Project dates")}
          </p>

          {/* Start date */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">
              {t("timeline.startDate", "Start")}
            </label>
            {editingField === "start" ? (
              <Calendar
                mode="single"
                selected={projectStartDate ? parseISO(projectStartDate) : undefined}
                onSelect={(date) => saveDate("start_date", date ? format(date, "yyyy-MM-dd") : null)}
                locale={sv}
                className="rounded-md border"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingField("start")}
                disabled={saving}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors text-left"
              >
                <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                {projectStartDate
                  ? format(parseISO(projectStartDate), "d MMM yyyy", { locale: sv })
                  : <span className="text-muted-foreground italic">{t("timeline.setStartDate", "Set start date...")}</span>}
              </button>
            )}
          </div>

          {/* Finish date */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">
              {t("timeline.finishDate", "Goal")}
            </label>
            {editingField === "finish" ? (
              <Calendar
                mode="single"
                selected={projectFinishDate ? parseISO(projectFinishDate) : undefined}
                onSelect={(date) => saveDate("finish_goal_date", date ? format(date, "yyyy-MM-dd") : null)}
                locale={sv}
                className="rounded-md border"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingField("finish")}
                disabled={saving}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors text-left"
              >
                <CalendarIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                {projectFinishDate
                  ? format(parseISO(projectFinishDate), "d MMM yyyy", { locale: sv })
                  : <span className="text-muted-foreground italic">{t("timeline.setFinishDate", "Set goal date...")}</span>}
              </button>
            )}
          </div>

          {/* Show project span button */}
          {hasDates && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleShowProject}
            >
              {t("timeline.showProjectSpan", "Show project period")}
            </Button>
          )}

          {!hasDates && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-md px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              {t("timeline.noDatesWarning", "Set start and goal dates to see project markers on the timeline")}
            </div>
          )}
        </div>

        {/* Milestones section */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {t("timeline.milestones", "Milestones")}
            </p>
            {!addingMilestone && (
              <button
                type="button"
                onClick={() => setAddingMilestone(true)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                {t("common.add", "Add")}
              </button>
            )}
          </div>

          {/* Existing milestones */}
          {milestones.length > 0 && (
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {milestones.map((ms) => (
                <li key={ms.id} className="flex items-center gap-2 text-xs group">
                  <Diamond className="h-3 w-3 shrink-0" style={{ color: ms.color || "#6366f1" }} />
                  <span className="truncate flex-1">{ms.title}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {format(parseISO(ms.date), "d MMM", { locale: sv })}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMilestone(ms.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {milestones.length === 0 && !addingMilestone && (
            <p className="text-[11px] text-muted-foreground italic">
              {t("timeline.noMilestones", "No milestones yet")}
            </p>
          )}

          {/* Add milestone form */}
          {addingMilestone && (
            <div className="space-y-2 pt-1">
              <Input
                placeholder={t("timeline.milestoneTitle", "Title...")}
                value={newMsTitle}
                onChange={(e) => setNewMsTitle(e.target.value)}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Escape") { setAddingMilestone(false); setShowMsCalendar(false); } }}
              />
              {showMsCalendar ? (
                <Calendar
                  mode="single"
                  selected={newMsDate}
                  onSelect={(date) => { setNewMsDate(date); setShowMsCalendar(false); }}
                  locale={sv}
                  className="rounded-md border"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMsCalendar(true)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors text-left"
                >
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  {newMsDate
                    ? format(newMsDate, "d MMM yyyy", { locale: sv })
                    : <span className="text-muted-foreground italic">{t("timeline.pickDate", "Pick date...")}</span>}
                </button>
              )}
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  disabled={!newMsTitle.trim() || !newMsDate || saving}
                  onClick={saveMilestone}
                >
                  {t("common.save", "Save")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAddingMilestone(false); setShowMsCalendar(false); setNewMsTitle(""); setNewMsDate(undefined); }}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Unscheduled tasks section */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("timeline.unscheduledTasksTitle", "Unscheduled tasks")}
          </p>
          {unscheduledTasks.length > 0 ? (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {unscheduledTasks.map((ut) => (
                <li
                  key={ut.id}
                  className="text-sm truncate text-primary hover:underline cursor-pointer"
                  onClick={() => onTaskClick?.(ut.id)}
                >
                  {ut.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("timeline.allScheduled", "All tasks are scheduled")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VisibilityToggles({ t }: { t: (key: string, fallback?: string) => string }) {
  const showTasks = useTimelineStore((s) => s.showTasks);
  const showPhases = useTimelineStore((s) => s.showPhases);
  const showMilestones = useTimelineStore((s) => s.showMilestones);
  const { setShowTasks, setShowPhases, setShowMilestones } = useTimelineStore.getState();

  const allOn = showTasks && showPhases && showMilestones;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 relative">
          <Layers className="h-4 w-4" />
          {!allOn && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="start">
        <div className="space-y-1">
          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-xs">
            <input type="checkbox" checked={showTasks} onChange={() => setShowTasks(!showTasks)} className="rounded" />
            {t("timeline.tasks", "Tasks")}
          </label>
          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-xs">
            <input type="checkbox" checked={showPhases} onChange={() => setShowPhases(!showPhases)} className="rounded" />
            {t("timeline.phases", "Phases")}
          </label>
          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-xs">
            <input type="checkbox" checked={showMilestones} onChange={() => setShowMilestones(!showMilestones)} className="rounded" />
            {t("timeline.milestones", "Milestones")}
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
