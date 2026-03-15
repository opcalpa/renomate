import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CheckCircle2, Circle, Clock, XCircle, Pencil, Users, ChevronDown, ChevronUp, DollarSign, Tag, LayoutGrid, Table as TableIcon, GripVertical, Filter, CheckSquare, Trash2, X, ShoppingCart, Calendar, MapPin, Map as MapIcon, Loader2, AlertTriangle, Link2, ImageIcon, MessageSquare, Columns3, ToggleLeft } from "lucide-react";
import { TaskListSkeleton } from "@/components/ui/skeleton-screens";
import { DEFAULT_COST_CENTERS, getCostCenterIcon, getCostCenterLabel } from "@/lib/costCenters";
import { formatCurrency } from "@/lib/currency";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MaterialsList from "./MaterialsList";
import { EntityPhotoGallery } from "@/components/shared/EntityPhotoGallery";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { TaskFilesList } from "./TaskFilesList";
import { Separator } from "@/components/ui/separator";
import ProjectTimeline from "./ProjectTimeline";
import { ProjectLockBanner } from "./ProjectLockBanner";
import { useProjectLock } from "@/hooks/useProjectLock";
import { PUBLIC_DEMO_PROJECT_ID } from "@/constants/publicDemo";
import { TasksTableView, useTasksTableView, EXTRA_COLUMN_KEYS } from "./tasks";

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
  // Cost estimation fields
  task_cost_type: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
  labor_cost_percent: number | null;
  material_markup_percent: number | null;
  material_items?: { amount?: number }[] | null;
  // Sub-task / ÄTA fields
  is_ata?: boolean;
  parent_task_id?: string | null;
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
  projectStatus?: string | null;
  tasksScope?: 'all' | 'assigned';
  openEntityId?: string | null;
  onEntityOpened?: () => void;
  onNavigateToRoom?: (roomId: string) => void;
  showTimeline?: boolean;
  currency?: string | null;
  userType?: string | null;
}

const TasksTab = ({ projectId, projectName, projectStatus, tasksScope = 'all', openEntityId, onEntityOpened, onNavigateToRoom, showTimeline = true, currency, userType }: TasksTabProps) => {
  const { t } = useTranslation();
  const isPlanning = projectStatus === "planning";
  const isBuilder = userType !== "homeowner";
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
  const [newTaskIsAta, setNewTaskIsAta] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState<string | null>(null);
  const [taskMaterialSpend, setTaskMaterialSpend] = useState<Map<string, number>>(new Map());
  const [taskMaterialPlanned, setTaskMaterialPlanned] = useState<Map<string, number>>(new Map());
  const [defaultLaborCostPercent, setDefaultLaborCostPercent] = useState(57);
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

  // Table view state (lifted so toolbar can render in parent)
  const tableViewState = useTasksTableView(projectId);

  // Timeline visibility
  const [timelineOpen, setTimelineOpen] = useState(true);
  
  // Column order for Kanban view (filter out legacy 'done' status which is merged into 'completed')
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`kanban-column-order-${projectId}`);
    const order = saved ? JSON.parse(saved) : ['planned', 'to_do', 'in_progress', 'waiting', 'completed', 'cancelled'];
    return order.filter((s: string) => s !== 'done');
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
    } catch (error: unknown) {
      console.error("Error fetching rooms:", error);
    }
  };

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, default_labor_cost_percent")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      setCurrentProfileId(profile.id);
      if (profile.default_labor_cost_percent != null) {
        setDefaultLaborCostPercent(profile.default_labor_cost_percent);
      }

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
    } catch (error: unknown) {
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

      const [{ data, error }, materialsRes] = await Promise.all([
        query.order("created_at", { ascending: false }),
        supabase
          .from("materials")
          .select("task_id, price_total, status, quantity, price_per_unit")
          .eq("project_id", projectId)
          .eq("exclude_from_budget", false)
          .not("task_id", "is", null),
      ]);

      if (error) throw error;

      // Build material spend map per task (exclude planned — those are budget, not spend)
      const spendMap = new Map<string, number>();
      const plannedMap = new Map<string, number>();
      (materialsRes.data || []).forEach((m: { task_id: string | null; price_total: number | null; status: string | null; quantity: number | null; price_per_unit: number | null }) => {
        if (m.task_id) {
          const cost = m.price_total ?? ((m.quantity || 0) * (m.price_per_unit || 0));
          if (m.status === "planned") {
            plannedMap.set(m.task_id, (plannedMap.get(m.task_id) || 0) + cost);
          } else {
            spendMap.set(m.task_id, (spendMap.get(m.task_id) || 0) + cost);
          }
        }
      });
      setTaskMaterialSpend(spendMap);
      setTaskMaterialPlanned(plannedMap);

      // Map database fields to our interface (assigned_to_contractor_id is deprecated, use assigned_to_stakeholder_id)
      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        assigned_to_stakeholder_id: task.assigned_to_stakeholder_id || task.assigned_to_contractor_id || null,
      }));

      setTasks(mappedTasks as Task[]);
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
          status: "to_do",
          priority: newTaskPriority,
          start_date: newTaskStartDate || null,
          finish_date: newTaskFinishDate || null,
          room_id: newTaskRoomId || null,
          budget: newTaskBudget ? parseFloat(newTaskBudget) : null,
          cost_center: newTaskCostCenter || (newTaskCostCenters.length > 0 ? newTaskCostCenters[0] : null),
          cost_centers: newTaskCostCenters.length > 0 ? newTaskCostCenters : null,
          assigned_to_stakeholder_id: newTaskAssignee && newTaskAssignee !== "unassigned" ? newTaskAssignee : null,
          created_by_user_id: profile.id,
          is_ata: !isPlanning && newTaskIsAta,
          parent_task_id: newTaskParentId || null,
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
      setNewTaskIsAta(false);
      setNewTaskParentId(null);
      fetchTasks();
    } catch (error: unknown) {
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
      const payload: Record<string, unknown> = {
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
      };

      if ("task_cost_type" in editingTask) {
        payload.task_cost_type = editingTask.task_cost_type || "own_labor";
        payload.estimated_hours = editingTask.estimated_hours || null;
        payload.hourly_rate = editingTask.hourly_rate || null;
        payload.subcontractor_cost = editingTask.subcontractor_cost || null;
        payload.markup_percent = editingTask.markup_percent ?? 0;
        payload.material_estimate = editingTask.material_estimate || null;
      }

      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", editingTask.id);

      if (error) throw error;

      toast({
        title: t('tasks.taskUpdated'),
        description: t('tasks.taskUpdatedDescription'),
      });

      setEditDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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

  // Filter tasks based on selected filters (merge 'done' into 'completed' for filtering)
  const filteredTasks = tasks.filter(task => {
    if (filterStatuses.size > 0) {
      const statusMatches = filterStatuses.has(task.status) ||
        (task.status === 'done' && filterStatuses.has('completed'));
      if (!statusMatches) return false;
    }
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

  // Group tasks by status (supporting both old and new status values)
  // Note: 'done' is a legacy status that should be merged into 'completed'
  const statusOrder = ['planned', 'to_do', 'in_progress', 'waiting', 'completed', 'cancelled'] as const;
  const statusLabels: Record<string, string> = {
    planned: t('statuses.planned', 'Planned'),
    to_do: t('statuses.toDo'),
    in_progress: t('statuses.inProgress'),
    waiting: t('statuses.waiting', 'Waiting'),
    completed: t('statuses.completed'),
    cancelled: t('statuses.cancelled', 'Cancelled'),
  };

  // Group tasks by status, merging legacy 'done' status into 'completed'
  const groupedTasks = statusOrder.reduce((acc, status) => {
    const tasksForStatus = filteredTasks.filter(t =>
      t.status === status || (status === 'completed' && t.status === 'done')
    );
    acc[status] = tasksForStatus;
    return acc;
  }, {} as Record<string, Task[]>);

  // Find tasks with unknown statuses ('done' is known but merged into 'completed')
  const knownStatuses = [...statusOrder, 'done'] as string[];
  const unknownStatusTasks = filteredTasks.filter(t => !knownStatuses.includes(t.status));

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

  // Calculate counts for filter options (merge 'done' into 'completed' count)
  const getStatusCount = (status: string) => tasks.filter(t =>
    t.status === status || (status === 'completed' && t.status === 'done')
  ).length;

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
    } catch (error: unknown) {
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

            {/* Material estimate indicator */}
            {task.material_estimate && task.material_estimate > 0 && (
              <div className="flex items-center gap-0.5 text-muted-foreground" title={`${t("taskCost.materialEstimate", "Material")}: ${formatCurrency(task.material_estimate, currency)}`}>
                <ShoppingCart className="h-3 w-3" />
                <span className="text-xs">{formatCurrency(task.material_estimate, currency)}</span>
              </div>
            )}

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
        <Card>
          {/* Mobile-only compact toggle header */}
          <button
            className="flex items-center justify-between w-full px-4 py-3 md:hidden hover:bg-accent/50 transition-colors rounded-t-lg"
            onClick={() => setTimelineOpen(!timelineOpen)}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('projectDetail.timeline')}</span>
            </div>
            {timelineOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {/* On mobile: toggled by button. On desktop: always visible */}
          <div className={cn(!timelineOpen && "hidden md:block")}>
            <CardContent className="p-0">
              <ProjectTimeline projectId={projectId} projectName={projectName} onNavigateToRoom={onNavigateToRoom} currency={currency} isDemo={projectId === PUBLIC_DEMO_PROJECT_ID} />
            </CardContent>
          </div>
        </Card>
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

          {/* Unified Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 relative">
                <Filter className="h-4 w-4" />
                {(filterStatuses.size + filterAssignees.size + filterRooms.size + filterCostCenters.size) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                    {filterStatuses.size + filterAssignees.size + filterRooms.size + filterCostCenters.size}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="max-h-[70vh] overflow-y-auto">
                {/* Status */}
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tasks.status')}</p>
                </div>
                <div className="px-1 pb-2">
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

                <div className="border-t" />

                {/* Assignee */}
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tasks.assignee')}</p>
                </div>
                <div className="px-1 pb-2">
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

                <div className="border-t" />

                {/* Room */}
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tasks.room')}</p>
                </div>
                <div className="px-1 pb-2">
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

                <div className="border-t" />

                {/* Cost Center */}
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('tasks.costCenter')}</p>
                </div>
                <div className="px-1 pb-2">
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

                {/* Clear all */}
                {(filterStatuses.size > 0 || filterAssignees.size > 0 || filterRooms.size > 0 || filterCostCenters.size > 0) && (
                  <>
                    <div className="border-t" />
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setFilterStatuses(new Set());
                          setFilterAssignees(new Set());
                          setFilterRooms(new Set());
                          setFilterCostCenters(new Set());
                        }}
                      >
                        {t('tasks.clearFilters')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Table view toolbar items (inline) */}
          {viewMode === 'table' && (
            <>
              {/* Columns toggle */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" title={t("tasksTable.columns")}>
                    <Columns3 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium mb-2">
                      {t("tasksTable.extraColumns")}
                    </p>
                    {EXTRA_COLUMN_KEYS.map((key) => {
                      const col = tableViewState.ALL_COLUMNS.find((c) => c.key === key);
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={tableViewState.visibleExtras.has(key)}
                            onCheckedChange={() => tableViewState.toggleExtraColumn(key)}
                          />
                          {col?.label}
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Compact toggle */}
              <Button
                variant={tableViewState.compactRows ? "secondary" : "outline"}
                size="sm"
                className="gap-1 h-9"
                onClick={() => tableViewState.setCompactRows(!tableViewState.compactRows)}
              >
                <ToggleLeft className="h-4 w-4" />
                {t("tasksTable.compactRows")}
              </Button>

            </>
          )}

          {/* Spacer to push Add Task to the right */}
          <div className="flex-1" />

          {/* Add Task button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('tasks.addTask')}</span>
                <span className="sm:hidden">{t('tasks.taskShort', 'Arbete')}</span>
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
                    date={newTaskStartDate ? parseLocalDate(newTaskStartDate) : undefined}
                    onDateChange={(date) => setNewTaskStartDate(date ? formatLocalDate(date) : '')}
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-finish-date">{t('tasks.finishDateOptional')}</Label>
                  <DatePicker
                    date={newTaskFinishDate ? parseLocalDate(newTaskFinishDate) : undefined}
                    onDateChange={(date) => setNewTaskFinishDate(date ? formatLocalDate(date) : '')}
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
              {/* Budget post picker — only during active project */}
              {!isPlanning && (() => {
                const budgetPosts = tasks.filter(
                  (t) => !t.is_ata && (t.budget || 0) > 0 && !t.parent_task_id
                );
                // "standalone" = parentId null + not ÄTA, "ata" = parentId null + ÄTA
                const pickerValue = newTaskIsAta ? "ata" : (newTaskParentId ?? "standalone");
                return (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Link2 className="h-4 w-4" />
                      {t('tasks.linkToBudgetPost')}
                    </Label>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                      {budgetPosts.map((bp) => {
                        const spent = taskMaterialSpend.get(bp.id) || 0;
                        return (
                          <label
                            key={bp.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 ${pickerValue === bp.id ? "bg-accent" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="parentTask"
                                checked={pickerValue === bp.id}
                                onChange={() => {
                                  setNewTaskParentId(bp.id);
                                  setNewTaskIsAta(false);
                                }}
                                className="accent-primary"
                              />
                              <span className="text-sm font-medium truncate max-w-[200px]">{bp.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatCurrency(spent)} / {formatCurrency(bp.budget || 0)}
                            </span>
                          </label>
                        );
                      })}
                      {budgetPosts.length > 0 && <Separator className="my-1" />}
                      <label
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 ${pickerValue === "standalone" ? "bg-accent" : ""}`}
                      >
                        <input
                          type="radio"
                          name="parentTask"
                          checked={pickerValue === "standalone"}
                          onChange={() => { setNewTaskParentId(null); setNewTaskIsAta(false); }}
                          className="accent-primary"
                        />
                        <span className="text-sm">{t('tasks.standaloneTask')}</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 ${pickerValue === "ata" ? "bg-accent" : ""}`}
                      >
                        <input
                          type="radio"
                          name="parentTask"
                          checked={pickerValue === "ata"}
                          onChange={() => { setNewTaskParentId(null); setNewTaskIsAta(true); }}
                          className="accent-primary"
                        />
                        <span className="text-sm">{t('tasks.isAta')}</span>
                      </label>
                    </div>
                  </div>
                );
              })()}
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
          <DialogContent className="max-w-2xl lg:max-w-5xl max-h-[90vh] h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
              <DialogTitle className="truncate">{editingTask?.title || t('tasks.editTask')}</DialogTitle>
              <DialogDescription className="sr-only">
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
                {/* Status, Priority, Assignee, Progress — hidden in planning phase */}
                {!isPlanning && (
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
                </div>
                )}
                {/* Dates — hidden in planning phase */}
                {!isPlanning && (
                <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-start-date">{t('tasks.startDate')}</Label>
                    <DatePicker
                      date={editingTask.start_date ? parseLocalDate(editingTask.start_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, start_date: date ? formatLocalDate(date) : null })}
                      placeholder="Välj startdatum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-finish-date">{t('tasks.finishDate')}</Label>
                    <DatePicker
                      date={editingTask.finish_date ? parseLocalDate(editingTask.finish_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, finish_date: date ? formatLocalDate(date) : null })}
                      placeholder="Välj slutdatum"
                    />
                  </div>
                </div>
                </>
                )}
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
                        <MapIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Ekonomi section */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <DollarSign className="h-4 w-4" />
                  {t('taskPanel.finances', 'Finances')}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                {isPlanning ? (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                  <Label className="text-sm font-semibold">{t('taskCost.pricing', 'Pricing')}</Label>

                  {/* Cost type toggle */}
                  <ToggleGroup
                    type="single"
                    value={editingTask.task_cost_type || "own_labor"}
                    onValueChange={(value) => {
                      if (value) setEditingTask({ ...editingTask, task_cost_type: value });
                    }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="own_labor" className="text-xs px-3">
                      {t('taskCost.ownLabor', 'Own labor')}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="subcontractor" className="text-xs px-3">
                      {t('taskCost.subcontractor', 'Subcontractor')}
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {(editingTask.task_cost_type || "own_labor") === "own_labor" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('taskCost.estimatedHours', 'Hours')}</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={editingTask.estimated_hours?.toString() || ""}
                            onChange={(e) => {
                              const hours = e.target.value ? parseFloat(e.target.value) : null;
                              const rate = editingTask.hourly_rate || 0;
                              const labor = (hours || 0) * rate;
                              const material = editingTask.material_estimate || 0;
                              setEditingTask({ ...editingTask, estimated_hours: hours, budget: labor + material || null });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('taskCost.hourlyRate', 'Hourly rate')}</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={editingTask.hourly_rate?.toString() || ""}
                            onChange={(e) => {
                              const rate = e.target.value ? parseFloat(e.target.value) : null;
                              const hours = editingTask.estimated_hours || 0;
                              const labor = hours * (rate || 0);
                              const material = editingTask.material_estimate || 0;
                              setEditingTask({ ...editingTask, hourly_rate: rate, budget: labor + material || null });
                            }}
                          />
                        </div>
                      </div>
                      {(editingTask.estimated_hours && editingTask.hourly_rate) ? (
                        <p className="text-xs text-muted-foreground">
                          {t('taskCost.laborTotal', 'Labor')}: {formatCurrency((editingTask.estimated_hours || 0) * (editingTask.hourly_rate || 0), currency)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('taskCost.subcontractorCost', 'Subcontractor cost')}</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={editingTask.subcontractor_cost?.toString() || ""}
                            onChange={(e) => {
                              const cost = e.target.value ? parseFloat(e.target.value) : null;
                              const markup = editingTask.markup_percent || 0;
                              const withMarkup = (cost || 0) * (1 + markup / 100);
                              const material = editingTask.material_estimate || 0;
                              setEditingTask({ ...editingTask, subcontractor_cost: cost, budget: withMarkup + material || null });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('taskCost.markupPercent', 'Markup %')}</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0"
                            value={editingTask.markup_percent?.toString() || ""}
                            onChange={(e) => {
                              const markup = e.target.value ? parseFloat(e.target.value) : null;
                              const cost = editingTask.subcontractor_cost || 0;
                              const withMarkup = cost * (1 + (markup || 0) / 100);
                              const material = editingTask.material_estimate || 0;
                              setEditingTask({ ...editingTask, markup_percent: markup, budget: withMarkup + material || null });
                            }}
                          />
                        </div>
                      </div>
                      {editingTask.subcontractor_cost ? (
                        <p className="text-xs text-muted-foreground">
                          {t('taskCost.withMarkup', 'With markup')}: {formatCurrency((editingTask.subcontractor_cost || 0) * (1 + (editingTask.markup_percent || 0) / 100), currency)}
                        </p>
                      ) : null}
                    </>
                  )}

                  {/* Material estimate — shared between both types */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('taskCost.materialEstimate', 'Material estimate')}</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      value={editingTask.material_estimate?.toString() || ""}
                      onChange={(e) => {
                        const material = e.target.value ? parseFloat(e.target.value) : null;
                        const costType = editingTask.task_cost_type || "own_labor";
                        let base = 0;
                        if (costType === "own_labor") {
                          base = (editingTask.estimated_hours || 0) * (editingTask.hourly_rate || 0);
                        } else {
                          base = (editingTask.subcontractor_cost || 0) * (1 + (editingTask.markup_percent || 0) / 100);
                        }
                        setEditingTask({ ...editingTask, material_estimate: material, budget: base + (material || 0) || null });
                      }}
                    />
                  </div>

                  {/* Customer price summary */}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('taskCost.customerPrice', 'Customer price')}</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(editingTask.budget || 0, currency)}
                    </span>
                  </div>
                </div>
                ) : isBuilder ? (
                /* Builder active phase — read-only financial summary */
                (() => {
                  const laborTotal = (editingTask.estimated_hours || 0) * (editingTask.hourly_rate || 0);
                  const laborCost = laborTotal * ((editingTask.labor_cost_percent ?? defaultLaborCostPercent) / 100);
                  const ueCost = editingTask.subcontractor_cost || 0;
                  const plannedMatCost = taskMaterialPlanned.get(editingTask.id) || 0;
                  const items = editingTask.material_items || [];
                  const materialCost = plannedMatCost > 0
                    ? plannedMatCost
                    : items.length > 0
                      ? items.reduce((sum, i) => sum + (i.amount || 0), 0)
                      : (editingTask.material_estimate || 0);
                  const estimatedCost = laborCost + ueCost + materialCost;
                  const customerPrice = editingTask.budget || 0;
                  const margin = customerPrice - estimatedCost;
                  const marginPct = customerPrice > 0 ? Math.round((margin / customerPrice) * 100) : 0;
                  const matBudget = materialCost;
                  const matConsumed = taskMaterialSpend.get(editingTask.id) || 0;
                  const matRemaining = matBudget - matConsumed;

                  const originalBudget = tasks.find(t => t.id === editingTask.id)?.budget;
                  const priceChanged = originalBudget != null && customerPrice !== originalBudget && originalBudget > 0;

                  return (
                    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                      <Label className="text-sm font-semibold">{t('budget.financialSummary', 'Financial summary')}</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center space-y-1">
                          <p className="text-xs text-muted-foreground">{t('budget.customerPrice', 'Customer price')}</p>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-7 text-sm text-center font-semibold"
                            value={editingTask.budget?.toString() || ""}
                            onChange={(e) => setEditingTask({ ...editingTask, budget: e.target.value ? parseFloat(e.target.value) : null })}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{t('budget.cost', 'Cost')}</p>
                          <p className="text-sm font-semibold">{formatCurrency(estimatedCost, currency)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{t('budget.result', 'Result')}</p>
                          <p className={`text-sm font-semibold ${margin < 0 ? "text-destructive" : margin > 0 ? "text-green-600" : ""}`}>
                            {formatCurrency(margin, currency)} ({marginPct}%)
                          </p>
                        </div>
                      </div>
                      {matBudget > 0 && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">{t('budget.matBudget', 'Material budget')}</p>
                              <p className="text-sm font-medium">{formatCurrency(matBudget, currency)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">{t('budget.matConsumed', 'Consumed')}</p>
                              <p className="text-sm font-medium">{formatCurrency(matConsumed, currency)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">{t('budget.matRemaining', 'Remaining')}</p>
                              <p className={`text-sm font-medium ${matRemaining < 0 ? "text-destructive" : matRemaining <= matBudget * 0.2 ? "text-amber-500" : "text-green-600"}`}>
                                {formatCurrency(matRemaining, currency)}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                      {priceChanged && (
                        <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{t('budget.priceChangedWarning', 'Customer price differs from original quote amount. This won\'t update the quote.')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()
                ) : (
                /* Homeowner active phase — editable Budget / Ordered / Paid */
                <>
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
                )}
                </>
                )}
                {/* Cost Centers — nested inside Ekonomi, hidden in planning */}
                {!isPlanning && (
                <Collapsible>
                <div className="space-y-2">
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium cursor-pointer hover:text-foreground text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                    {t('tasks.costCentersMultiple')}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
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
                  </CollapsibleContent>
                </div>
                </Collapsible>
                )}
                </CollapsibleContent>
                </Collapsible>

                {/* Remaining advanced sections — hidden in planning phase */}
                {!isPlanning && (
                <>
                {/* Checklistor */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <CheckSquare className="h-4 w-4" />
                  {t('tasks.checklists')}
                  {(editingTask.checklists?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">{editingTask.checklists!.length}</Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-end">
                    {/* Add checklist button aligned right */}
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
                </CollapsibleContent>
                </Collapsible>

                {/* Beroenden (Dependencies) */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <Link2 className="h-4 w-4" />
                  {t('taskPanel.dependencies')}
                  {(taskDependencies[editingTask.id]?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">{taskDependencies[editingTask.id].length}</Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
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
                </CollapsibleContent>
                </Collapsible>

                {/* Inköpsordrar (Purchase Orders) */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <ShoppingCart className="h-4 w-4" />
                  {t('taskPanel.purchaseOrders')}
                  <Badge variant="secondary" className="ml-auto text-xs">{editTaskMaterials.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                <div className="space-y-2">
                  <div className="flex justify-end">
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
                </CollapsibleContent>
                </Collapsible>

                {/* Bilder & Filer (Photos & Files) */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <ImageIcon className="h-4 w-4" />
                  {t('taskPanel.photosAndFiles', 'Photos & Files')}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4">
                <EntityPhotoGallery entityId={editingTask.id} entityType="task" projectId={projectId} />
                <TaskFilesList taskId={editingTask.id} projectId={projectId} />
                </CollapsibleContent>
                </Collapsible>

                {/* Kommentarer (Comments) */}
                <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 text-sm font-semibold cursor-pointer hover:text-foreground text-muted-foreground group">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                  <MessageSquare className="h-4 w-4" />
                  {t('taskPanel.comments', 'Comments')}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                <CommentsSection taskId={editingTask.id} projectId={projectId} />
                </CollapsibleContent>
                </Collapsible>
                </>
                )}

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
        <TasksTableView
          tasks={filteredTasks}
          projectId={projectId}
          rooms={rooms}
          stakeholders={stakeholders}
          teamMembers={teamMembers}
          currency={currency}
          isReadOnly={lockStatus.isLocked}
          onTaskClick={(task) => { setEditingTask(task); setEditDialogOpen(true); }}
          onTaskUpdated={fetchTasks}
          statusLabels={statusLabels}
          getStatusIcon={getStatusIcon}
          getPriorityColor={getPriorityColor}
          getAssignedMemberName={getAssignedMemberName}
          tableViewState={tableViewState}
          hideToolbar
        />
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