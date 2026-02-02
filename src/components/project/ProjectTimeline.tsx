import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Calendar, Loader2, ChevronLeft, ChevronRight, Move } from "lucide-react";
import { getCostCenterIcon } from "@/lib/costCenters";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import TaskSidePanel from "./TaskSidePanel";
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  finish_date: string | null;
  progress: number;
  assigned_to_stakeholder_id: string | null;
  room_id: string | null;
  budget: number | null;
  cost_center: string | null;
  cost_centers?: string[] | null;
}
interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}
interface TeamMember {
  id: string;
  name: string;
}
interface ProjectTimelineProps {
  projectId: string;
  projectName?: string;
  projectStartDate?: string | null;
  projectFinishDate?: string | null;
  onTaskClick?: (taskId: string) => void;
}
type ViewMode = 'daily' | 'weekly' | 'monthly' | 'fullProject';
const ProjectTimeline = ({
  projectId,
  projectName,
  projectStartDate,
  projectFinishDate,
  onTaskClick
}: ProjectTimelineProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [resizingTask, setResizingTask] = useState<Task | null>(null);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  useEffect(() => {
    fetchTasks();
    fetchDependencies();
    fetchTeamMembers();
  }, [projectId]);
  const fetchTasks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("tasks").select("id, title, description, status, priority, start_date, finish_date, progress, assigned_to_stakeholder_id, room_id, budget, cost_center, cost_centers").eq("project_id", projectId).not("start_date", "is", null).not("finish_date", "is", null).order("start_date", {
        ascending: true
      });
      if (error) throw error;
      setTasks(data || []);

      // Count unscheduled tasks
      const { count, error: countError } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .or("start_date.is.null,finish_date.is.null");
      if (!countError) {
        setUnscheduledCount(count || 0);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchDependencies = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("task_dependencies").select("*");
      if (error) throw error;
      setDependencies(data || []);
    } catch (error: any) {
      console.error("Error fetching dependencies:", error);
    }
  };
  const fetchTeamMembers = async () => {
    try {
      // Fetch project owner
      const { data: projectData } = await supabase
        .from("projects")
        .select("owner_id, profiles!projects_owner_id_fkey(id, name)")
        .eq("id", projectId)
        .single();

      const members: TeamMember[] = [];
      if (projectData?.profiles) {
        members.push({ id: (projectData.profiles as any).id, name: (projectData.profiles as any).name });
      }

      // Fetch accepted shares
      const { data: shares } = await supabase
        .from("project_shares")
        .select("shared_with_user_id, profiles!project_shares_shared_with_user_id_fkey(id, name)")
        .eq("project_id", projectId);

      if (shares) {
        const existingIds = new Set(members.map(m => m.id));
        shares.forEach((share: any) => {
          if (share.profiles && !existingIds.has(share.profiles.id)) {
            existingIds.add(share.profiles.id);
            members.push({ id: share.profiles.id, name: share.profiles.name });
          }
        });
      }

      setTeamMembers(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
    }
  };
  const handlePrevious = () => {
    if (viewMode === 'fullProject') return;
    if (viewMode === 'monthly') {
      setCurrentDate(addMonths(currentDate, -1));
    } else if (viewMode === 'weekly') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };
  const handleNext = () => {
    if (viewMode === 'fullProject') return;
    if (viewMode === 'monthly') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    if (viewMode === 'fullProject') {
      setViewMode('monthly');
    }
  };

  // Calculate timeline bounds based on view mode
  const getTimelineBounds = () => {
    let minDate: Date;
    let maxDate: Date;
    if (viewMode === 'fullProject') {
      // Find earliest start date from project or tasks
      const dates: Date[] = [];
      
      // Add project start date if exists
      if (projectStartDate) {
        dates.push(parseISO(projectStartDate));
      }
      
      // Add all task start dates
      tasks.forEach(task => {
        if (task.start_date) {
          dates.push(parseISO(task.start_date));
        }
      });
      
      // Find earliest date
      minDate = dates.length > 0 
        ? new Date(Math.min(...dates.map(d => d.getTime())))
        : startOfMonth(new Date());
      
      // Find latest finish date from project goal or tasks
      const endDates: Date[] = [];
      
      // Add project goal date if exists
      if (projectFinishDate) {
        endDates.push(parseISO(projectFinishDate));
      }
      
      // Add all task finish dates
      tasks.forEach(task => {
        if (task.finish_date) {
          endDates.push(parseISO(task.finish_date));
        }
      });
      
      // Find latest date
      maxDate = endDates.length > 0
        ? new Date(Math.max(...endDates.map(d => d.getTime())))
        : endOfMonth(addMonths(new Date(), 3));
        
    } else if (viewMode === 'monthly') {
      minDate = startOfMonth(currentDate);
      maxDate = endOfMonth(currentDate);
    } else if (viewMode === 'weekly') {
      minDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
      maxDate = endOfWeek(currentDate, { weekStartsOn: 1 }); // Week ends on Sunday
    } else {
      minDate = currentDate;
      maxDate = addDays(currentDate, 1);
    }
    const totalDays = differenceInDays(maxDate, minDate) + 1;
    return {
      minDate,
      maxDate,
      totalDays
    };
  };
  const getTaskPosition = (task: Task, minDate: Date, totalDays: number) => {
    if (!task.start_date || !task.finish_date) return {
      left: 0,
      width: 0
    };
    const startDate = parseISO(task.start_date);
    const finishDate = parseISO(task.finish_date);
    const daysFromStart = differenceInDays(startDate, minDate);
    const taskDuration = differenceInDays(finishDate, startDate) + 1;
    const left = daysFromStart / totalDays * 100;
    const width = taskDuration / totalDays * 100;
    return {
      left,
      width
    };
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/90";
      case "in_progress":
        return "bg-blue-500/90";
      case "waiting":
        return "bg-yellow-500/90";
      default:
        return "bg-slate-400/90";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "in_progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "waiting":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t('statuses.completed');
      case "in_progress":
        return t('statuses.inProgress');
      case "waiting":
        return t('statuses.waiting');
      default:
        return t('statuses.toDo');
    }
  };
  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-destructive";
      case "low":
        return "border-secondary";
      default:
        return "border-border";
    }
  };
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    const target = e.target as HTMLElement;
    const isResizeHandle = target.classList.contains('resize-handle');
    if (isResizeHandle) {
      const side = target.classList.contains('resize-left') ? 'left' : 'right';
      setResizingTask(task);
      setResizeSide(side);
    } else {
      setDraggingTask(task);
    }
    setDragStartX(e.clientX);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggingTask(null);
    setResizingTask(null);
    setResizeSide(null);
    setDragStartX(0);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (resizingTask && resizeSide) {
      await handleResize(e);
    } else if (draggingTask) {
      await handleMove(e);
    }
  };
  const handleMove = async (e: React.DragEvent) => {
    if (!draggingTask) return;
    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const timelineWidth = rect.width;

    // Calculate percentage position
    const percentage = dropX / timelineWidth * 100;

    // Calculate new start date based on position
    const daysFromStart = Math.round(percentage / 100 * totalDays);
    const newStartDate = addDays(minDate, daysFromStart);

    // Calculate duration and new finish date
    const originalStart = parseISO(draggingTask.start_date!);
    const originalFinish = parseISO(draggingTask.finish_date!);
    const duration = differenceInDays(originalFinish, originalStart);
    const newFinishDate = addDays(newStartDate, duration);
    try {
      const {
        error
      } = await supabase.from("tasks").update({
        start_date: format(newStartDate, "yyyy-MM-dd"),
        finish_date: format(newFinishDate, "yyyy-MM-dd")
      }).eq("id", draggingTask.id);
      if (error) throw error;
      toast({
        title: t('timeline.taskRescheduled', 'Task rescheduled'),
        description: `${draggingTask.title} moved to ${format(newStartDate, "MMM d, yyyy")}`
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleResize = async (e: React.DragEvent) => {
    if (!resizingTask || !resizeSide) return;
    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const percentage = dropX / timelineWidth * 100;
    const daysFromStart = Math.round(percentage / 100 * totalDays);
    const newDate = addDays(minDate, daysFromStart);
    const originalStart = parseISO(resizingTask.start_date!);
    const originalFinish = parseISO(resizingTask.finish_date!);
    let newStartDate = originalStart;
    let newFinishDate = originalFinish;
    if (resizeSide === 'left') {
      newStartDate = newDate;
      // Ensure start date is before finish date
      if (newStartDate >= originalFinish) {
        newStartDate = addDays(originalFinish, -1);
      }
    } else {
      newFinishDate = newDate;
      // Ensure finish date is after start date
      if (newFinishDate <= originalStart) {
        newFinishDate = addDays(originalStart, 1);
      }
    }
    try {
      const {
        error
      } = await supabase.from("tasks").update({
        start_date: format(newStartDate, "yyyy-MM-dd"),
        finish_date: format(newFinishDate, "yyyy-MM-dd")
      }).eq("id", resizingTask.id);
      if (error) throw error;
      toast({
        title: t('timeline.taskDurationUpdated', 'Task duration updated'),
        description: `${resizingTask.title} ${resizeSide === 'left' ? 'start' : 'end'} date changed`
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setSidePanelOpen(true);
    onTaskClick?.(task.id);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          start_date: editingTask.start_date,
          finish_date: editingTask.finish_date,
          progress: editingTask.progress,
          assigned_to_stakeholder_id: editingTask.assigned_to_stakeholder_id,
          room_id: editingTask.room_id,
          budget: editingTask.budget,
          cost_center: editingTask.cost_center,
        })
        .eq("id", editingTask.id);

      if (error) throw error;

      toast({
        title: t('timeline.taskUpdated', 'Task updated'),
        description: t('timeline.taskUpdatedDescription', 'Task has been updated successfully'),
      });

      setEditDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  if (loading) {
    return <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  const {
    minDate,
    maxDate,
    totalDays
  } = getTimelineBounds();

  // Generate date markers for the timeline
  const getDateMarkers = () => {
    const markers: Date[] = [];
    let currentMarker = minDate;
    if (viewMode === 'daily') {
      // Show every day
      while (currentMarker <= maxDate) {
        markers.push(currentMarker);
        currentMarker = addDays(currentMarker, 1);
      }
    } else if (viewMode === 'weekly') {
      // Show every 2 days
      while (currentMarker <= maxDate) {
        markers.push(currentMarker);
        currentMarker = addDays(currentMarker, 2);
      }
    } else {
      // Monthly - show every 3-5 days depending on total days
      const interval = Math.ceil(totalDays / 8);
      while (currentMarker <= maxDate) {
        markers.push(currentMarker);
        currentMarker = addDays(currentMarker, interval);
      }
    }
    return markers;
  };
  const dateMarkers = getDateMarkers();

  // Filter tasks that overlap with current view and match assignee filter
  const visibleTasks = tasks.filter(task => {
    if (!task.start_date || !task.finish_date) return false;
    const taskStart = parseISO(task.start_date);
    const taskEnd = parseISO(task.finish_date);
    const inTimeRange = taskStart <= maxDate && taskEnd >= minDate;
    const matchesAssignee = selectedAssignee === "all" || selectedAssignee === "unassigned" && !task.assigned_to_stakeholder_id || task.assigned_to_stakeholder_id === selectedAssignee;
    return inTimeRange && matchesAssignee;
  });
  if (tasks.length === 0) {
    return <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('projectDetail.noScheduledTasks')}</h3>
          <p className="text-muted-foreground">
            {t('projectDetail.noScheduledTasksDescription')}
          </p>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>{projectName || t('projectDetail.timeline')}</CardTitle>
            <CardDescription>
              {format(minDate, "MMM d, yyyy")} - {format(maxDate, "MMM d, yyyy")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('budget.allAssignees')}</SelectItem>
                <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                {teamMembers.map(member => <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={value => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('timeline.daily', 'Daily')}</SelectItem>
                <SelectItem value="weekly">{t('timeline.weekly', 'Weekly')}</SelectItem>
                <SelectItem value="monthly">{t('timeline.monthly', 'Monthly')}</SelectItem>
                <SelectItem value="fullProject">{t('timeline.fullProject', 'Full project')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleToday}>
              {t('timeline.today', 'Today')}
            </Button>
            {viewMode !== 'fullProject' && (
              <>
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-emerald-500/90 shadow-sm border border-emerald-600/20" />
            <span className="text-muted-foreground font-medium">{t('projectDetail.completed')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-blue-500/90 shadow-sm border border-blue-600/20" />
            <span className="text-muted-foreground font-medium">{t('projectDetail.inProgress')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-slate-400/90 shadow-sm border border-slate-500/20" />
            <span className="text-muted-foreground font-medium">{t('projectDetail.toDo')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-yellow-500/90 shadow-sm border border-yellow-600/20" />
            <span className="text-muted-foreground font-medium">{t('statuses.onHold')}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {projectStartDate && (
              <Badge variant="outline">Start: {format(parseISO(projectStartDate), "MMM d, yyyy")}</Badge>
            )}
            {projectFinishDate && (
              <Badge variant="outline">Goal: {format(parseISO(projectFinishDate), "MMM d, yyyy")}</Badge>
            )}
          </div>
        </div>
        {unscheduledCount > 0 && (
          <div className="mt-3">
            <Badge variant="secondary" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {unscheduledCount === 1
                ? t('timeline.unscheduledTasksSingular', '1 unscheduled task')
                : t('timeline.unscheduledTasks', '{{count}} unscheduled tasks', { count: unscheduledCount })}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {visibleTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              {t('timeline.noTasksInPeriod', 'No tasks scheduled in this time period')}
            </div> : <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0"><div className="relative min-w-[600px]">
              {/* Vertical grid lines that span entire timeline - connected to dates */}
              <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
                {Array.from({ length: totalDays + 1 }, (_, i) => {
                  const currentDate = addDays(minDate, i);
                  const isToday = format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                  const left = (i / totalDays) * 100;
                  
                  return (
                    <React.Fragment key={`global-grid-${i}`}>
                      {/* Vertical grid line spanning from date ruler to bottom */}
                      <div
                        className={`absolute ${isToday ? 'w-0.5 bg-primary/30' : 'w-px bg-border/30'}`}
                        style={{ 
                          left: `${left}%`,
                          top: '0',
                          bottom: '0',
                          height: '100%'
                        }}
                      />
                      {/* Weekend shading */}
                      {isWeekend && i < totalDays && (
                        <div
                          className="absolute bg-muted/15 pointer-events-none"
                          style={{ 
                            left: `${left}%`,
                            width: `${100/totalDays}%`,
                            top: '0',
                            bottom: '0',
                            height: '100%'
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                
                {/* Today marker - prominent vertical line */}
                {(() => {
                  const today = new Date();
                  if (today >= minDate && today <= maxDate) {
                    const daysFromStart = differenceInDays(today, minDate);
                    const left = (daysFromStart / totalDays) * 100;
                    return (
                      <div
                        className="absolute w-0.5 bg-primary z-20 pointer-events-none"
                        style={{ 
                          left: `${left}%`,
                          top: '0',
                          bottom: '0',
                          height: '100%'
                        }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Date ruler/timeline axis - Monday.com style */}
              <div className="relative border-b-2 border-border/50 pb-4 mb-6 bg-gradient-to-b from-muted/30 to-transparent">
                <div className="relative h-14 z-10">
                  {dateMarkers.map((date, index) => {
                const daysFromStart = differenceInDays(date, minDate);
                const left = daysFromStart / totalDays * 100;
                const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                return <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`absolute top-0 flex flex-col items-center cursor-help ${isToday ? 'z-20' : ''}`} style={{
                              left: `${left}%`,
                              transform: 'translateX(-50%)'
                            }}>
                              <div className={`h-3 w-px ${isToday ? 'bg-primary' : 'bg-border/40'}`} />
                              <div className={`text-xs mt-1 whitespace-nowrap font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                {viewMode === 'daily' ? format(date, "EEE d") : viewMode === 'weekly' ? format(date, "MMM d") : format(date, "MMM d")}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{format(date, "EEEE, MMMM d, yyyy")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>;
              })}
                  {/* Project start date marker if it's in view */}
                  {projectStartDate && parseISO(projectStartDate) >= minDate && parseISO(projectStartDate) <= maxDate && <div className="absolute top-0 flex flex-col items-center z-10" style={{
                left: `${differenceInDays(parseISO(projectStartDate), minDate) / totalDays * 100}%`,
                transform: 'translateX(-50%)'
              }}>
                      <div className="h-full w-0.5 bg-primary" />
                      <Badge variant="default" className="text-xs mt-1">Start</Badge>
                    </div>}
                  
                  {/* Goal date marker if it's in view */}
                  {projectFinishDate && parseISO(projectFinishDate) >= minDate && parseISO(projectFinishDate) <= maxDate && <div className="absolute top-0 flex flex-col items-center z-10" style={{
                left: `${differenceInDays(parseISO(projectFinishDate), minDate) / totalDays * 100}%`,
                transform: 'translateX(-50%)'
              }}>
                      <div className="h-full w-0.5 bg-primary" />
                      <Badge variant="default" className="text-xs mt-1">Goal</Badge>
                    </div>}
                </div>
              </div>

              {/* Timeline bars */}
              <div className="relative space-y-2 pt-2 overflow-hidden bg-gradient-to-b from-background to-muted/10 rounded-lg p-4" onDragOver={handleDragOver} onDrop={handleDrop}>
                {/* Horizontal grid lines - subtle separators */}
                <div className="absolute inset-0 pointer-events-none">
                  {visibleTasks.map((_, index) => {
                    const top = index * 64 + 32; // 64px per task row + 32px offset
                    return (
                      <div
                        key={`h-grid-${index}`}
                        className="absolute left-0 right-0 h-px bg-border/10"
                        style={{ top: `${top}px` }}
                      />
                    );
                  })}
                </div>
                {visibleTasks.map(task => {
              const {
                left,
                width
              } = getTaskPosition(task, minDate, totalDays);
              const taskDeps = dependencies.filter(d => d.task_id === task.id);
              return <div key={task.id} className="relative h-16 py-1">
                      {/* Dependency lines */}
                      {taskDeps.map(dep => {
                  const dependsOnTask = visibleTasks.find(t => t.id === dep.depends_on_task_id);
                  if (!dependsOnTask) return null;
                  const depPos = getTaskPosition(dependsOnTask, minDate, totalDays);
                  const depIndex = visibleTasks.indexOf(dependsOnTask);
                  const taskIndex = visibleTasks.indexOf(task);
                  const verticalDistance = (taskIndex - depIndex) * 64; // 64px = h-16

                  return <svg key={dep.id} className="absolute pointer-events-none z-0" style={{
                    left: `${depPos.left + depPos.width}%`,
                    top: -verticalDistance,
                    width: `${left - (depPos.left + depPos.width)}%`,
                    height: verticalDistance + 32
                  }}>
                            <line x1="0" y1={verticalDistance} x2="100%" y2={verticalDistance + 32} stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
                          </svg>;
                })}
                      
                      {/* Task bar - Monday.com inspired */}
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <div className={`absolute h-14 rounded-xl ${getStatusColor(task.status)} shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group border border-white/20`} style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: '60px'
                          }}
                          onClick={() => handleTaskClick(task)}
                          >
                            {/* Left resize handle */}
                            <div draggable onDragStart={e => {
                              e.stopPropagation();
                              handleDragStart(e, task);
                            }} className="resize-handle resize-left absolute left-0 top-0 h-full w-3 cursor-ew-resize hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-30 rounded-l-xl" onClick={e => e.stopPropagation()} />

                            {/* Progress bar overlay - striped pattern */}
                            {task.progress > 0 && <div className="absolute inset-0 bg-white/20 pointer-events-none rounded-xl" style={{
                              width: `${task.progress}%`,
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
                            }} />}
                            
                            {/* Task title - Top left corner */}
                            <div className="absolute top-1 left-2 right-2 z-20 flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white drop-shadow truncate">
                                {task.title}
                              </span>
                              {/* Drag handle - visible on hover */}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, task);
                                }}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => e.stopPropagation()}
                                className="cursor-move"
                              >
                                <Move className="h-3 w-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 drop-shadow" />
                              </div>
                            </div>
                            
                            <div className="h-full flex items-center justify-between px-2 py-2 relative z-10 gap-2 pt-6">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {/* Status badge */}
                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeColor(task.status)} whitespace-nowrap flex-shrink-0`}>
                                  {getStatusLabel(task.status)}
                                </div>
                                
                                {/* Cost center icon */}
                                {(() => {
                                  const CostCenterIcon = getCostCenterIcon(task.cost_center);
                                  return CostCenterIcon ? (
                                    <CostCenterIcon className="h-4 w-4 text-white/90 flex-shrink-0 drop-shadow" />
                                  ) : null;
                                })()}
                              </div>
                              
                              {/* Progress percentage */}
                              {task.progress > 0 && <div className="flex items-center gap-1 flex-shrink-0 bg-black/20 px-2 py-1 rounded-md">
                                  <span className="text-xs font-bold text-white">
                                    {task.progress}%
                                  </span>
                                </div>}
                            </div>
                            
                            {/* Date range display on hover - bottom of bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[9px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl flex items-center justify-between">
                              <span>{format(parseISO(task.start_date!), "MMM d")}</span>
                              <span>→</span>
                              <span>{format(parseISO(task.finish_date!), "MMM d")}</span>
                            </div>

                            {/* Right resize handle */}
                            <div draggable onDragStart={e => {
                              e.stopPropagation();
                              handleDragStart(e, task);
                            }} className="resize-handle resize-right absolute right-0 top-0 h-full w-3 cursor-ew-resize hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-30 rounded-r-xl" onClick={e => e.stopPropagation()} />
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-semibold">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="font-medium">{t('common.status')}:</span> {task.status}
                              </div>
                              <div>
                                <span className="font-medium">{t('tasks.priority')}:</span> {task.priority}
                              </div>
                              <div>
                                <span className="font-medium">{t('common.progress')}:</span> {task.progress}%
                              </div>
                              {task.budget && (
                                <div>
                                  <span className="font-medium">{t('common.budget')}:</span> {task.budget}
                                </div>
                              )}
                              <div className="col-span-2">
                                <span className="font-medium">{t('timeline.duration', 'Duration')}:</span> {format(parseISO(task.start_date!), "MMM d")} - {format(parseISO(task.finish_date!), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>;
            })}
              </div>
            </div></div>}
        </div>
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('tasks.editTask', 'Edit Task')}</DialogTitle>
            <DialogDescription className="sr-only">{t('tasks.editTask', 'Edit Task')}</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleEditTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task-title">{t('tasks.taskTitle')}</Label>
                <Input
                  id="edit-task-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-description">{t('common.description')}</Label>
                <Textarea
                  id="edit-task-description"
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-priority">Priority</Label>
                  <Select 
                    value={editingTask.priority} 
                    onValueChange={(value) => setEditingTask({ ...editingTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('tasks.priorityLow')}</SelectItem>
                      <SelectItem value="medium">{t('tasks.priorityMedium')}</SelectItem>
                      <SelectItem value="high">{t('tasks.priorityHigh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-assignee">{t('common.assignedTo')}</Label>
                  <Select
                    value={editingTask.assigned_to_stakeholder_id || "unassigned"}
                    onValueChange={(value) => 
                      setEditingTask({ 
                        ...editingTask, 
                        assigned_to_stakeholder_id: value === "unassigned" ? null : value 
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.unassigned')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-progress">{t('common.progress')}: {editingTask.progress}%</Label>
                <Slider
                  id="edit-task-progress"
                  min={0}
                  max={100}
                  step={5}
                  value={[editingTask.progress]}
                  onValueChange={([value]) => setEditingTask({ ...editingTask, progress: value })}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-start-date">{t('common.startDate')}</Label>
                  <DatePicker
                    date={editingTask.start_date ? new Date(editingTask.start_date) : undefined}
                    onDateChange={(date) => setEditingTask({ ...editingTask, start_date: date ? date.toISOString().split('T')[0] : null })}
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-finish-date">{t('common.finishDate')}</Label>
                  <DatePicker
                    date={editingTask.finish_date ? new Date(editingTask.finish_date) : undefined}
                    onDateChange={(date) => setEditingTask({ ...editingTask, finish_date: date ? date.toISOString().split('T')[0] : null })}
                    placeholder="Välj slutdatum"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-budget">{t('common.budget')}</Label>
                <Input
                  id="edit-task-budget"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editingTask.budget || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, budget: parseFloat(e.target.value) || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-cost-center">{t('budget.costCenter')}</Label>
                <Select
                  value={editingTask.cost_center || ""}
                  onValueChange={(value) => setEditingTask({ ...editingTask, cost_center: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cost center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="Floor">Floor</SelectItem>
                    <SelectItem value="Paint">Paint</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Kitchen">Kitchen</SelectItem>
                    <SelectItem value="Bathrooms">Bathrooms</SelectItem>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Tiles">Tiles</SelectItem>
                    <SelectItem value="Windows">Windows</SelectItem>
                    <SelectItem value="Doors">Doors</SelectItem>
                    <SelectItem value="Electricity">Electricity</SelectItem>
                    <SelectItem value="Carpentry">Carpentry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('taskPanel.saveChanges')}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Side Panel */}
      <TaskSidePanel
        taskId={selectedTaskId}
        projectId={projectId}
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        onTaskUpdated={() => {
          fetchTasks();
          fetchDependencies();
        }}
      />
    </Card>;
};
export default ProjectTimeline;