import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CheckCircle2, Circle, Clock, XCircle, Pencil, Users, ChevronDown, ChevronUp, DollarSign, Tag, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Filter, CheckSquare, Trash2, X, ShoppingCart, Calendar, MapPin, Map } from "lucide-react";
import { TaskListSkeleton } from "@/components/ui/skeleton-screens";
import { DEFAULT_COST_CENTERS, getCostCenterIcon, getCostCenterLabel } from "@/lib/costCenters";
import { formatCurrency } from "@/lib/currency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MaterialsList from "./MaterialsList";
import { EntityPhotoGallery } from "@/components/shared/EntityPhotoGallery";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { TaskFilesList } from "./TaskFilesList";
import { Separator } from "@/components/ui/separator";
import ProjectTimeline from "./ProjectTimeline";
import { ProjectLockBanner } from "./ProjectLockBanner";
import { useProjectLock } from "@/hooks/useProjectLock";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  finish_date: string | null;
  progress: number;
  assigned_to_stakeholder_id: string | null;
  room_id: string | null;
  budget: number | null;
  ordered_amount: number | null;
  payment_status: string | null;
  paid_amount: number | null;
  cost_center: string | null;
  cost_centers?: string[] | null;
  checklists?: Checklist[];
}

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  contractor_category: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

interface TaskDependency {
  id: string;
  depends_on_task_id: string;
}

interface TasksTabProps {
  projectId: string;
  projectName?: string;
  tasksScope?: 'all' | 'assigned';
  openEntityId?: string | null;
  onEntityOpened?: () => void;
  onNavigateToRoom?: (roomId: string) => void;
  showTimeline?: boolean;
  currency?: string | null;
}

const TasksTab = ({ projectId, projectName, tasksScope = 'all', openEntityId, onEntityOpened, onNavigateToRoom, showTimeline = true, currency }: TasksTabProps) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [canCreateRequests, setCanCreateRequests] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<{ [key: string]: TaskDependency[] }>({});
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [createStakeholderDialogOpen, setCreateStakeholderDialogOpen] = useState(false);
  const [newStakeholderName, setNewStakeholderName] = useState("");
  const [newStakeholderRole, setNewStakeholderRole] = useState<'contractor' | 'client' | 'other'>('contractor');
  const [newStakeholderCategory, setNewStakeholderCategory] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskFinishDate, setNewTaskFinishDate] = useState("");
  const [newTaskRoomId, setNewTaskRoomId] = useState<string>("");
  const [newTaskBudget, setNewTaskBudget] = useState("");
  const [newTaskCostCenter, setNewTaskCostCenter] = useState("");
  const [newTaskCostCenters, setNewTaskCostCenters] = useState<string[]>([]);
  const [customCostCenters, setCustomCostCenters] = useState<string[]>([]);
  const [showCustomCostCenter, setShowCustomCostCenter] = useState(false);
  const [customCostCenterValue, setCustomCostCenterValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { lockStatus } = useProjectLock(projectId);

  // Filters (multi-select: empty set = show all)
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterAssignees, setFilterAssignees] = useState<Set<string>>(new Set());
  const [filterRooms, setFilterRooms] = useState<Set<string>>(new Set());
  const [filterCostCenters, setFilterCostCenters] = useState<Set<string>>(new Set());
  
  // View mode
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Timeline visibility
  const [timelineOpen, setTimelineOpen] = useState(true);
  
  // Column order for Kanban view
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`kanban-column-order-${projectId}`);
    return saved ? JSON.parse(saved) : ['planned', 'to_do', 'in_progress', 'waiting', 'completed', 'cancelled'];
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  
  // Custom column names
  const [customColumnNames, setCustomColumnNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`kanban-column-names-${projectId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [editingColumnName, setEditingColumnName] = useState<string | null>(null);
  const [editingColumnValue, setEditingColumnValue] = useState<string>("");
  
  // Drag and drop
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Purchase Orders for edit dialog
  const [editTaskMaterials, setEditTaskMaterials] = useState<{ id: string; name: string; quantity: number; unit: string; price_per_unit: number | null; price_total: number | null; status: string }[]>([]);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [poName, setPoName] = useState("");
  const [poQuantity, setPoQuantity] = useState("1");
  const [poUnit, setPoUnit] = useState("pcs");
  const [poPricePerUnit, setPoPricePerUnit] = useState("");

  useEffect(() => {
    fetchTasks();
    checkPermissions();
    fetchTeamMembers();
    fetchStakeholders();
    fetchTaskDependencies();
    fetchRooms();
  }, [projectId]);

  // Re-fetch tasks when profile ID is resolved and scope filtering is needed
  useEffect(() => {
    if (tasksScope === 'assigned' && currentProfileId) {
      fetchTasks();
    }
  }, [currentProfileId, tasksScope]);

  // Fetch materials when editing a task
  useEffect(() => {
    if (editingTask) {
      fetchEditTaskMaterials(editingTask.id);
    }
  }, [editingTask?.id]);

  // Auto-open a specific task from notification deep link or feed navigation
  useEffect(() => {
    if (!openEntityId || loading) return;
    const task = tasks.find((t) => t.id === openEntityId);
    if (task) {
      setEditingTask(task);
      setEditDialogOpen(true);
      onEntityOpened?.();
    } else if (tasks.length > 0) {
      // Entity not found in loaded tasks — clear to avoid stale state
      onEntityOpened?.();
    }
  }, [openEntityId, loading, tasks]);

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

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      setCurrentProfileId(profile.id);

      // Check if user can create purchase requests
      const { data: shareData } = await supabase
        .from("project_shares")
        .select("can_create_purchase_requests")
        .eq("project_id", projectId)
        .eq("shared_with_user_id", profile.id)
        .maybeSingle();

      setCanCreateRequests(shareData?.can_create_purchase_requests || false);
    } catch (error) {
      setCanCreateRequests(false);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from("stakeholders" as any)
        .select("id, name, role, contractor_category")
        .eq("project_id", projectId)
        .order("name");

      if (error) throw error;
      setStakeholders((data || []) as unknown as Stakeholder[]);
    } catch (error: any) {
      console.error("Error fetching stakeholders:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId);

      // Filter at DB level when scope is 'assigned'
      if (tasksScope === 'assigned' && currentProfileId) {
        query = query.eq("assigned_to_stakeholder_id", currentProfileId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Map database fields to our interface (assigned_to_contractor_id is deprecated, use assigned_to_stakeholder_id)
      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        assigned_to_stakeholder_id: task.assigned_to_stakeholder_id || task.assigned_to_contractor_id || null,
      }));

      setTasks(mappedTasks as Task[]);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        members.push({
          id: projectData.profiles.id,
          name: projectData.profiles.name,
          role: "Owner",
        });
      }

      // Fetch shared team members
      const { data: shares } = await supabase
        .from("project_shares")
        .select("shared_with_user_id, role, profiles!project_shares_shared_with_user_id_fkey(id, name)")
        .eq("project_id", projectId);

      if (shares) {
        const existingIds = new Set(members.map(m => m.id));
        shares.forEach((share: any) => {
          if (share.profiles && !existingIds.has(share.profiles.id)) {
            existingIds.add(share.profiles.id);
            members.push({
              id: share.profiles.id,
              name: share.profiles.name,
              role: share.role,
            });
          }
        });
      }

      setTeamMembers(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchTaskDependencies = async () => {
    try {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select("*")
        .in("task_id", tasks.map(t => t.id));

      if (error) throw error;

      const deps: { [key: string]: TaskDependency[] } = {};
      data?.forEach((dep: any) => {
        if (!deps[dep.task_id]) deps[dep.task_id] = [];
        deps[dep.task_id].push(dep);
      });

      setTaskDependencies(deps);
    } catch (error: any) {
      console.error("Error fetching dependencies:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
          start_date: newTaskStartDate || null,
          finish_date: newTaskFinishDate || null,
          room_id: newTaskRoomId || null,
          budget: newTaskBudget ? parseFloat(newTaskBudget) : null,
          cost_center: newTaskCostCenter || (newTaskCostCenters.length > 0 ? newTaskCostCenters[0] : null),
          cost_centers: newTaskCostCenters.length > 0 ? newTaskCostCenters : null,
          assigned_to_stakeholder_id: newTaskAssignee && newTaskAssignee !== "unassigned" ? newTaskAssignee : null,
          created_by_user_id: profile.id,
        });

      if (error) throw error;

      // Track task creation
      analytics.capture(AnalyticsEvents.TASK_CREATED, {
        has_description: Boolean(newTaskDescription),
        has_room: Boolean(newTaskRoomId),
        has_assignee: Boolean(newTaskAssignee && newTaskAssignee !== "unassigned"),
        has_dates: Boolean(newTaskStartDate || newTaskFinishDate),
        has_budget: Boolean(newTaskBudget),
        priority: newTaskPriority,
      });

      toast({
        title: t('tasks.taskCreated'),
        description: t('tasks.taskCreatedDescription'),
      });

      setDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("");
      setNewTaskStartDate("");
      setNewTaskFinishDate("");
      setNewTaskRoomId("");
      setNewTaskBudget("");
      setNewTaskCostCenter("");
      setNewTaskCostCenters([]);
      setShowCustomCostCenter(false);
      setCustomCostCenterValue("");
      fetchTasks();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setCreating(true);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          start_date: editingTask.start_date || null,
          finish_date: editingTask.finish_date || null,
          room_id: editingTask.room_id || null,
          progress: editingTask.progress,
          assigned_to_stakeholder_id: editingTask.assigned_to_stakeholder_id || null,
          budget: editingTask.budget || null,
          ordered_amount: editingTask.ordered_amount || null,
          payment_status: editingTask.payment_status || null,
          paid_amount: editingTask.paid_amount || null,
          cost_center: editingTask.cost_center || null,
          cost_centers: editingTask.cost_centers || null,
          checklists: editingTask.checklists || [],
        })
        .eq("id", editingTask.id);

      if (error) throw error;

      toast({
        title: t('tasks.taskUpdated'),
        description: t('tasks.taskUpdatedDescription'),
      });

      setEditDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAddDependency = async (taskId: string, dependsOnTaskId: string) => {
    try {
      const { error } = await supabase
        .from("task_dependencies")
        .insert({
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
        });

      if (error) throw error;

      toast({
        title: t('tasks.dependencyAdded'),
        description: t('tasks.dependencyAddedDescription'),
      });

      fetchTaskDependencies();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      const { error } = await supabase
        .from("task_dependencies")
        .delete()
        .eq("id", dependencyId);

      if (error) throw error;

      toast({
        title: t('tasks.dependencyRemoved'),
        description: t('tasks.dependencyRemovedDescription'),
      });

      fetchTaskDependencies();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchEditTaskMaterials = async (taskId: string) => {
    const { data } = await supabase
      .from("materials")
      .select("id, name, quantity, unit, price_per_unit, price_total, status")
      .eq("task_id", taskId);
    setEditTaskMaterials(data || []);
  };

  const handleCreatePurchaseOrder = async () => {
    if (!editingTask || !poName.trim()) return;
    setCreatingPO(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("materials")
        .insert({
          name: poName.trim(),
          quantity: parseFloat(poQuantity) || 1,
          unit: poUnit,
          price_per_unit: poPricePerUnit ? parseFloat(poPricePerUnit) : null,
          status: "submitted",
          task_id: editingTask.id,
          project_id: projectId,
          created_by_user_id: profile.id,
        });

      if (error) throw error;

      toast({
        title: t('common.success', 'Success'),
        description: t('taskPanel.poCreated', 'Purchase order created and linked to task'),
      });

      setPoName("");
      setPoDescription("");
      setPoQuantity("1");
      setPoUnit("pcs");
      setPoPricePerUnit("");
      setPoDialogOpen(false);
      fetchEditTaskMaterials(editingTask.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error creating purchase order:", error);
      toast({
        title: t('common.error', 'Error'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setCreatingPO(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: t('tasks.statusUpdated'),
        description: t('tasks.statusUpdatedDescription', { status: newStatus.replace('_', ' ') }),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning" />;
      case "waiting":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  // Filter tasks based on selected filters
  const filteredTasks = tasks.filter(task => {
    if (filterStatuses.size > 0 && !filterStatuses.has(task.status)) return false;
    if (filterAssignees.size > 0) {
      const val = task.assigned_to_stakeholder_id || "unassigned";
      if (!filterAssignees.has(val)) return false;
    }
    if (filterRooms.size > 0) {
      const val = task.room_id || "unassigned";
      if (!filterRooms.has(val)) return false;
    }
    if (filterCostCenters.size > 0) {
      const ccs = task.cost_centers || (task.cost_center ? [task.cost_center] : []);
      if (ccs.length === 0 && !filterCostCenters.has("none")) return false;
      if (ccs.length > 0 && !ccs.some(cc => filterCostCenters.has(cc))) return false;
    }
    return true;
  });

  // Sort tasks for table view
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof Task];
    let bValue: any = b[sortColumn as keyof Task];

    // Handle null values
    if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

    // Convert to comparable values
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Group tasks by status (supporting both old and new status values)
  // Note: 'done' is a legacy status that maps to 'completed'
  const statusOrder = ['planned', 'to_do', 'in_progress', 'waiting', 'completed', 'done', 'cancelled'] as const;
  const statusLabels: Record<string, string> = {
    planned: t('statuses.planned', 'Planned'),
    to_do: t('statuses.toDo'),
    in_progress: t('statuses.inProgress'),
    waiting: t('statuses.waiting', 'Waiting'),
    completed: t('statuses.completed'),
    done: t('statuses.completed'), // Legacy status, same as completed
    cancelled: t('statuses.cancelled', 'Cancelled'),
  };
  
  // Group tasks by status and find any unknown statuses
  const groupedTasks = statusOrder.reduce((acc, status) => {
    const tasksForStatus = filteredTasks.filter(t => t.status === status);
    acc[status] = tasksForStatus;
    return acc;
  }, {} as Record<string, Task[]>);

  // Find tasks with unknown statuses
  const knownStatuses = [...statusOrder];
  const unknownStatusTasks = filteredTasks.filter(t => !knownStatuses.includes(t.status as any));

  // Add unknown status tasks to a catch-all column
  const allStatusesWithUnknown = [...statusOrder];
  if (unknownStatusTasks.length > 0) {
    // Group unknown tasks by their actual status
    unknownStatusTasks.forEach(task => {
      if (!allStatusesWithUnknown.includes(task.status as any)) {
        allStatusesWithUnknown.push(task.status as any);
        groupedTasks[task.status] = groupedTasks[task.status] || [];
        groupedTasks[task.status].push(task);
      }
    });
  }

  // Extract unknown statuses (statuses not in columnOrder)
  const unknownStatuses = allStatusesWithUnknown.filter(status => !columnOrder.includes(status));

  const getAssignedMemberName = (task: Task) => {
    if (!task.assigned_to_stakeholder_id) return null;
    const member = teamMembers.find(m => m.id === task.assigned_to_stakeholder_id);
    return member?.name;
  };

  // Calculate counts for filter options
  const getStatusCount = (status: string) => tasks.filter(t => t.status === status).length;

  const getAssigneeCount = (assigneeId: string) => {
    if (assigneeId === "unassigned") return tasks.filter(t => !t.assigned_to_stakeholder_id).length;
    return tasks.filter(t => t.assigned_to_stakeholder_id === assigneeId).length;
  };

  const getRoomCount = (roomId: string) => {
    if (roomId === "unassigned") return tasks.filter(t => !t.room_id).length;
    return tasks.filter(t => t.room_id === roomId).length;
  };

  const getCostCenterCount = (ccId: string) => {
    if (ccId === "none") return tasks.filter(t => {
      const ccs = t.cost_centers || (t.cost_center ? [t.cost_center] : []);
      return ccs.length === 0;
    }).length;
    return tasks.filter(t => {
      const ccs = t.cost_centers || (t.cost_center ? [t.cost_center] : []);
      return ccs.includes(ccId);
    }).length;
  };

  // Build cost center filter options from defaults + custom values in tasks
  const allCostCenterIds = new Set<string>();
  tasks.forEach(t => {
    const ccs = t.cost_centers || (t.cost_center ? [t.cost_center] : []);
    ccs.forEach(cc => allCostCenterIds.add(cc));
  });
  const defaultCcIds = DEFAULT_COST_CENTERS.map(cc => cc.id);
  const customCcIds = [...allCostCenterIds].filter(id => !defaultCcIds.includes(id));

  const toggleFilterValue = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  // Column name editing handlers
  const handleStartEditColumnName = (status: string, currentName: string) => {
    setEditingColumnName(status);
    setEditingColumnValue(currentName);
  };

  const handleSaveColumnName = (status: string) => {
    if (editingColumnValue.trim()) {
      const newNames = { ...customColumnNames, [status]: editingColumnValue.trim() };
      setCustomColumnNames(newNames);
      localStorage.setItem(`kanban-column-names-${projectId}`, JSON.stringify(newNames));
    } else {
      // Remove custom name if empty (revert to default)
      const newNames = { ...customColumnNames };
      delete newNames[status];
      setCustomColumnNames(newNames);
      localStorage.setItem(`kanban-column-names-${projectId}`, JSON.stringify(newNames));
    }
    setEditingColumnName(null);
    setEditingColumnValue("");
  };

  const handleCancelEditColumnName = () => {
    setEditingColumnName(null);
    setEditingColumnValue("");
  };

  // Drag and drop handlers for columns
  const handleColumnDragStart = (status: string) => {
    setDraggedColumn(status);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColumnDrop = (targetStatus: string) => {
    if (!draggedColumn || draggedColumn === targetStatus) {
      setDraggedColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetStatus);

    // Remove dragged column and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    localStorage.setItem(`kanban-column-order-${projectId}`, JSON.stringify(newOrder));
    setDraggedColumn(null);
  };

  // Drag and drop handlers for tasks
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: string) => {
    if (!draggedTask) return;
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", draggedTask.id);

      if (error) throw error;

      toast({
        title: t('tasks.taskUpdated'),
        description: t('tasks.taskMovedTo', { status: statusLabels[newStatus as keyof typeof statusLabels] }),
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDraggedTask(null);
    }
  };

  const getChecklistCounts = (task: Task) => {
    const checklists = task.checklists || [];
    let total = 0;
    let completed = 0;
    for (const cl of checklists) {
      for (const item of cl.items) {
        total++;
        if (item.completed) completed++;
      }
    }
    return { total, completed };
  };

  const TaskCard = ({ task }: { task: Task }) => {
    // Support both single and multiple cost centers
    const costCenters = task.cost_centers || (task.cost_center ? [task.cost_center] : []);
    
    const getPriorityIcon = (priority: string) => {
      switch (priority) {
        case "high":
          return "🔴";
        case "medium":
          return "🟡";
        case "low":
          return "🟢";
        default:
          return "";
      }
    };

    return (
      <Card 
        key={task.id} 
        className="cursor-move hover:shadow-md transition-all bg-background p-3 group"
        draggable
        onDragStart={() => handleDragStart(task)}
        onDragEnd={() => setDraggedTask(null)}
        onClick={() => {
          setEditingTask(task);
          setEditDialogOpen(true);
        }}
      >
        <div className="space-y-2">
          {/* Task Title */}
          <p className={`text-sm font-medium leading-tight ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>

          {/* Room name */}
          {task.room_id && (() => {
            const roomName = rooms.find(r => r.id === task.room_id)?.name;
            return roomName ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {roomName}
              </p>
            ) : null;
          })()}

          {/* Icons Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Icon */}
            {getPriorityIcon(task.priority) && (
              <span className="text-xs" title={`${task.priority} priority`}>
                {getPriorityIcon(task.priority)}
              </span>
            )}
            
            {/* Cost Center Icons - Multiple */}
            {costCenters.map((center, index) => {
              const CostCenterIcon = getCostCenterIcon(center);
              return CostCenterIcon ? (
                <div key={index} className="flex items-center gap-1 text-muted-foreground" title={center}>
                  <CostCenterIcon className="h-3 w-3" />
                </div>
              ) : null;
            })}
            
            {/* Checklist indicator */}
            {(() => {
              const { total, completed } = getChecklistCounts(task);
              return total > 0 ? (
                <div className="flex items-center gap-0.5 text-muted-foreground" title={`${completed}/${total} checklist items`}>
                  <CheckSquare className="h-3 w-3" />
                  <span className="text-xs">{completed}/{total}</span>
                </div>
              ) : null;
            })()}

            {/* Edit icon - visible on hover */}
            <Pencil className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <ProjectLockBanner lockStatus={lockStatus} />

      {/* Collapsible Timeline Section */}
      {showTimeline && (
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 hover:bg-accent">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{t('projectDetail.timeline')}</span>
                {timelineOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mb-6">
            <Card>
              <CardContent className="p-0">
                <ProjectTimeline projectId={projectId} projectName={projectName} onNavigateToRoom={onNavigateToRoom} currency={currency} />
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex flex-col gap-4">
        {/* Header with title */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{t('tasks.tasks')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('tasks.showingTasks', { filtered: filteredTasks.length, total: tasks.length })}
            </p>
          </div>
        </div>

        {/* Filters, View Toggle, and Add Task button on same row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'kanban' | 'table')}>
            <ToggleGroupItem value="kanban" aria-label="Kanban view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Mobile filter toggle */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden h-9"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <Filter className="h-3 w-3 mr-2" />
            {t('tasks.filter', 'Filter')}
            {(filterStatuses.size + filterAssignees.size + filterRooms.size + filterCostCenters.size) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filterStatuses.size + filterAssignees.size + filterRooms.size + filterCostCenters.size}
              </Badge>
            )}
            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </Button>

          <div className="w-px h-6 bg-border hidden md:block" />

          {/* Filter popovers - collapsible on mobile */}
          <div className={`${mobileFiltersOpen ? 'flex' : 'hidden'} md:flex items-center gap-3 flex-wrap w-full md:w-auto`}>
          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3 w-3 mr-2" />
                {t('tasks.status')}
                {filterStatuses.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{filterStatuses.size}</Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {statusOrder.map(status => {
                  const count = getStatusCount(status);
                  const label = statusLabels[status as keyof typeof statusLabels] || status;
                  return (
                    <label key={status} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={filterStatuses.has(status)}
                        onCheckedChange={() => toggleFilterValue(setFilterStatuses, status)}
                      />
                      <span className="flex-1">{label}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Assignee Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3 w-3 mr-2" />
                {t('tasks.assignee')}
                {filterAssignees.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{filterAssignees.size}</Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox
                    checked={filterAssignees.has("unassigned")}
                    onCheckedChange={() => toggleFilterValue(setFilterAssignees, "unassigned")}
                  />
                  <span className="flex-1">{t('common.unassigned')}</span>
                  <span className="text-xs text-muted-foreground">{getAssigneeCount("unassigned")}</span>
                </label>
                {teamMembers.map(member => (
                  <label key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={filterAssignees.has(member.id)}
                      onCheckedChange={() => toggleFilterValue(setFilterAssignees, member.id)}
                    />
                    <span className="flex-1">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{getAssigneeCount(member.id)}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Room Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3 w-3 mr-2" />
                {t('tasks.room')}
                {filterRooms.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{filterRooms.size}</Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox
                    checked={filterRooms.has("unassigned")}
                    onCheckedChange={() => toggleFilterValue(setFilterRooms, "unassigned")}
                  />
                  <span className="flex-1">{t('tasks.noRoom')}</span>
                  <span className="text-xs text-muted-foreground">{getRoomCount("unassigned")}</span>
                </label>
                {rooms.map(room => (
                  <label key={room.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={filterRooms.has(room.id)}
                      onCheckedChange={() => toggleFilterValue(setFilterRooms, room.id)}
                    />
                    <span className="flex-1">{room.name}</span>
                    <span className="text-xs text-muted-foreground">{getRoomCount(room.id)}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Cost Center Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3 w-3 mr-2" />
                {t('tasks.costCenter')}
                {filterCostCenters.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{filterCostCenters.size}</Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-64 overflow-y-auto">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox
                    checked={filterCostCenters.has("none")}
                    onCheckedChange={() => toggleFilterValue(setFilterCostCenters, "none")}
                  />
                  <span className="flex-1">{t('common.none')}</span>
                  <span className="text-xs text-muted-foreground">{getCostCenterCount("none")}</span>
                </label>
                {DEFAULT_COST_CENTERS.map(cc => {
                  const Icon = cc.icon;
                  return (
                    <label key={cc.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={filterCostCenters.has(cc.id)}
                        onCheckedChange={() => toggleFilterValue(setFilterCostCenters, cc.id)}
                      />
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      <span className="flex-1">{cc.label}</span>
                      <span className="text-xs text-muted-foreground">{getCostCenterCount(cc.id)}</span>
                    </label>
                  );
                })}
                {customCcIds.map(ccId => (
                  <label key={ccId} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={filterCostCenters.has(ccId)}
                      onCheckedChange={() => toggleFilterValue(setFilterCostCenters, ccId)}
                    />
                    <Tag className="h-3 w-3 flex-shrink-0" />
                    <span className="flex-1">{getCostCenterLabel(ccId)}</span>
                    <span className="text-xs text-muted-foreground">{getCostCenterCount(ccId)}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters button (only show when filters are active) */}
          {(filterStatuses.size > 0 || filterAssignees.size > 0 || filterRooms.size > 0 || filterCostCenters.size > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatuses(new Set());
                setFilterAssignees(new Set());
                setFilterRooms(new Set());
                setFilterCostCenters(new Set());
              }}
            >
              {t('tasks.clearFilters')}
            </Button>
          )}
          </div>{/* end filter popovers wrapper */}

          {/* Spacer to push Add Task to the right */}
          <div className="flex-1" />

          {/* Add Task button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('tasks.addTask')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{t('tasks.addNewTask')}</DialogTitle>
              <DialogDescription>
                {t('tasks.addNewTaskDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">{t('tasks.taskTitle')}</Label>
                <Input
                  id="task-title"
                  placeholder={t('tasks.taskTitlePlaceholder')}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">{t('tasks.descriptionOptional')}</Label>
                <Textarea
                  id="task-description"
                  placeholder={t('tasks.descriptionPlaceholder')}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">{t('tasks.priority')}</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
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
                <Label htmlFor="task-assignee">{t('tasks.assignTo')}</Label>
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.unassigned')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} {member.role ? `(${member.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-start-date">{t('tasks.startDateOptional')}</Label>
                  <DatePicker
                    date={newTaskStartDate ? new Date(newTaskStartDate) : undefined}
                    onDateChange={(date) => setNewTaskStartDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-finish-date">{t('tasks.finishDateOptional')}</Label>
                  <DatePicker
                    date={newTaskFinishDate ? new Date(newTaskFinishDate) : undefined}
                    onDateChange={(date) => setNewTaskFinishDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj slutdatum"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-room">{t('tasks.roomOptional')}</Label>
                <Select value={newTaskRoomId} onValueChange={setNewTaskRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('tasks.selectRoom')} />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-budget">{t('tasks.budgetOptional')}</Label>
                <Input
                  id="task-budget"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newTaskBudget}
                  onChange={(e) => setNewTaskBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('tasks.costCentersOptional')}</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {DEFAULT_COST_CENTERS.map((cc) => {
                    const Icon = cc.icon;
                    const isSelected = newTaskCostCenters.includes(cc.id);
                    
                    return (
                      <div key={cc.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-cc-${cc.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newCenters = checked
                              ? [...newTaskCostCenters, cc.id]
                              : newTaskCostCenters.filter(c => c !== cc.id);
                            setNewTaskCostCenters(newCenters);
                            setNewTaskCostCenter(newCenters[0] || "");
                          }}
                        />
                        <label
                          htmlFor={`new-cc-${cc.id}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          <Icon className="h-4 w-4" />
                          {cc.label}
                        </label>
                      </div>
                    );
                  })}
                  {customCostCenters.map((cc) => {
                    const isSelected = newTaskCostCenters.includes(cc);
                    
                    return (
                      <div key={cc} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-cc-custom-${cc}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newCenters = checked
                              ? [...newTaskCostCenters, cc]
                              : newTaskCostCenters.filter(c => c !== cc);
                            setNewTaskCostCenters(newCenters);
                            setNewTaskCostCenter(newCenters[0] || "");
                          }}
                        />
                        <label
                          htmlFor={`new-cc-custom-${cc}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          <Tag className="h-4 w-4" />
                          {cc}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomCostCenter(true)}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  {t('tasks.addCustomCostCenter')}
                </Button>
                {showCustomCostCenter && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder={t('tasks.enterCustomCostCenter')}
                      value={customCostCenterValue}
                      onChange={(e) => setCustomCostCenterValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customCostCenterValue.trim()) {
                            const newCustomCenter = customCostCenterValue.trim();
                            setCustomCostCenters([...customCostCenters, newCustomCenter]);
                            setNewTaskCostCenters([...newTaskCostCenters, newCustomCenter]);
                            setNewTaskCostCenter(newCustomCenter);
                            setShowCustomCostCenter(false);
                            setCustomCostCenterValue("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (customCostCenterValue.trim()) {
                          const newCustomCenter = customCostCenterValue.trim();
                          setCustomCostCenters([...customCostCenters, newCustomCenter]);
                          setNewTaskCostCenters([...newTaskCostCenters, newCustomCenter]);
                          setNewTaskCostCenter(newCustomCenter);
                          setShowCustomCostCenter(false);
                          setCustomCostCenterValue("");
                        }
                      }}
                    >
                      {t('common.add')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowCustomCostCenter(false);
                        setCustomCostCenterValue("");
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
              </div>
              </div>

              {/* Fixed Save Button */}
              <div className="flex-shrink-0 pt-4 border-t mt-4 bg-background sticky bottom-0">
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('tasks.adding')}
                    </>
                  ) : (
                    t('tasks.addTask')
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>{t('tasks.editTask')}</DialogTitle>
              <DialogDescription>
                {t('tasks.editTaskDescription')}
              </DialogDescription>
            </DialogHeader>
            {editingTask && (
              <form onSubmit={handleEditTask} className="flex flex-col flex-1 min-h-0 px-6">
                <div className="space-y-4 overflow-y-auto flex-1 py-4">
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
                  <Label htmlFor="edit-task-description">{t('tasks.description')}</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editingTask.description || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-status">{t('tasks.status')}</Label>
                    <Select 
                      value={editingTask.status} 
                      onValueChange={(value) => setEditingTask({ ...editingTask, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">{t('statuses.planned', 'Planned')}</SelectItem>
                        <SelectItem value="to_do">{t('statuses.toDo')}</SelectItem>
                        <SelectItem value="in_progress">{t('statuses.inProgress')}</SelectItem>
                        <SelectItem value="waiting">{t('statuses.waiting')}</SelectItem>
                        <SelectItem value="completed">{t('statuses.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('statuses.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-priority">{t('tasks.priority')}</Label>
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
                    <Label htmlFor="edit-task-assignee">{t('tasks.assignTo')}</Label>
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
                            {member.name} {member.role ? `(${member.role})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-progress">{t('tasks.progress')}: {editingTask.progress}%</Label>
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
                    <Label htmlFor="edit-task-start-date">{t('tasks.startDate')}</Label>
                    <DatePicker
                      date={editingTask.start_date ? new Date(editingTask.start_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, start_date: date ? date.toISOString().split('T')[0] : null })}
                      placeholder="Välj startdatum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-finish-date">{t('tasks.finishDate')}</Label>
                    <DatePicker
                      date={editingTask.finish_date ? new Date(editingTask.finish_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, finish_date: date ? date.toISOString().split('T')[0] : null })}
                      placeholder="Välj slutdatum"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-room">{t('tasks.room')}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={editingTask.room_id || "none"}
                      onValueChange={(value) =>
                        setEditingTask({
                          ...editingTask,
                          room_id: value === "none" ? null : value
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('tasks.noRoom')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('tasks.noRoom')}</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editingTask.room_id && onNavigateToRoom && (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        className="shrink-0"
                        onClick={() => {
                          setEditDialogOpen(false);
                          onNavigateToRoom(editingTask.room_id!);
                        }}
                        title={t('tasks.viewOnFloorPlan')}
                      >
                        <Map className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-budget">{t('tasks.budget')}</Label>
                    <Input
                      id="edit-task-budget"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingTask.budget?.toString() || ""}
                      onChange={(e) => setEditingTask({ ...editingTask, budget: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-ordered">{t('tasks.ordered')}</Label>
                    <Input
                      id="edit-task-ordered"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingTask.ordered_amount?.toString() || ""}
                      onChange={(e) => setEditingTask({ ...editingTask, ordered_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-paid">{t('tasks.paid')}</Label>
                    <Input
                      id="edit-task-paid"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editingTask.paid_amount?.toString() || ""}
                      onChange={(e) => setEditingTask({ ...editingTask, paid_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                </div>
                {editingTask.budget && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-task-payment-status">{t('tasks.paymentStatus')}</Label>
                      <Select
                        value={editingTask.payment_status || "not_paid"}
                        onValueChange={(value) => {
                          if (value === "input_amount") {
                            setEditingTask({ ...editingTask, payment_status: "partially_paid" });
                          } else {
                            setEditingTask({ ...editingTask, payment_status: value, paid_amount: value === "paid" && editingTask.budget ? editingTask.budget : null });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_paid">{t('tasks.notPaid')}</SelectItem>
                          <SelectItem value="paid">{t('tasks.paid')}</SelectItem>
                          <SelectItem value="billed">{t('tasks.billed')}</SelectItem>
                          <SelectItem value="input_amount">{t('tasks.partiallyPaid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>{t('tasks.costCentersMultiple')}</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {DEFAULT_COST_CENTERS.map((cc) => {
                      const Icon = cc.icon;
                      const isSelected = (editingTask.cost_centers || []).includes(cc.id);
                      
                      return (
                        <div key={cc.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cc-${cc.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentCenters = editingTask.cost_centers || [];
                              const newCenters = checked
                                ? [...currentCenters, cc.id]
                                : currentCenters.filter(c => c !== cc.id);
                              setEditingTask({ 
                                ...editingTask, 
                                cost_centers: newCenters,
                                cost_center: newCenters[0] || null // Keep first for backward compatibility
                              });
                            }}
                          />
                          <label
                            htmlFor={`cc-${cc.id}`}
                            className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <Icon className="h-4 w-4" />
                            {cc.label}
                          </label>
                        </div>
                      );
                    })}
                    {customCostCenters.map((cc) => {
                      const isSelected = (editingTask.cost_centers || []).includes(cc);
                      
                      return (
                        <div key={cc} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cc-custom-${cc}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentCenters = editingTask.cost_centers || [];
                              const newCenters = checked
                                ? [...currentCenters, cc]
                                : currentCenters.filter(c => c !== cc);
                              setEditingTask({ 
                                ...editingTask, 
                                cost_centers: newCenters,
                                cost_center: newCenters[0] || null
                              });
                            }}
                          />
                          <label
                            htmlFor={`cc-custom-${cc}`}
                            className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                          >
                            <Tag className="h-4 w-4" />
                            {cc}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomCostCenter(true)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    {t('tasks.addCustomCostCenter')}
                  </Button>
                  {showCustomCostCenter && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder={t('tasks.enterCustomCostCenter')}
                        value={customCostCenterValue}
                        onChange={(e) => setCustomCostCenterValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customCostCenterValue.trim()) {
                              const newCustomCenter = customCostCenterValue.trim();
                              setCustomCostCenters([...customCostCenters, newCustomCenter]);
                              const currentCenters = editingTask.cost_centers || [];
                              setEditingTask({ 
                                ...editingTask, 
                                cost_centers: [...currentCenters, newCustomCenter],
                                cost_center: editingTask.cost_center || newCustomCenter
                              });
                              setShowCustomCostCenter(false);
                              setCustomCostCenterValue("");
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (customCostCenterValue.trim()) {
                            const newCustomCenter = customCostCenterValue.trim();
                            setCustomCostCenters([...customCostCenters, newCustomCenter]);
                            const currentCenters = editingTask.cost_centers || [];
                            setEditingTask({ 
                              ...editingTask, 
                              cost_centers: [...currentCenters, newCustomCenter],
                              cost_center: editingTask.cost_center || newCustomCenter
                            });
                            setShowCustomCostCenter(false);
                            setCustomCostCenterValue("");
                          }
                        }}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowCustomCostCenter(false);
                          setCustomCostCenterValue("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                {/* Checklists */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('tasks.checklists')}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newChecklist: Checklist = {
                          id: crypto.randomUUID(),
                          title: t('tasks.checklist'),
                          items: [],
                        };
                        setEditingTask({
                          ...editingTask,
                          checklists: [...(editingTask.checklists || []), newChecklist],
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('tasks.addChecklist')}
                    </Button>
                  </div>
                  {(editingTask.checklists || []).map((checklist, clIdx) => {
                    const completedCount = checklist.items.filter(i => i.completed).length;
                    const totalCount = checklist.items.length;
                    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                    const updateChecklist = (updates: Partial<Checklist>) => {
                      const updated = [...(editingTask.checklists || [])];
                      updated[clIdx] = { ...updated[clIdx], ...updates };
                      setEditingTask({ ...editingTask, checklists: updated });
                    };

                    const deleteChecklist = () => {
                      const updated = (editingTask.checklists || []).filter((_, i) => i !== clIdx);
                      setEditingTask({ ...editingTask, checklists: updated });
                    };

                    return (
                      <div key={checklist.id} className="border rounded-lg">
                        <Collapsible defaultOpen>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </CollapsibleTrigger>
                            <Input
                              value={checklist.title}
                              onChange={(e) => updateChecklist({ title: e.target.value })}
                              className="h-7 text-sm font-medium border-none shadow-none px-1 focus-visible:ring-1"
                            />
                            {totalCount > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {completedCount}/{totalCount}
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={deleteChecklist}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          {totalCount > 0 && (
                            <div className="px-3 pb-1">
                              <Progress value={progressPct} className="h-1.5" />
                            </div>
                          )}
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-1">
                              {checklist.items.map((item, itemIdx) => (
                                <div key={item.id} className="flex items-center gap-2 group">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) => {
                                      const newItems = [...checklist.items];
                                      newItems[itemIdx] = { ...newItems[itemIdx], completed: !!checked };
                                      updateChecklist({ items: newItems });
                                    }}
                                  />
                                  <Input
                                    value={item.title}
                                    onChange={(e) => {
                                      const newItems = [...checklist.items];
                                      newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                      updateChecklist({ items: newItems });
                                    }}
                                    className={`h-7 text-sm border-none shadow-none px-1 focus-visible:ring-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      const newItems = checklist.items.filter((_, i) => i !== itemIdx);
                                      updateChecklist({ items: newItems });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Input
                                placeholder={t('tasks.addItem')}
                                className="h-7 text-sm mt-1"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      const newItem: ChecklistItem = {
                                        id: crypto.randomUUID(),
                                        title: val,
                                        completed: false,
                                      };
                                      updateChecklist({ items: [...checklist.items, newItem] });
                                      (e.target as HTMLInputElement).value = "";
                                    }
                                  }
                                }}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label>{t('tasks.dependencies')}</Label>
                  <div className="space-y-2">
                    {taskDependencies[editingTask.id]?.map((dep) => {
                      const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
                      return (
                        <div key={dep.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{depTask?.title}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDependency(dep.id)}
                          >
                            {t('common.remove')}
                          </Button>
                        </div>
                      );
                    })}
                    <Select
                      onValueChange={(value) => handleAddDependency(editingTask.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('tasks.addDependency')} />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks
                          .filter(t => t.id !== editingTask.id && !taskDependencies[editingTask.id]?.some(d => d.depends_on_task_id === t.id))
                          .map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Purchase Orders */}
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <Label className="mb-0">{t('taskPanel.purchaseOrders')} ({editTaskMaterials.length})</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPoDialogOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('common.create')}
                    </Button>
                  </div>
                  {editTaskMaterials.length > 0 ? (
                    <div className="space-y-2">
                      {editTaskMaterials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{material.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {material.quantity} {material.unit}
                              {material.price_per_unit != null && ` • ${formatCurrency(material.price_per_unit, currency, { decimals: 2 })}/${t('common.unit').toLowerCase()}`}
                              {material.price_total != null && ` • ${t('purchases.priceTotal')}: ${formatCurrency(material.price_total, currency, { decimals: 2 })}`}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {material.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('taskPanel.noPurchaseOrdersForTask')}</p>
                  )}
                </div>

                {/* Photos */}
                <Separator className="my-4" />
                <EntityPhotoGallery entityId={editingTask.id} entityType="task" />

                {/* Linked Files */}
                <Separator className="my-4" />
                <TaskFilesList taskId={editingTask.id} projectId={projectId} />

                {/* Comments */}
                <Separator className="my-4" />
                <CommentsSection taskId={editingTask.id} projectId={projectId} />

                {/* Save Button at Bottom of Input Fields */}
                <div className="pt-6 pb-4">
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? t('tasks.updating') : t('tasks.updateTask')}
                  </Button>
                </div>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {loading ? (
        <TaskListSkeleton rows={5} />
      ) : tasks.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('tasks.noTasks')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('tasks.noTasksDescription')}
            </p>
            <Button onClick={() => setDialogOpen(true)} className="mb-4">
              <Plus className="h-4 w-4 mr-2" />
              {t('tasks.addFirstTask')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('tasks.emptyStateTip', 'Tip: Link tasks to rooms for better organization')}
            </p>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('tasks.noTasksMatchFilters')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('tasks.tryAdjustingFilters')}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFilterStatuses(new Set());
                setFilterAssignees(new Set());
                setFilterRooms(new Set());
                setFilterCostCenters(new Set());
              }}
            >
              {t('tasks.clearFilters')}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4 snap-x snap-mandatory">
          <div className="flex gap-4 min-w-min p-2">
            {[...columnOrder, ...unknownStatuses].map((status) => {
              const tasksForStatus = groupedTasks[status] || [];
              const defaultLabel = statusLabels[status as keyof typeof statusLabels] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const displayLabel = customColumnNames[status] || defaultLabel;
              
              return (
                <div 
                  key={status} 
                  draggable
                  onDragStart={() => handleColumnDragStart(status)}
                  onDragOver={handleColumnDragOver}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleColumnDrop(status);
                  }}
                  onDragEnd={() => setDraggedColumn(null)}
                  className={`flex-shrink-0 bg-muted/30 rounded-lg p-3 transition-all snap-center ${
                    tasksForStatus.length === 0 ? 'w-auto' : 'w-[85vw] md:w-80'
                  } ${draggedColumn === status ? 'opacity-50' : ''} cursor-grab active:cursor-grabbing`}
                >
                  <div className="mb-3 flex items-center justify-between bg-background/50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {editingColumnName === status ? (
                        <Input
                          autoFocus
                          value={editingColumnValue}
                          onChange={(e) => setEditingColumnValue(e.target.value)}
                          onBlur={() => handleSaveColumnName(status)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveColumnName(status);
                            } else if (e.key === 'Escape') {
                              handleCancelEditColumnName();
                            }
                          }}
                          className="h-7 text-sm font-semibold px-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h4 
                          className="text-sm font-semibold whitespace-nowrap cursor-text hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditColumnName(status, displayLabel);
                          }}
                          title={t('tasks.clickToRename')}
                        >
                          {displayLabel}
                          {!statusLabels[status as keyof typeof statusLabels] && (
                            <span className="text-xs text-muted-foreground ml-1">({t('common.unknown')})</span>
                          )}
                        </h4>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                      {tasksForStatus.length}
                    </Badge>
                  </div>
                  <div 
                    className="space-y-3 min-h-[200px]"
                    onDragOver={(e) => {
                      e.stopPropagation();
                      handleDragOver(e);
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(status);
                    }}
                  >
                    {tasksForStatus.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {t('tasks.dropTasksHere')}
                      </div>
                    ) : (
                      tasksForStatus.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('title')} className="h-8 px-2">
                        {t('tasks.taskTitle')}
                        {getSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[130px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-8 px-2">
                        {t('tasks.status')}
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="h-8 px-2">
                        {t('tasks.priority')}
                        {getSortIcon('priority')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[150px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('assigned_to_stakeholder_id')} className="h-8 px-2">
                        {t('tasks.assignee')}
                        {getSortIcon('assigned_to_stakeholder_id')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('room_id')} className="h-8 px-2">
                        {t('tasks.room')}
                        {getSortIcon('room_id')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('start_date')} className="h-8 px-2">
                        {t('tasks.startDate')}
                        {getSortIcon('start_date')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('finish_date')} className="h-8 px-2">
                        {t('tasks.finishDate')}
                        {getSortIcon('finish_date')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('progress')} className="h-8 px-2">
                        {t('tasks.progress')}
                        {getSortIcon('progress')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('budget')} className="h-8 px-2">
                        {t('tasks.budget')}
                        {getSortIcon('budget')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[60px]">{t('tasks.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => {
                    const assignedTo = getAssignedMemberName(task);
                    const roomName = rooms.find(r => r.id === task.room_id)?.name;
                    
                    return (
                      <TableRow 
                        key={task.id} 
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setEditingTask(task);
                          setEditDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                              {task.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            {assignedTo ? (
                              <>
                                <Users className="h-3 w-3" />
                                {assignedTo}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">{t('common.unassigned')}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {roomName ? (
                            <span className="text-sm">{roomName}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{t('tasks.noRoom')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.start_date ? (
                            <span className="text-sm">{new Date(task.start_date).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.finish_date ? (
                            <span className="text-sm">{new Date(task.finish_date).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress} className="h-2 w-16" />
                            <span className="text-xs text-muted-foreground">{task.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.budget ? (
                            <span className="text-sm">{formatCurrency(task.budget, currency)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Create Purchase Order Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('taskPanel.createPOForTask')}</DialogTitle>
            <DialogDescription>
              {editingTask && t('taskPanel.poLinkedTo', { title: editingTask.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tt-po-name">{t('purchases.materialName')} *</Label>
              <Input
                id="tt-po-name"
                value={poName}
                onChange={(e) => setPoName(e.target.value)}
                placeholder="e.g. Floor tiles"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tt-po-quantity">{t('common.quantity')}</Label>
                <Input
                  id="tt-po-quantity"
                  type="number"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="tt-po-unit">{t('common.unit')}</Label>
                <Select value={poUnit} onValueChange={setPoUnit}>
                  <SelectTrigger id="tt-po-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">{t('taskPanel.pieces')}</SelectItem>
                    <SelectItem value="sqm">{t('taskPanel.squareMeters')}</SelectItem>
                    <SelectItem value="m">{t('taskPanel.meters')}</SelectItem>
                    <SelectItem value="kg">{t('taskPanel.kilograms')}</SelectItem>
                    <SelectItem value="liters">{t('taskPanel.liters')}</SelectItem>
                    <SelectItem value="hours">{t('taskPanel.hours')}</SelectItem>
                    <SelectItem value="days">{t('taskPanel.days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tt-po-price-per-unit">{t('purchases.pricePerUnit')} ({t('common.optional')})</Label>
              <Input
                id="tt-po-price-per-unit"
                type="number"
                value={poPricePerUnit}
                onChange={(e) => setPoPricePerUnit(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {poQuantity && poPricePerUnit && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('purchases.priceTotal')}: {(parseFloat(poQuantity) * parseFloat(poPricePerUnit)).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreatePurchaseOrder}
                disabled={creatingPO || !poName.trim()}
                className="flex-1"
              >
                {creatingPO ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('purchases.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchases.createOrder')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPoDialogOpen(false)}
                disabled={creatingPO}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksTab;