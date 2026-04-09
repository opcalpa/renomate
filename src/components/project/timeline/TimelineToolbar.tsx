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
  SlidersHorizontal,
  X,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTimelineStore } from "./store";
import type { TimelineTask, TeamMember, GroupByOption } from "./types";

interface TimelineToolbarProps {
  projectId: string;
  projectName?: string;
  dateRangeLabel: string;
  daysVisible: number;
  unscheduledTasks: TimelineTask[];
  teamMembers: TeamMember[];
  groupBy: GroupByOption;
  selectedAssignee: string;
  projectStartDate: string | null;
  projectFinishDate: string | null;
  onProjectDatesChange: (start: string | null, finish: string | null) => void;
  onGroupByChange: (value: GroupByOption) => void;
  onAssigneeChange: (value: string) => void;
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
  projectName,
  dateRangeLabel,
  daysVisible,
  unscheduledTasks,
  teamMembers,
  groupBy,
  selectedAssignee,
  projectStartDate,
  projectFinishDate,
  onProjectDatesChange,
  onGroupByChange,
  onAssigneeChange,
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
  const hasActiveFilters = groupBy !== "none" || selectedAssignee !== "all";

  return (
    <div className="px-3 py-2 border-b bg-background space-y-2">
      {/* Row 1: project name + date range */}
      <div className="flex items-center gap-2 min-w-0">
        {projectName && (
          <span className="text-sm font-medium truncate">
            {projectName}
          </span>
        )}
        {dateRangeLabel && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {dateRangeLabel}
          </span>
        )}
      </div>

      {/* Row 2: controls */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Calendar popover — project dates + unscheduled tasks */}
        <ProjectDatePopover
          projectId={projectId}
          projectStartDate={projectStartDate}
          projectFinishDate={projectFinishDate}
          unscheduledTasks={unscheduledTasks}
          onDatesChange={onProjectDatesChange}
          onShowProject={onShowProject}
          onTaskClick={onTaskClick}
          t={t}
        />

        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters ? "secondary" : "outline"}
              size="icon"
              className="h-8 w-8 relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {t("timeline.filters", "Filters")}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    onGroupByChange("none");
                    onAssigneeChange("all");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  {t("common.clear", "Clear")}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t("timeline.groupBy", "Group by")}
                </label>
                <Select
                  value={groupBy}
                  onValueChange={(v) => onGroupByChange(v as GroupByOption)}
                >
                  <SelectTrigger className="h-9">
                    <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("timeline.noGrouping", "No grouping")}
                    </SelectItem>
                    <SelectItem value="status">
                      {t("timeline.groupByStatus", "Status")}
                    </SelectItem>
                    <SelectItem value="room">
                      {t("timeline.groupByRoom", "Room")}
                    </SelectItem>
                    <SelectItem value="assignee">
                      {t("timeline.groupByAssignee", "Assignee")}
                    </SelectItem>
                    <SelectItem value="priority">
                      {t("timeline.groupByPriority", "Priority")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {t("budget.allAssignees", "Assignee")}
                </label>
                <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("budget.allAssignees", "All")}
                    </SelectItem>
                    <SelectItem value="unassigned">
                      {t("common.unassigned", "Unassigned")}
                    </SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Visibility toggles */}
        <VisibilityToggles t={t} />

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 border rounded-md p-0.5">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[50px] text-center hidden sm:inline">
            {daysVisible} {t("timeline.days", "days")}
          </span>
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

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Navigation */}
        <Button variant="ghost" size="icon" onClick={onPanLeft} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} className="h-8 px-2 text-xs">
          {t("timeline.today", "Today")}
        </Button>
        <Button variant="ghost" size="icon" onClick={onPanRight} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onShowProject} className="h-8 px-2 text-xs">
          {t("timeline.showProject", "Project")}
        </Button>
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
  onDatesChange,
  onShowProject,
  onTaskClick,
  t,
}: {
  projectId: string;
  projectStartDate: string | null;
  projectFinishDate: string | null;
  unscheduledTasks: TimelineTask[];
  onDatesChange: (start: string | null, finish: string | null) => void;
  onShowProject: () => void;
  onTaskClick?: (taskId: string) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<"start" | "finish" | null>(null);

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

  return (
    <div className="flex items-center gap-0.5 border rounded-md p-0.5">
      <Button
        variant={showTasks ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-[10px]"
        onClick={() => setShowTasks(!showTasks)}
      >
        {t("timeline.tasks", "Tasks")}
      </Button>
      <Button
        variant={showPhases ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-[10px]"
        onClick={() => setShowPhases(!showPhases)}
      >
        {t("timeline.phases", "Phases")}
      </Button>
      <Button
        variant={showMilestones ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-[10px]"
        onClick={() => setShowMilestones(!showMilestones)}
      >
        {t("timeline.milestones", "Milestones")}
      </Button>
    </div>
  );
}
