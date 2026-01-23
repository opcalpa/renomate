import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, CheckCircle2, Circle, Clock, XCircle, Pencil, Users, ChevronDown, DollarSign, Tag, LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Loader2 } from "lucide-react";
import { DEFAULT_COST_CENTERS, getCostCenterIcon, getCostCenterLabel } from "@/lib/costCenters";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MaterialsList from "./MaterialsList";

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
  payment_status: string | null;
  paid_amount: number | null;
  cost_center: string | null;
  cost_centers?: string[] | null; // Multiple cost centers support
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
}

const TasksTab = ({ projectId }: TasksTabProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [canCreateRequests, setCanCreateRequests] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<{ [key: string]: TaskDependency[] }>({});
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [createStakeholderDialogOpen, setCreateStakeholderDialogOpen] = useState(false);
  const [newStakeholderName, setNewStakeholderName] = useState("");
  const [newStakeholderRole, setNewStakeholderRole] = useState<'contractor' | 'client' | 'other'>('contractor');
  const [newStakeholderCategory, setNewStakeholderCategory] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
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
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterRoom, setFilterRoom] = useState<string>("all");
  
  // View mode
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Column order for Kanban view
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`kanban-column-order-${projectId}`);
    return saved ? JSON.parse(saved) : ['discovery', 'to_do', 'in_progress', 'on_hold', 'doing', 'blocked', 'completed', 'done', 'scrapped'];
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

  useEffect(() => {
    fetchTasks();
    checkPermissions();
    fetchTeamMembers();
    fetchTaskDependencies();
    fetchRooms();
  }, [projectId]);

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

      // Check if user can create purchase requests
      const { data: shareData } = await supabase
        .from("project_shares")
        .select("can_create_purchase_requests")
        .eq("project_id", projectId)
        .eq("shared_with_user_id", profile.id)
        .single();

      setCanCreateRequests(shareData?.can_create_purchase_requests || false);
    } catch (error) {
      // User might be the owner, so default to false
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
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map database fields to our interface (assigned_to_contractor_id is deprecated, use assigned_to_stakeholder_id)
      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        assigned_to_stakeholder_id: task.assigned_to_stakeholder_id || task.assigned_to_contractor_id || null,
      }));
      
      setTasks(mappedTasks as Task[]);
    } catch (error: any) {
      toast({
        title: "Error",
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
        shares.forEach((share: any) => {
          if (share.profiles) {
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
          created_by_user_id: profile.id,
        });

      if (error) throw error;

      toast({
        title: "Task created!",
        description: "The task has been added to your project.",
      });

      setDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("medium");
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
        title: "Error",
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
          payment_status: editingTask.payment_status || null,
          paid_amount: editingTask.paid_amount || null,
          cost_center: editingTask.cost_center || null,
          cost_centers: editingTask.cost_centers || null,
        })
        .eq("id", editingTask.id);

      if (error) throw error;

      toast({
        title: "Task updated!",
        description: "The task has been updated successfully.",
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
        title: "Dependency added",
        description: "Task dependency has been created.",
      });

      fetchTaskDependencies();
    } catch (error: any) {
      toast({
        title: "Error",
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
        title: "Dependency removed",
        description: "Task dependency has been removed.",
      });

      fetchTaskDependencies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
        title: "Status updated!",
        description: `Task status changed to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
      case "doing":
        return <Clock className="h-4 w-4 text-warning" />;
      case "blocked":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "on_hold":
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
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned" && task.assigned_to_stakeholder_id !== null) return false;
      if (filterAssignee !== "unassigned" && task.assigned_to_stakeholder_id !== filterAssignee) return false;
    }
    if (filterRoom !== "all") {
      if (filterRoom === "unassigned" && task.room_id !== null) return false;
      if (filterRoom !== "unassigned" && task.room_id !== filterRoom) return false;
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
  const statusOrder = ['discovery', 'to_do', 'in_progress', 'on_hold', 'doing', 'blocked', 'completed', 'done', 'scrapped'] as const;
  const statusLabels = {
    discovery: 'Discovery',
    to_do: 'To Do',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    doing: 'Doing',
    blocked: 'Blocked',
    completed: 'Completed',
    done: 'Done',
    scrapped: 'Scrapped'
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
  const getStatusCount = (status: string) => {
    if (status === "all") return tasks.length;
    return tasks.filter(t => t.status === status).length;
  };

  const getAssigneeCount = (assigneeId: string) => {
    if (assigneeId === "all") return tasks.length;
    if (assigneeId === "unassigned") return tasks.filter(t => !t.assigned_to_stakeholder_id).length;
    return tasks.filter(t => t.assigned_to_stakeholder_id === assigneeId).length;
  };

  const getRoomCount = (roomId: string) => {
    if (roomId === "all") return tasks.length;
    if (roomId === "unassigned") return tasks.filter(t => !t.room_id).length;
    return tasks.filter(t => t.room_id === roomId).length;
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
        title: "Task updated",
        description: `Task moved to ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDraggedTask(null);
    }
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
          <p className={`text-sm font-medium leading-tight ${task.status === "done" || task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          
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
            
            {/* Edit icon - visible on hover */}
            <Pencil className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Header with title */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Tasks</h3>
            <p className="text-sm text-muted-foreground">
              Showing {filteredTasks.length} of {tasks.length} tasks
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

          <div className="w-px h-6 bg-border" />

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses ({getStatusCount("all")})</SelectItem>
              <SelectItem value="discovery">Discovery ({getStatusCount("discovery")})</SelectItem>
              <SelectItem value="to_do">To Do ({getStatusCount("to_do")})</SelectItem>
              <SelectItem value="in_progress">In Progress ({getStatusCount("in_progress")})</SelectItem>
              <SelectItem value="on_hold">On Hold ({getStatusCount("on_hold")})</SelectItem>
              <SelectItem value="doing">Doing ({getStatusCount("doing")})</SelectItem>
              <SelectItem value="blocked">Blocked ({getStatusCount("blocked")})</SelectItem>
              <SelectItem value="completed">Completed ({getStatusCount("completed")})</SelectItem>
              <SelectItem value="done">Done ({getStatusCount("done")})</SelectItem>
              <SelectItem value="scrapped">Scrapped ({getStatusCount("scrapped")})</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter */}
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees ({getAssigneeCount("all")})</SelectItem>
              <SelectItem value="unassigned">Unassigned ({getAssigneeCount("unassigned")})</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({getAssigneeCount(member.id)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Room Filter */}
          <Select value={filterRoom} onValueChange={setFilterRoom}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms ({getRoomCount("all")})</SelectItem>
              <SelectItem value="unassigned">No Room Assigned ({getRoomCount("unassigned")})</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name} ({getRoomCount(room.id)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters button (only show when filters are active) */}
          {(filterStatus !== "all" || filterAssignee !== "all" || filterRoom !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setFilterAssignee("all");
                setFilterRoom("all");
              }}
            >
              Clear filters
            </Button>
          )}

          {/* Spacer to push Add Task to the right */}
          <div className="flex-1" />

          {/* Add Task button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for your renovation project
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  placeholder="Install new cabinets"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description (Optional)</Label>
                <Textarea
                  id="task-description"
                  placeholder="Additional details about this task"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-start-date">Start Date (Optional)</Label>
                  <DatePicker
                    date={newTaskStartDate ? new Date(newTaskStartDate) : undefined}
                    onDateChange={(date) => setNewTaskStartDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-finish-date">Finish Date (Optional)</Label>
                  <DatePicker
                    date={newTaskFinishDate ? new Date(newTaskFinishDate) : undefined}
                    onDateChange={(date) => setNewTaskFinishDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj slutdatum"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-room">Room (Optional)</Label>
                <Select value={newTaskRoomId} onValueChange={setNewTaskRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
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
                <Label htmlFor="task-budget">Budget (Optional)</Label>
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
                <Label>Cost Centers (Optional - Multiple)</Label>
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
                  Add Custom Cost Center
                </Button>
                {showCustomCostCenter && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter custom cost center"
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
              </div>

              {/* Fixed Save Button */}
              <div className="flex-shrink-0 pt-4 border-t mt-4 bg-background sticky bottom-0">
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    "Add Task"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details
              </DialogDescription>
            </DialogHeader>
            {editingTask && (
              <form onSubmit={handleEditTask} className="flex flex-col flex-1 min-h-0 px-6">
                <div className="space-y-4 overflow-y-auto flex-1 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-title">Task Title</Label>
                  <Input
                    id="edit-task-title"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-description">Description</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editingTask.description || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-status">Status</Label>
                    <Select 
                      value={editingTask.status} 
                      onValueChange={(value) => setEditingTask({ ...editingTask, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery">Discovery</SelectItem>
                        <SelectItem value="to_do">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="doing">Doing</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="scrapped">Scrapped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-assignee">Assign To</Label>
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
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
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
                  <Label htmlFor="edit-task-progress">Progress: {editingTask.progress}%</Label>
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
                    <Label htmlFor="edit-task-start-date">Start Date</Label>
                    <DatePicker
                      date={editingTask.start_date ? new Date(editingTask.start_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, start_date: date ? date.toISOString().split('T')[0] : null })}
                      placeholder="Välj startdatum"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-finish-date">Finish Date</Label>
                    <DatePicker
                      date={editingTask.finish_date ? new Date(editingTask.finish_date) : undefined}
                      onDateChange={(date) => setEditingTask({ ...editingTask, finish_date: date ? date.toISOString().split('T')[0] : null })}
                      placeholder="Välj slutdatum"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-room">Room</Label>
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
                      <SelectValue placeholder="No room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No room</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-budget">Budget</Label>
                  <Input
                    id="edit-task-budget"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingTask.budget?.toString() || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, budget: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </div>
                {editingTask.budget && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-task-payment-status">Payment Status</Label>
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
                          <SelectItem value="not_paid">Not Paid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="billed">Billed</SelectItem>
                          <SelectItem value="input_amount">Partially Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editingTask.payment_status === "partially_paid" && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-paid-amount">Paid Amount</Label>
                        <Input
                          id="edit-task-paid-amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={editingTask.paid_amount?.toString() || ""}
                          onChange={(e) => setEditingTask({ ...editingTask, paid_amount: e.target.value ? parseFloat(e.target.value) : null })}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label>Cost Centers (Multiple)</Label>
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
                    Add Custom Cost Center
                  </Button>
                  {showCustomCostCenter && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Enter custom cost center"
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
                <div className="space-y-2">
                  <Label>Dependencies</Label>
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
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                    <Select
                      onValueChange={(value) => handleAddDependency(editingTask.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add dependency..." />
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
                
                {/* Save Button at Bottom of Input Fields */}
                <div className="pt-6 pb-4">
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Updating..." : "Update Task"}
                  </Button>
                </div>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">
              Create tasks to track your renovation work
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Task
            </Button>
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks match your filters</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFilterStatus("all");
                setFilterAssignee("all");
                setFilterRoom("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
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
                  className={`flex-shrink-0 bg-muted/30 rounded-lg p-3 transition-all ${
                    tasksForStatus.length === 0 ? 'w-auto' : 'w-80'
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
                          title="Click to rename"
                        >
                          {displayLabel}
                          {!statusLabels[status as keyof typeof statusLabels] && (
                            <span className="text-xs text-muted-foreground ml-1">(Unknown)</span>
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
                        Drop tasks here
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
                        Task Title
                        {getSortIcon('title')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[130px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="h-8 px-2">
                        Status
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="h-8 px-2">
                        Priority
                        {getSortIcon('priority')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[150px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('assigned_to_stakeholder_id')} className="h-8 px-2">
                        Assignee
                        {getSortIcon('assigned_to_stakeholder_id')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('room_id')} className="h-8 px-2">
                        Room
                        {getSortIcon('room_id')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('start_date')} className="h-8 px-2">
                        Start Date
                        {getSortIcon('start_date')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('finish_date')} className="h-8 px-2">
                        Finish Date
                        {getSortIcon('finish_date')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('progress')} className="h-8 px-2">
                        Progress
                        {getSortIcon('progress')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <Button variant="ghost" size="sm" onClick={() => handleSort('budget')} className="h-8 px-2">
                        Budget
                        {getSortIcon('budget')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
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
                            <span className={task.status === "done" || task.status === "completed" ? "line-through text-muted-foreground" : ""}>
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
                              <span className="text-muted-foreground text-xs">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {roomName ? (
                            <span className="text-sm">{roomName}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No room</span>
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
                            <span className="text-sm">${task.budget.toLocaleString()}</span>
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
    </div>
  );
};

export default TasksTab;