import { useState, useCallback, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { DEFAULT_COST_CENTERS } from "@/lib/costCenters";
import {
  Pencil,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  Rows3,
  Trash2,
  ClipboardList,
  CheckSquare,
  Circle,
  Paperclip,
} from "lucide-react";
import { useTasksTableView, type TasksTableViewState } from "./useTasksTableView";
import { TaskColumnKey, TaskColumnDef, EXTRA_COLUMN_KEYS } from "./tasksTableTypes";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { getStatusBadgeColor } from "@/lib/statusColors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  task_cost_type: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
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

export interface TasksTableViewProps {
  tasks: Task[];
  projectId: string;
  rooms: { id: string; name: string }[];
  stakeholders: Stakeholder[];
  teamMembers: TeamMember[];
  currency?: string | null;
  isReadOnly?: boolean;
  onTaskClick: (task: Task) => void;
  onTaskUpdated: () => void;
  statusLabels: Record<string, string>;
  getStatusIcon: (status: string) => ReactNode;
  getPriorityColor: (priority: string) => string;
  getAssignedMemberName: (task: Task) => string | null;
  tableViewState?: TasksTableViewState;
  hideToolbar?: boolean;
}

const DB_FIELD_MAP: Record<TaskColumnKey, string> = {
  title: "title",
  status: "status",
  priority: "priority",
  actions: "",
  assignee: "assigned_to_stakeholder_id",
  room: "room_id",
  startDate: "start_date",
  finishDate: "finish_date",
  dueDate: "due_date",
  progress: "progress",
  budget: "budget",
  paidAmount: "paid_amount",
  remaining: "",
  paymentStatus: "payment_status",
  costCenter: "cost_center",
  estimatedHours: "estimated_hours",
  hourlyRate: "hourly_rate",
  subcontractorCost: "subcontractor_cost",
  materialEstimate: "material_estimate",
  markupPercent: "markup_percent",
  dependencies: "",
};

const SORT_FIELD_MAP: Record<TaskColumnKey, keyof Task | null> = {
  title: "title",
  status: "status",
  priority: "priority",
  actions: null,
  assignee: "assigned_to_stakeholder_id",
  room: "room_id",
  startDate: "start_date",
  finishDate: "finish_date",
  dueDate: "due_date",
  progress: "progress",
  budget: "budget",
  paidAmount: "paid_amount",
  remaining: null,
  paymentStatus: "payment_status",
  costCenter: "cost_center",
  estimatedHours: "estimated_hours",
  hourlyRate: "hourly_rate",
  subcontractorCost: "subcontractor_cost",
  materialEstimate: "material_estimate",
  markupPercent: "markup_percent",
  dependencies: null,
};

export function TasksTableView({
  tasks,
  projectId,
  rooms,
  stakeholders,
  teamMembers,
  currency,
  isReadOnly,
  onTaskClick,
  onTaskUpdated,
  statusLabels,
  getStatusIcon,
  getPriorityColor,
  getAssignedMemberName,
  tableViewState: externalState,
  hideToolbar,
}: TasksTableViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const internalState = useTasksTableView(projectId);
  const {
    ALL_COLUMNS,
    visibleColumns,
    visibleExtras,
    toggleExtraColumn,
    sortKey,
    sortDir,
    handleSort,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    dragColIdx,
    dragOverIdx,
    compactRows,
    setCompactRows,
  } = externalState || internalState;

  // Dependencies map: taskId → array of { id, depends_on_task_id, title }
  const [depsMap, setDepsMap] = useState<Map<string, { depId: string; taskId: string; title: string }[]>>(new Map());
  const refreshDeps = useCallback(async () => {
    if (tasks.length === 0) return;
    const { data } = await supabase
      .from("task_dependencies")
      .select("id, task_id, depends_on_task_id")
      .in("task_id", tasks.map(t => t.id));
    if (!data) return;
    const map = new Map<string, { depId: string; taskId: string; title: string }[]>();
    for (const dep of data) {
      const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
      const entry = { depId: dep.id, taskId: dep.depends_on_task_id, title: depTask?.title || "?" };
      const existing = map.get(dep.task_id) || [];
      existing.push(entry);
      map.set(dep.task_id, existing);
    }
    setDepsMap(map);
  }, [tasks]);
  useEffect(() => { refreshDeps(); }, [refreshDeps]);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    col: TaskColumnKey;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    status: string;
    depNames: string[];
  } | null>(null);

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortKey) return 0;
    const field = SORT_FIELD_MAP[sortKey];
    if (!field) return 0;

    const aValue = a[field];
    const bValue = b[field];

    if (aValue === null || aValue === undefined)
      return sortDir === "asc" ? 1 : -1;
    if (bValue === null || bValue === undefined)
      return sortDir === "asc" ? -1 : 1;

    const aComp = typeof aValue === "string" ? aValue.toLowerCase() : aValue;
    const bComp = typeof bValue === "string" ? bValue.toLowerCase() : bValue;

    if (aComp < bComp) return sortDir === "asc" ? -1 : 1;
    if (aComp > bComp) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Inline cell save
  const handleCellSave = useCallback(
    async (taskId: string, colKey: TaskColumnKey, value: unknown) => {
      const dbField = DB_FIELD_MAP[colKey];
      if (!dbField) return;

      // For date fields, auto-adjust the other date if needed to avoid constraint violation
      let updatePayload: Record<string, unknown> = { [dbField]: value };
      if (value && (colKey === "startDate" || colKey === "finishDate")) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const newDate = value as string;
          if (colKey === "startDate" && task.finish_date && newDate > task.finish_date) {
            updatePayload.finish_date = newDate;
          } else if (colKey === "finishDate" && task.start_date && newDate < task.start_date) {
            updatePayload.start_date = newDate;
          }
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", taskId);

      // Cascade date changes to dependent tasks (successors)
      if (!error && value && (colKey === "startDate" || colKey === "finishDate")) {
        const task = tasks.find(t => t.id === taskId);
        const newFinishDate = colKey === "finishDate"
          ? (value as string)
          : (updatePayload.finish_date as string) || task?.finish_date;

        if (newFinishDate) {
          // Find tasks that depend on this one
          const { data: successors } = await supabase
            .from("task_dependencies")
            .select("task_id")
            .eq("depends_on_task_id", taskId);

          if (successors && successors.length > 0) {
            for (const dep of successors) {
              const depTask = tasks.find(t => t.id === dep.task_id);
              if (depTask?.start_date && depTask.start_date < newFinishDate) {
                const daysDiff = Math.ceil(
                  (new Date(newFinishDate).getTime() - new Date(depTask.start_date).getTime()) / 86400000
                );
                const newStart = newFinishDate;
                const depUpdate: Record<string, string> = { start_date: newStart };
                if (depTask.finish_date) {
                  const oldFinish = new Date(depTask.finish_date);
                  oldFinish.setDate(oldFinish.getDate() + daysDiff);
                  depUpdate.finish_date = oldFinish.toISOString().split("T")[0];
                }
                await supabase.from("tasks").update(depUpdate).eq("id", dep.task_id);
              }
            }
          }
        }
      }

      if (error) {
        const isDateConflict = error.code === "23514";
        toast({
          title: t("common.error"),
          description: isDateConflict
            ? t("tasksTable.dateConflict", "Start date must be before or equal to finish date")
            : t("tasksTable.failedToUpdateField"),
          variant: "destructive",
        });
      } else {
        onTaskUpdated();
      }
      setEditingCell(null);
    },
    [onTaskUpdated, t, toast, tasks]
  );

  const handleNumericSave = useCallback(
    (taskId: string, colKey: TaskColumnKey) => {
      const numValue = editValue === "" ? null : parseFloat(editValue);
      if (editValue !== "" && isNaN(numValue as number)) {
        setEditingCell(null);
        return;
      }
      handleCellSave(taskId, colKey, numValue);
    },
    [editValue, handleCellSave]
  );

  const handleProgressSave = useCallback(
    (taskId: string) => {
      const num = parseInt(editValue, 10);
      const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
      handleCellSave(taskId, "progress", clamped);
    },
    [editValue, handleCellSave]
  );

  const getSortIcon = (key: TaskColumnKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    );
  };

  const renderCell = (col: TaskColumnDef, task: Task) => {
    const isEditing =
      editingCell?.rowId === task.id && editingCell?.col === col.key;

    switch (col.key) {
      case "title":
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <span
              className={
                task.status === "completed"
                  ? "line-through text-muted-foreground"
                  : ""
              }
            >
              {task.title}
            </span>
          </div>
        );

      case "status":
        if (isReadOnly) {
          return (
            <Badge className={cn("text-xs border", getStatusBadgeColor(task.status))}>
              {statusLabels[task.status] || task.status}
            </Badge>
          );
        }
        {
          const taskDeps = depsMap.get(task.id) || [];
          const unresolvedDeps = taskDeps.filter(d => {
            const depTask = tasks.find(t => t.id === d.taskId);
            return depTask && depTask.status !== "done" && depTask.status !== "completed";
          });
          const isDepBlocked = unresolvedDeps.length > 0;
          const blockedStatuses = ["in_progress", "completed", "done"];

          const handleStatusSave = (v: string) => {
            if (isDepBlocked && blockedStatuses.includes(v)) {
              // Set pending status for confirmation dialog
              setPendingStatusChange({ taskId: task.id, status: v, depNames: unresolvedDeps.map(d => d.title) });
              return;
            }
            handleCellSave(task.id, "status", v);
          };

          return (
            <Select
              value={task.status}
              onValueChange={handleStatusSave}
            >
              <SelectTrigger
                className={cn("h-8 w-[120px] text-xs border", getStatusBadgeColor(task.status))}
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}{isDepBlocked && blockedStatuses.includes(value) ? " ⚠️" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

      case "priority":
        if (isReadOnly) {
          return (
            <Badge
              variant={getPriorityColor(task.priority) as "default" | "destructive" | "secondary"}
              className="text-xs"
            >
              {task.priority}
            </Badge>
          );
        }
        return (
          <Select
            value={task.priority}
            onValueChange={(v) => handleCellSave(task.id, "priority", v)}
          >
            <SelectTrigger
              className="h-8 w-[90px] text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("tasks.priorityLow")}</SelectItem>
              <SelectItem value="medium">
                {t("tasks.priorityMedium")}
              </SelectItem>
              <SelectItem value="high">{t("tasks.priorityHigh")}</SelectItem>
            </SelectContent>
          </Select>
        );

      case "assignee": {
        if (isReadOnly) {
          const name = getAssignedMemberName(task);
          return name ? (
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-3 w-3" />
              {name}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">
              {t("common.unassigned")}
            </span>
          );
        }
        return (
          <Select
            value={task.assigned_to_stakeholder_id || "unassigned"}
            onValueChange={(v) =>
              handleCellSave(
                task.id,
                "assignee",
                v === "unassigned" ? null : v
              )
            }
          >
            <SelectTrigger
              className="h-8 w-[140px] text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                {t("common.unassigned")}
              </SelectItem>
              {[...stakeholders, ...teamMembers.filter(
                (tm) => !stakeholders.some((s) => s.id === tm.id)
              )].map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "room": {
        if (isReadOnly) {
          const roomName = rooms.find((r) => r.id === task.room_id)?.name;
          return roomName ? (
            <span className="text-sm">{roomName}</span>
          ) : (
            <span className="text-muted-foreground text-xs">
              {t("tasks.noRoom")}
            </span>
          );
        }
        return (
          <Select
            value={task.room_id || "none"}
            onValueChange={(v) =>
              handleCellSave(task.id, "room", v === "none" ? null : v)
            }
          >
            <SelectTrigger
              className="h-8 w-[120px] text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("tasks.noRoom")}</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "startDate":
      case "finishDate":
      case "dueDate": {
        const fieldMap: Record<string, keyof Task> = {
          startDate: "start_date",
          finishDate: "finish_date",
          dueDate: "due_date",
        };
        const dateStr = task[fieldMap[col.key]] as string | null;
        if (isReadOnly) {
          return dateStr ? (
            <span className="text-sm">
              {parseLocalDate(dateStr).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          );
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DatePicker
              date={dateStr ? parseLocalDate(dateStr) : undefined}
              onDateChange={(d) =>
                handleCellSave(
                  task.id,
                  col.key,
                  d ? formatLocalDate(d) : null
                )
              }
              className="h-8 w-[130px] text-xs"
            />
          </div>
        );
      }

      case "progress": {
        if (isReadOnly || !isEditing) {
          return (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => {
                if (isReadOnly) return;
                e.stopPropagation();
                setEditingCell({ rowId: task.id, col: "progress" });
                setEditValue(String(task.progress));
              }}
            >
              <Progress value={task.progress} className="h-2 w-16" />
              <span className="text-xs text-muted-foreground">
                {task.progress}%
              </span>
            </div>
          );
        }
        return (
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20 h-7 text-right text-xs"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleProgressSave(task.id);
              if (e.key === "Escape") setEditingCell(null);
            }}
            onBlur={() => handleProgressSave(task.id)}
            onClick={(e) => e.stopPropagation()}
          />
        );
      }

      case "remaining": {
        const budget = task.budget;
        const paid = task.paid_amount;
        if (budget == null) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        const rem = budget - (paid || 0);
        return (
          <span className={cn("text-sm", rem < 0 && "text-destructive")}>
            {formatCurrency(rem, currency)}
          </span>
        );
      }

      case "budget":
      case "paidAmount":
      case "estimatedHours":
      case "hourlyRate":
      case "subcontractorCost":
      case "materialEstimate":
      case "markupPercent": {
        const fieldMap: Record<string, keyof Task> = {
          budget: "budget",
          paidAmount: "paid_amount",
          estimatedHours: "estimated_hours",
          hourlyRate: "hourly_rate",
          subcontractorCost: "subcontractor_cost",
          materialEstimate: "material_estimate",
          markupPercent: "markup_percent",
        };
        const rawValue = task[fieldMap[col.key]] as number | null;
        const isCurrency = [
          "budget",
          "paidAmount",
          "hourlyRate",
          "subcontractorCost",
          "materialEstimate",
        ].includes(col.key);

        if (isEditing && !isReadOnly) {
          return (
            <Input
              type="number"
              className="w-24 h-7 text-right text-xs"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNumericSave(task.id, col.key);
                if (e.key === "Escape") setEditingCell(null);
              }}
              onBlur={() => handleNumericSave(task.id, col.key)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }

        if (rawValue === null || rawValue === undefined) {
          if (isReadOnly) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }
          return (
            <button
              className="text-muted-foreground text-xs hover:bg-muted px-1 rounded cursor-text"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCell({ rowId: task.id, col: col.key });
                setEditValue("");
              }}
            >
              -
            </button>
          );
        }

        const display = isCurrency
          ? formatCurrency(rawValue, currency)
          : col.key === "markupPercent"
            ? `${rawValue}%`
            : String(rawValue);

        if (isReadOnly) {
          return <span className="text-sm">{display}</span>;
        }

        return (
          <button
            className="hover:bg-muted px-1 rounded cursor-text text-sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ rowId: task.id, col: col.key });
              setEditValue(String(rawValue));
            }}
          >
            {display}
          </button>
        );
      }

      case "paymentStatus": {
        if (isReadOnly) {
          return (
            <Badge variant="outline" className="text-xs">
              {task.payment_status || t("tasks.notPaid")}
            </Badge>
          );
        }
        return (
          <Select
            value={task.payment_status || "not_paid"}
            onValueChange={(v) =>
              handleCellSave(task.id, "paymentStatus", v)
            }
          >
            <SelectTrigger
              className="h-8 w-[130px] text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_paid">{t("tasks.notPaid")}</SelectItem>
              <SelectItem value="paid">{t("tasks.paid")}</SelectItem>
              <SelectItem value="billed">{t("tasks.billed")}</SelectItem>
              <SelectItem value="partially_paid">
                {t("tasks.partiallyPaid")}
              </SelectItem>
            </SelectContent>
          </Select>
        );
      }

      case "costCenter": {
        const currentCC = task.cost_center;
        if (isReadOnly) {
          if (!currentCC) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }
          const label =
            DEFAULT_COST_CENTERS.find((cc) => cc.id === currentCC)?.label ||
            currentCC;
          return <span className="text-sm">{label}</span>;
        }
        return (
          <Select
            value={currentCC || "none"}
            onValueChange={(v) =>
              handleCellSave(
                task.id,
                "costCenter",
                v === "none" ? null : v
              )
            }
          >
            <SelectTrigger
              className="h-8 w-[130px] text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-</SelectItem>
              {DEFAULT_COST_CENTERS.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "actions":
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        );

      case "dependencies": {
        const deps = depsMap.get(task.id) || [];
        const depTitles = deps.map(d => d.title).join(", ");
        const availableTasks = tasks.filter(
          t => t.id !== task.id && !deps.some(d => d.taskId === t.id)
        );

        if (isReadOnly) {
          return deps.length === 0
            ? <span className="text-muted-foreground text-xs">-</span>
            : <span className="text-xs truncate max-w-[150px] block" title={depTitles}>{depTitles}</span>;
        }

        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="text-xs text-left truncate max-w-[180px] block hover:bg-muted px-1 rounded cursor-pointer min-h-[24px]"
                onClick={(e) => e.stopPropagation()}
                title={depTitles || undefined}
              >
                {deps.length === 0
                  ? <span className="text-muted-foreground">-</span>
                  : depTitles}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="max-h-[200px] overflow-y-auto">
                {/* Current dependencies — click to remove */}
                {deps.map((dep) => (
                  <button
                    key={dep.depId}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-destructive/10 text-left"
                    onClick={async () => {
                      await supabase.from("task_dependencies").delete().eq("id", dep.depId);
                      refreshDeps();
                    }}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{dep.title}</span>
                  </button>
                ))}
                {deps.length > 0 && availableTasks.length > 0 && <div className="border-t" />}
                {/* Available tasks — click to add */}
                {availableTasks.map((t) => (
                  <button
                    key={t.id}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left"
                    onClick={async () => {
                      await supabase.from("task_dependencies").insert({
                        task_id: task.id,
                        depends_on_task_id: t.id,
                      });
                      refreshDeps();
                    }}
                  >
                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      case "attachment": {
        const count = (task as Record<string, unknown>).attachmentCount as number | undefined;
        if (!count) return <span className="text-muted-foreground/40">–</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            {count}
          </span>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!hideToolbar && <div className="flex items-center gap-2 flex-wrap">
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
                const col = ALL_COLUMNS.find((c) => c.key === key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={visibleExtras.has(key)}
                      onCheckedChange={() => toggleExtraColumn(key)}
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
          variant={compactRows ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setCompactRows(!compactRows)}
          title={t("tasksTable.compactRows")}
        >
          <Rows3 className="h-4 w-4" />
        </Button>

      </div>}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((col, idx) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        col.width || "",
                        col.align === "right" ? "text-right" : "",
                        "select-none",
                        compactRows && "py-1 text-xs h-8",
                        dragColIdx === idx && "opacity-40",
                        dragOverIdx === idx && dragColIdx !== null && dragColIdx !== idx && "border-l-2 border-primary",
                        idx === 0 && "sticky left-0 z-20 bg-card after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border",
                      )}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                    >
                      {col.key !== "actions" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort(col.key)}
                          className="h-8 px-2"
                        >
                          {col.label}
                          {getSortIcon(col.key)}
                        </Button>
                      ) : (
                        <span className="text-xs">{col.label}</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="py-12"
                    >
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardList className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">{t("tasksTable.noTasks")}</p>
                        <p className="text-xs">{t("tasksTable.noTasksHint", "Add your first task using the button above")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onTaskClick(task)}
                    >
                      {visibleColumns.map((col, colIdx) => (
                        <TableCell
                          key={col.key}
                          className={cn(
                            col.align === "right" ? "text-right" : "",
                            compactRows && "py-1 text-xs",
                            dragOverIdx === colIdx && dragColIdx !== null && dragColIdx !== colIdx && "border-l-2 border-primary",
                            colIdx === 0 && "sticky left-0 z-10 bg-card after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border",
                          )}
                        >
                          {renderCell(col, task)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dependency override confirmation dialog */}
      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tasks.depBlockedTitle", "Dependencies not completed")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tasks.depOverrideDesc", "The following tasks are not yet completed:")}
              <ul className="mt-2 space-y-1">
                {pendingStatusChange?.depNames.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatusChange) {
                  handleCellSave(pendingStatusChange.taskId, "status", pendingStatusChange.status);
                }
                setPendingStatusChange(null);
              }}
            >
              {t("tasks.depOverrideConfirm", "Change anyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
