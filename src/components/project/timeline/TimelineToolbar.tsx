import React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  X,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { TimelineTask, TeamMember, GroupByOption } from "./types";

interface TimelineToolbarProps {
  projectName?: string;
  dateRangeLabel: string;
  daysVisible: number;
  unscheduledTasks: TimelineTask[];
  teamMembers: TeamMember[];
  groupBy: GroupByOption;
  selectedAssignee: string;
  onGroupByChange: (value: GroupByOption) => void;
  onAssigneeChange: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onToday: () => void;
  onTaskClick?: (taskId: string) => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  projectName,
  dateRangeLabel,
  daysVisible,
  unscheduledTasks,
  teamMembers,
  groupBy,
  selectedAssignee,
  onGroupByChange,
  onAssigneeChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPanLeft,
  onPanRight,
  onToday,
  onTaskClick,
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = groupBy !== "none" || selectedAssignee !== "all";

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background flex-wrap">
      {/* Left: project name + date range */}
      <div className="flex items-center gap-2 min-w-0">
        {projectName && (
          <span className="text-sm font-medium truncate max-w-[200px]">
            {projectName}
          </span>
        )}
        {dateRangeLabel && (
          <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
            {dateRangeLabel}
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1">
        {/* Calendar popover with unscheduled badge */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 relative">
              <Calendar className="h-4 w-4" />
              {unscheduledTasks.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center">
                  {unscheduledTasks.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            {unscheduledTasks.length > 0 ? (
              <div className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("timeline.unscheduledTasksTitle", "Unscheduled tasks")}
                </p>
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
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">
                {t("projectDetail.noScheduledTasksDescription", "All tasks are scheduled")}
              </div>
            )}
          </PopoverContent>
        </Popover>

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

        <div className="w-px h-5 bg-border mx-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 border rounded-md p-0.5">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[50px] text-center">
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

        <div className="w-px h-5 bg-border mx-1" />

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
      </div>
    </div>
  );
};
