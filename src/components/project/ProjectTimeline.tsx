import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Calendar, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Move, ZoomIn, ZoomOut, RotateCcw, Layers, SlidersHorizontal, Info, X } from "lucide-react";
import { useTimelineGestures } from "@/hooks/useTimelineGestures";
import { Slider } from "@/components/ui/slider";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
interface Room {
  id: string;
  name: string;
}
type GroupByOption = 'none' | 'status' | 'room' | 'assignee' | 'priority';

interface TaskGroup {
  id: string;
  label: string;
  color?: string;
  tasks: Task[];
  isCollapsed: boolean;
}
interface ProjectTimelineProps {
  projectId: string;
  projectName?: string;
  projectStartDate?: string | null;
  projectFinishDate?: string | null;
  onTaskClick?: (taskId: string) => void;
  onNavigateToRoom?: (roomId: string) => void;
  currency?: string | null;
}
const ProjectTimeline = ({
  projectId,
  projectName,
  projectStartDate,
  projectFinishDate,
  onTaskClick,
  onNavigateToRoom,
  currency
}: ProjectTimelineProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [resizingTask, setResizingTask] = useState<Task | null>(null);
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Touch gestures for pan and zoom - controls visible time range
  const {
    containerRef: gestureContainerRef,
    daysVisible,
    centerDate,
    startDate: gestureStartDate,
    endDate: gestureEndDate,
    setDaysVisible,
    setCenterDate,
    zoomIn,
    zoomOut,
    goToToday,
    panByDays,
    minDays,
    maxDays,
    isDragging,
  } = useTimelineGestures({
    minDays: 7,
    maxDays: 365,
    initialDays: 30,
    initialCenterDate: new Date(),
  });
  useEffect(() => {
    fetchTasks();
    fetchDependencies();
    fetchTeamMembers();
    fetchRooms();
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
  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId)
        .order("name");
      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
    }
  };

  // Toggle group collapsed state
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Navigation functions using gesture hook
  const handlePrevious = () => {
    panByDays(-Math.ceil(daysVisible / 2));
  };

  const handleNext = () => {
    panByDays(Math.ceil(daysVisible / 2));
  };

  const handleToday = () => {
    goToToday();
  };

  // View mode presets - set specific day ranges
  const setViewPreset = (preset: 'week' | 'month' | '3months' | 'full') => {
    switch (preset) {
      case 'week':
        setDaysVisible(7);
        break;
      case 'month':
        setDaysVisible(30);
        break;
      case '3months':
        setDaysVisible(90);
        break;
      case 'full':
        // Calculate full project span
        const dates: Date[] = [];
        if (projectStartDate) dates.push(parseISO(projectStartDate));
        if (projectFinishDate) dates.push(parseISO(projectFinishDate));
        tasks.forEach(task => {
          if (task.start_date) dates.push(parseISO(task.start_date));
          if (task.finish_date) dates.push(parseISO(task.finish_date));
        });
        if (dates.length >= 2) {
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
          const span = differenceInDays(maxDate, minDate) + 14; // Add padding
          setDaysVisible(Math.min(span, maxDays));
          setCenterDate(addDays(minDate, Math.floor(span / 2)));
        }
        break;
    }
  };

  // Use gesture-controlled dates for timeline bounds
  const minDate = gestureStartDate;
  const maxDate = gestureEndDate;
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Generate date markers for the timeline based on visible days
  // Must be called before any early returns (React hooks rule)
  const dateMarkers = useMemo(() => {
    const markers: Date[] = [];
    let currentMarker = minDate;
    // Dynamically choose interval based on days visible
    let interval: number;
    if (daysVisible <= 14) {
      interval = 1; // Show every day for 2 weeks or less
    } else if (daysVisible <= 45) {
      interval = Math.ceil(daysVisible / 15); // ~15 markers
    } else if (daysVisible <= 90) {
      interval = Math.ceil(daysVisible / 12); // ~12 markers
    } else {
      interval = Math.ceil(daysVisible / 10); // ~10 markers for longer ranges
    }
    while (currentMarker <= maxDate) {
      markers.push(currentMarker);
      currentMarker = addDays(currentMarker, interval);
    }
    return markers;
  }, [minDate, maxDate, daysVisible]);

  // Filter tasks that overlap with current view and match assignee filter
  // Must be called before any early returns (React hooks rule)
  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date || !task.finish_date) return false;
      const taskStart = parseISO(task.start_date);
      const taskEnd = parseISO(task.finish_date);
      const inTimeRange = taskStart <= maxDate && taskEnd >= minDate;
      const matchesAssignee = selectedAssignee === "all" ||
        (selectedAssignee === "unassigned" && !task.assigned_to_stakeholder_id) ||
        task.assigned_to_stakeholder_id === selectedAssignee;
      return inTimeRange && matchesAssignee;
    });
  }, [tasks, minDate, maxDate, selectedAssignee]);

  // Status colors for task bars - following universal conventions
  // Green = Completed, Blue = In Progress, Amber = Waiting/On Hold, Red = Blocked/Cancelled, Gray = To Do
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "done":
        return "bg-emerald-500";
      case "in_progress":
      case "doing":
        return "bg-blue-500";
      case "waiting":
      case "on_hold":
        return "bg-amber-500";
      case "blocked":
        return "bg-red-500";
      case "cancelled":
      case "scrapped":
        return "bg-red-400";
      case "planned":
      case "discovery":
        return "bg-indigo-400";
      case "ideas":
        return "bg-purple-400";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusKey = status.replace(/_/g, '');
    const keyMap: Record<string, string> = {
      'todo': 'toDo',
      'inprogress': 'inProgress',
      'onhold': 'onHold',
    };
    const key = keyMap[statusKey] || status;
    return t(`statuses.${key}`, status);
  };

  // Group tasks based on selected grouping option
  const groupedTasks = useMemo((): TaskGroup[] => {
    if (groupBy === 'none') {
      return [{
        id: 'all',
        label: '',
        tasks: visibleTasks,
        isCollapsed: false,
      }];
    }

    const groupMap = new Map<string, Task[]>();
    const groupOrder: string[] = [];

    // Define group order and colors based on groupBy type
    const statusOrder = ['in_progress', 'to_do', 'waiting', 'on_hold', 'blocked', 'completed', 'cancelled'];
    const priorityOrder = ['high', 'medium', 'low'];

    visibleTasks.forEach(task => {
      let groupKey: string;

      switch (groupBy) {
        case 'status':
          groupKey = task.status || 'to_do';
          break;
        case 'room':
          groupKey = task.room_id || 'unassigned';
          break;
        case 'assignee':
          groupKey = task.assigned_to_stakeholder_id || 'unassigned';
          break;
        case 'priority':
          groupKey = task.priority || 'medium';
          break;
        default:
          groupKey = 'all';
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
        groupOrder.push(groupKey);
      }
      groupMap.get(groupKey)!.push(task);
    });

    // Sort groups based on type
    let sortedKeys: string[];
    if (groupBy === 'status') {
      sortedKeys = groupOrder.sort((a, b) => {
        const aIndex = statusOrder.indexOf(a);
        const bIndex = statusOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    } else if (groupBy === 'priority') {
      sortedKeys = groupOrder.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    } else {
      sortedKeys = groupOrder.sort((a, b) => {
        if (a === 'unassigned') return 1;
        if (b === 'unassigned') return -1;
        return a.localeCompare(b);
      });
    }

    // Build group objects with labels and colors
    return sortedKeys.map(key => {
      let label: string;
      let color: string | undefined;

      switch (groupBy) {
        case 'status':
          label = getStatusLabel(key);
          color = getStatusColor(key);
          break;
        case 'room':
          if (key === 'unassigned') {
            label = t('common.noRoom', 'No Room');
          } else {
            const room = rooms.find(r => r.id === key);
            label = room?.name || t('common.unknownRoom', 'Unknown Room');
          }
          break;
        case 'assignee':
          if (key === 'unassigned') {
            label = t('common.unassigned', 'Unassigned');
          } else {
            const member = teamMembers.find(m => m.id === key);
            label = member?.name || t('common.unknownUser', 'Unknown');
          }
          break;
        case 'priority':
          label = t(`tasks.priority${key.charAt(0).toUpperCase() + key.slice(1)}`, key);
          color = key === 'high' ? 'bg-red-500' : key === 'medium' ? 'bg-amber-500' : 'bg-slate-400';
          break;
        default:
          label = key;
      }

      return {
        id: key,
        label,
        color,
        tasks: groupMap.get(key) || [],
        isCollapsed: collapsedGroups.has(key),
      };
    });
  }, [visibleTasks, groupBy, rooms, teamMembers, collapsedGroups, t]);

  // Calculate total visible rows (accounting for collapsed groups)
  const totalVisibleRows = useMemo(() => {
    if (groupBy === 'none') return visibleTasks.length;
    return groupedTasks.reduce((sum, group) => {
      return sum + 1 + (group.isCollapsed ? 0 : group.tasks.length); // 1 for header
    }, 0);
  }, [groupedTasks, groupBy, visibleTasks.length]);

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

  // Status badge colors for hover card and other UI elements
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
      case "done":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "in_progress":
      case "doing":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      case "waiting":
      case "on_hold":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "blocked":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "cancelled":
      case "scrapped":
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "planned":
      case "discovery":
        return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800";
      case "ideas":
        return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
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
      <CardHeader className="pb-3">
        {/* === MOBILE HEADER (compact) === */}
        <div className="md:hidden space-y-3">
          {/* Row 1: Title + Filter button */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{projectName || t('projectDetail.timeline')}</CardTitle>
              <CardDescription className="text-xs">
                {format(minDate, "d MMM")} - {format(maxDate, "d MMM")} ({daysVisible} {t('timeline.days', 'days')})
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={showLegend ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowLegend(!showLegend)}
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                variant={mobileFiltersOpen ? "secondary" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                {t('timeline.filters', 'Filter')}
              </Button>
            </div>
          </div>

          {/* Row 2: Compact navigation + zoom */}
          <div className="flex items-center justify-between gap-2">
            {/* View preset pills */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              {(['week', 'month', '3months', 'full'] as const).map((preset) => {
                const isActive =
                  (preset === 'week' && daysVisible <= 10) ||
                  (preset === 'month' && daysVisible > 10 && daysVisible <= 45) ||
                  (preset === '3months' && daysVisible > 45 && daysVisible <= 120) ||
                  (preset === 'full' && daysVisible > 120);
                const labels = { week: '1V', month: '1M', '3months': '3M', full: t('timeline.fullProject', 'Alla') };
                return (
                  <Button
                    key={preset}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewPreset(preset)}
                    className="h-7 px-2 text-xs"
                  >
                    {labels[preset]}
                  </Button>
                );
              })}
            </div>
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleToday} className="h-7 px-2 text-xs">
                {t('timeline.today', 'Idag')}
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrevious} className="h-7 w-7">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} className="h-7 w-7">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expandable filters panel */}
          {mobileFiltersOpen && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-3 border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('timeline.filters', 'Filter')}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMobileFiltersOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                  <SelectTrigger className="h-9">
                    <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder={t('timeline.groupBy', 'Gruppering')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('timeline.noGrouping', 'Ingen')}</SelectItem>
                    <SelectItem value="status">{t('timeline.groupByStatus', 'Status')}</SelectItem>
                    <SelectItem value="room">{t('timeline.groupByRoom', 'Rum')}</SelectItem>
                    <SelectItem value="assignee">{t('timeline.groupByAssignee', 'Person')}</SelectItem>
                    <SelectItem value="priority">{t('timeline.groupByPriority', 'Prioritet')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('budget.allAssignees')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('budget.allAssignees')}</SelectItem>
                    <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Zoom controls */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button variant="outline" size="icon" onClick={zoomOut} disabled={daysVisible >= maxDays} className="h-8 w-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[70px] text-center">
                  {daysVisible} {t('timeline.days', 'dagar')}
                </span>
                <Button variant="outline" size="icon" onClick={zoomIn} disabled={daysVisible <= minDays} className="h-8 w-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setViewPreset('month')} className="h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Legend (toggle) */}
          {showLegend && (
            <div className="flex items-center gap-3 text-xs flex-wrap bg-muted/30 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span>{t('projectDetail.completed')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>{t('projectDetail.inProgress')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-400" />
                <span>{t('projectDetail.toDo')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span>{t('statuses.onHold')}</span>
              </div>
            </div>
          )}

          {/* Unscheduled badge */}
          {unscheduledCount > 0 && (
            <Badge variant="secondary" className="text-xs w-fit">
              <Calendar className="h-3 w-3 mr-1" />
              {unscheduledCount === 1
                ? t('timeline.unscheduledTasksSingular', '1 oschemalagd')
                : t('timeline.unscheduledTasks', '{{count}} oschemalagda', { count: unscheduledCount })}
            </Badge>
          )}
        </div>

        {/* === DESKTOP HEADER (full controls) === */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>{projectName || t('projectDetail.timeline')}</CardTitle>
              <CardDescription>
                {format(minDate, "MMM d, yyyy")} - {format(maxDate, "MMM d, yyyy")} ({daysVisible} {t('timeline.days', 'days')})
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Group by dropdown */}
              <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                <SelectTrigger className="w-36">
                  <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder={t('timeline.groupBy', 'Group by')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('timeline.noGrouping', 'No grouping')}</SelectItem>
                  <SelectItem value="status">{t('timeline.groupByStatus', 'Status')}</SelectItem>
                  <SelectItem value="room">{t('timeline.groupByRoom', 'Room')}</SelectItem>
                  <SelectItem value="assignee">{t('timeline.groupByAssignee', 'Assignee')}</SelectItem>
                  <SelectItem value="priority">{t('timeline.groupByPriority', 'Priority')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="w-40">
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
              {/* View preset buttons */}
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  variant={daysVisible <= 10 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewPreset('week')}
                  className="h-7 px-2 text-xs"
                >
                  {t('timeline.weekly', '1W')}
                </Button>
                <Button
                  variant={daysVisible > 10 && daysVisible <= 45 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewPreset('month')}
                  className="h-7 px-2 text-xs"
                >
                  {t('timeline.monthly', '1M')}
                </Button>
                <Button
                  variant={daysVisible > 45 && daysVisible <= 120 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewPreset('3months')}
                  className="h-7 px-2 text-xs"
                >
                  {t('timeline.threeMonths', '3M')}
                </Button>
                <Button
                  variant={daysVisible > 120 ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewPreset('full')}
                  className="h-7 px-2 text-xs"
                >
                  {t('timeline.fullProject', 'All')}
                </Button>
              </div>
              <Button variant="outline" onClick={handleToday}>
                {t('timeline.today', 'Today')}
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-2 mt-3 pb-2 border-b">
            <Button variant="ghost" size="icon" onClick={zoomOut} disabled={daysVisible >= maxDays} className="h-8 w-8" title={t('timeline.showMoreDays', 'Show more days')}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {daysVisible} {t('timeline.days', 'days')}
            </span>
            <Button variant="ghost" size="icon" onClick={zoomIn} disabled={daysVisible <= minDays} className="h-8 w-8" title={t('timeline.showFewerDays', 'Show fewer days')}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setViewPreset('month')} className="h-8 w-8" title={t('timeline.resetZoom', 'Reset to 1 month')}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {t('timeline.gestureHint', 'Pinch to zoom, swipe to pan')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm flex-wrap mt-3">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {visibleTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              {t('timeline.noTasksInPeriod', 'No tasks scheduled in this time period')}
            </div> : <div
              ref={gestureContainerRef}
              className="overflow-x-auto overflow-y-auto -mx-3 px-3 md:mx-0 md:px-0 touch-pan-x touch-pan-y select-none scrollbar-thin rounded-lg"
              style={{ maxHeight: '70vh', cursor: isDragging ? 'grabbing' : 'grab' }}
            ><div
              className="relative min-w-[800px]"
            >
              {/* Sticky date ruler/timeline axis - clean design without vertical lines */}
              <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 shadow-sm flex">
                {/* Spacer for left sidebar when grouping */}
                {groupBy !== 'none' && <div className="w-40 flex-shrink-0 border-r border-border/30 flex items-end pb-2 px-3">
                  <span className="text-xs font-medium text-muted-foreground">{t('timeline.groupBy', 'Group by')}: {groupBy}</span>
                </div>}
                <div className="relative h-12 flex items-end pb-2 flex-1">
                  {dateMarkers.map((date, index) => {
                    const daysFromStart = differenceInDays(date, minDate);
                    const left = daysFromStart / totalDays * 100;
                    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    return <TooltipProvider key={index}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`absolute flex flex-col items-center cursor-help ${isToday ? 'z-20' : ''}`} style={{
                              left: `${left}%`,
                              transform: 'translateX(-50%)'
                            }}>
                              <div className={`text-xs whitespace-nowrap font-medium ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                {daysVisible <= 14 ? format(date, "EEE d") : daysVisible <= 60 ? format(date, "MMM d") : format(date, "d MMM")}
                              </div>
                              {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{format(date, "EEEE, MMMM d, yyyy")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>;
                  })}
                  {/* Project start date marker if it's in view */}
                  {projectStartDate && parseISO(projectStartDate) >= minDate && parseISO(projectStartDate) <= maxDate && <div className="absolute flex flex-col items-center z-10" style={{
                    left: `${differenceInDays(parseISO(projectStartDate), minDate) / totalDays * 100}%`,
                    transform: 'translateX(-50%)'
                  }}>
                      <Badge variant="default" className="text-xs">Start</Badge>
                    </div>}

                  {/* Goal date marker if it's in view */}
                  {projectFinishDate && parseISO(projectFinishDate) >= minDate && parseISO(projectFinishDate) <= maxDate && <div className="absolute flex flex-col items-center z-10" style={{
                    left: `${differenceInDays(parseISO(projectFinishDate), minDate) / totalDays * 100}%`,
                    transform: 'translateX(-50%)'
                  }}>
                      <Badge variant="default" className="text-xs">Goal</Badge>
                    </div>}
                </div>
              </div>

              {/* Timeline content with optional left sidebar for grouping */}
              <div className="flex">
                {/* Left sidebar for group labels - only shown when grouping is active */}
                {groupBy !== 'none' && (
                  <div className="sticky left-0 z-20 bg-background/95 backdrop-blur-sm border-r border-border/30 w-40 flex-shrink-0">
                    <div className="pt-4">
                      {groupedTasks.map((group) => (
                        <div key={group.id}>
                          {/* Group header */}
                          <div
                            className="h-10 flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/20"
                            onClick={() => toggleGroupCollapse(group.id)}
                          >
                            {group.isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {group.color && (
                              <div className={`w-2.5 h-2.5 rounded-full ${group.color} flex-shrink-0`} />
                            )}
                            <span className="text-sm font-medium truncate flex-1">{group.label}</span>
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {group.tasks.length}
                            </Badge>
                          </div>
                          {/* Spacer rows for tasks (when not collapsed) */}
                          {!group.isCollapsed && group.tasks.map((task) => (
                            <div key={task.id} className="h-11 border-b border-border/10 flex items-center px-3">
                              <span className="text-xs text-muted-foreground truncate">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main timeline area */}
                <div className="flex-1 min-w-0">
                  <div className="relative pt-4 overflow-hidden rounded-lg p-4" onDragOver={handleDragOver} onDrop={handleDrop}>
                    {/* Background grid - subtle week lines and weekend shading */}
                    <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
                      {Array.from({ length: totalDays + 1 }, (_, i) => {
                        const currentDate = addDays(minDate, i);
                        const isMonday = currentDate.getDay() === 1;
                        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                        const isToday = format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                        const left = (i / totalDays) * 100;

                        return (
                          <React.Fragment key={`grid-${i}`}>
                            {/* Week separator line (between Sunday and Monday) */}
                            {isMonday && (
                              <div
                                className="absolute w-px bg-border/50"
                                style={{ left: `${left}%`, top: '0', bottom: '0', height: '100%' }}
                              />
                            )}
                            {isWeekend && i < totalDays && (
                              <div
                                className="absolute bg-muted/10 pointer-events-none"
                                style={{ left: `${left}%`, width: `${100/totalDays}%`, top: '0', bottom: '0', height: '100%' }}
                              />
                            )}
                            {isToday && (
                              <div
                                className="absolute w-0.5 bg-primary z-20 pointer-events-none"
                                style={{ left: `${left}%`, top: '0', bottom: '0', height: '100%' }}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Grouped task rows */}
                    {groupedTasks.map((group) => (
                      <div key={group.id}>
                        {/* Group header row (only when grouping is active) */}
                        {groupBy !== 'none' && (
                          <div className="h-10 flex items-center border-b border-border/30 bg-muted/20 -mx-4 px-4">
                            <div className="flex items-center gap-2">
                              {group.color && <div className={`w-3 h-3 rounded-full ${group.color}`} />}
                              <span className="text-sm font-semibold text-foreground">{group.label}</span>
                              <Badge variant="outline" className="text-xs">{group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}</Badge>
                            </div>
                          </div>
                        )}

                        {/* Task rows (hidden when collapsed) */}
                        {!group.isCollapsed && group.tasks.map((task) => {
                          const { left, width } = getTaskPosition(task, minDate, totalDays);
                          return (
                            <div key={task.id} className="relative h-11 py-0.5">
                              {/* Task bar - compact design */}
                              <HoverCard openDelay={300}>
                                <HoverCardTrigger asChild>
                                  <div
                                    className={`task-bar absolute h-10 rounded-lg ${getStatusColor(task.status)} shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group border border-white/20`}
                                    style={{ left: `${left}%`, width: `${width}%`, minWidth: '50px' }}
                                    onClick={() => handleTaskClick(task)}
                                  >
                                    {/* Left resize handle */}
                                    <div
                                      draggable
                                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, task); }}
                                      className="resize-handle resize-left absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-30 rounded-l-lg"
                                      onClick={e => e.stopPropagation()}
                                    />

                                    {/* Progress bar overlay */}
                                    {task.progress > 0 && (
                                      <div
                                        className="absolute inset-0 bg-white/20 pointer-events-none rounded-lg"
                                        style={{
                                          width: `${task.progress}%`,
                                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,.05) 8px, rgba(255,255,255,.05) 16px)'
                                        }}
                                      />
                                    )}

                                    {/* Task content - single row with title and progress */}
                                    <div className="h-full flex items-center justify-between px-2 py-1 relative z-10 gap-2">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-white drop-shadow truncate">{task.title}</span>
                                        <div
                                          draggable
                                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, task); }}
                                          onDragEnd={handleDragEnd}
                                          onClick={(e) => e.stopPropagation()}
                                          className="cursor-move flex-shrink-0"
                                        >
                                          <Move className="h-3 w-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                        </div>
                                      </div>
                                      {task.progress > 0 && (
                                        <div className="flex-shrink-0 bg-black/20 px-1.5 py-0.5 rounded">
                                          <span className="text-[10px] font-bold text-white">{task.progress}%</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Date range on hover */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/30 text-white text-[9px] px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg flex items-center justify-between">
                                      <span>{format(parseISO(task.start_date!), "MMM d")}</span>
                                      <span>→</span>
                                      <span>{format(parseISO(task.finish_date!), "MMM d")}</span>
                                    </div>

                                    {/* Right resize handle */}
                                    <div
                                      draggable
                                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, task); }}
                                      className="resize-handle resize-right absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-30 rounded-r-lg"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-semibold leading-tight">{task.title}</h4>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${getStatusBadgeColor(task.status)}`}>
                                        {getStatusLabel(task.status)}
                                      </span>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground">{task.description}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">{t('tasks.priority')}:</span>{' '}
                                        <span className="font-medium">{task.priority}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">{t('common.progress')}:</span>{' '}
                                        <span className="font-medium">{task.progress}%</span>
                                      </div>
                                      {task.budget && (
                                        <div className="col-span-2">
                                          <span className="text-muted-foreground">{t('common.budget')}:</span>{' '}
                                          <span className="font-medium">{task.budget}</span>
                                        </div>
                                      )}
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">{t('timeline.duration', 'Duration')}:</span>{' '}
                                        <span className="font-medium">{format(parseISO(task.start_date!), "MMM d")} - {format(parseISO(task.finish_date!), "MMM d, yyyy")}</span>
                                      </div>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
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
        onNavigateToRoom={onNavigateToRoom}
        currency={currency}
      />
    </Card>;
};
export default ProjectTimeline;