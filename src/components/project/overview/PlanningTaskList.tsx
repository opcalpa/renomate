import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, ClipboardList, ArrowRight, Pencil, Trash2, Columns3, Lock, Unlock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { TaskEditDialog } from "../TaskEditDialog";

interface PlanningTask {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  room_id: string | null;
  room_name: string | null;
  status: string;
  task_cost_type: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
  material_markup_percent: number | null;
  material_items: { amount: number; markup_percent: number | null }[] | null;
  labor_cost_percent: number | null;
}

interface Room {
  id: string;
  name: string;
}

type ExtraColumnKey = "hours" | "hourlyRate" | "room" | "costType" | "material" | "profit" | "description";

const EXTRA_COLUMNS: { key: ExtraColumnKey; labelKey: string; defaultOn: boolean }[] = [
  { key: "description", labelKey: "tasks.description", defaultOn: false },
  { key: "hours", labelKey: "taskCost.estimatedHours", defaultOn: true },
  { key: "hourlyRate", labelKey: "taskCost.hourlyRate", defaultOn: true },
  { key: "room", labelKey: "planningTasks.room", defaultOn: false },
  { key: "costType", labelKey: "planningTasks.costType", defaultOn: false },
  { key: "material", labelKey: "taskCost.materialEstimate", defaultOn: false },
  { key: "profit", labelKey: "taskCost.result", defaultOn: true },
];

const DEFAULT_EXTRAS = new Set<ExtraColumnKey>(
  EXTRA_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)
);

interface PlanningTaskListProps {
  projectId: string;
  currency?: string | null;
  onNavigateToTasks?: (taskId?: string) => void;
  onCreateQuote?: () => void;
  locked?: boolean;
}

export function PlanningTaskList({
  projectId,
  currency,
  onNavigateToTasks,
  onCreateQuote,
  locked = false,
}: PlanningTaskListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLaborCostPercent, setProfileLaborCostPercent] = useState<number | null>(null);

  // Local override: user chose to unlock editing despite active quote
  const [lockOverridden, setLockOverridden] = useState(false);
  const effectiveLock = locked && !lockOverridden;

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit dialog state
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // Inline cell editing state
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: "estimated_hours" | "hourly_rate" | "material_estimate" | "budget" | "description" | "room_id";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Inline new room creation
  const [newRoomName, setNewRoomName] = useState("");

  // Column visibility
  const [visibleExtras, setVisibleExtras] = useState<Set<ExtraColumnKey>>(
    () => new Set(DEFAULT_EXTRAS)
  );

  const toggleColumn = (key: ExtraColumnKey) => {
    setVisibleExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const show = useMemo(
    () => ({
      description: visibleExtras.has("description"),
      hours: visibleExtras.has("hours"),
      hourlyRate: visibleExtras.has("hourlyRate"),
      room: visibleExtras.has("room"),
      costType: visibleExtras.has("costType"),
      material: visibleExtras.has("material"),
      profit: visibleExtras.has("profit"),
    }),
    [visibleExtras]
  );

  const extraCount = visibleExtras.size;

  const fetchProfileCostPercent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("default_labor_cost_percent")
        .eq("user_id", user.id)
        .single();
      setProfileLaborCostPercent(data?.default_labor_cost_percent ?? null);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchData = useCallback(async () => {
    const [tasksRes, roomsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId),
    ]);

    const roomMap = new Map(
      (roomsRes.data || []).map((r) => [r.id, r.name])
    );
    setRooms(roomsRes.data || []);

    setTasks(
      (tasksRes.data || []).map((task) => ({
        ...task,
        room_name: task.room_id ? roomMap.get(task.room_id) || null : null,
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
    fetchProfileCostPercent();
  }, [fetchData, fetchProfileCostPercent]);

  const handleQuickAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setAddingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, default_hourly_rate, default_labor_cost_percent")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title,
        status: "planned",
        priority: "medium",
        created_by_user_id: profile.id,
        hourly_rate: profile.default_hourly_rate ?? null,
      });

      if (error) throw error;

      setNewTitle("");
      setIsAdding(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message || String(err);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setAddingLoading(false);
    }
  };

  const handleInlineSave = useCallback(
    async (taskId: string, field: string, rawValue: string) => {
      const numValue = rawValue === "" ? null : parseFloat(rawValue);
      if (rawValue !== "" && isNaN(numValue as number)) {
        setEditingCell(null);
        return;
      }

      // Find the task to compute budget when in detail-calc mode
      const task = tasks.find((t) => t.id === taskId);
      const updates: Record<string, number | null> = { [field]: numValue };

      if (task) {
        // Determine effective values after this edit
        const hours = field === "estimated_hours" ? (numValue || 0) : (task.estimated_hours || 0);
        const rate = field === "hourly_rate" ? (numValue || 0) : (task.hourly_rate || 0);
        const material = field === "material_estimate" ? (numValue || 0) : (task.material_estimate || 0);
        const hasDetailCalc = hours > 0 && rate > 0;

        if (field !== "budget" && hasDetailCalc) {
          const newBudget = (hours * rate) + material || null;
          // Notify user if a manually set price is being overridden
          if (task.budget && task.budget > 0 && newBudget !== task.budget) {
            const wasPreviouslyManual = !(task.estimated_hours && task.hourly_rate);
            if (wasPreviouslyManual) {
              toast({
                description: t("planningTasks.autoPriceEnabled", "Customer price is now auto-calculated from hours \u00d7 hourly rate"),
              });
            }
          }
          updates.budget = newBudget;
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        fetchData();
      }
      setEditingCell(null);
    },
    [fetchData, t, toast, tasks]
  );

  const handleInlineTextSave = useCallback(
    async (taskId: string, field: string, rawValue: string) => {
      const value = rawValue.trim() || null;
      const { error } = await supabase
        .from("tasks")
        .update({ [field]: value })
        .eq("id", taskId);

      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        fetchData();
      }
      setEditingCell(null);
    },
    [fetchData, t, toast]
  );

  const handleInlineRoomSave = useCallback(
    async (taskId: string, roomId: string | null) => {
      const { error } = await supabase
        .from("tasks")
        .update({ room_id: roomId })
        .eq("id", taskId);

      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        fetchData();
      }
      setEditingCell(null);
    },
    [fetchData, t, toast]
  );

  const handleCreateRoomAndAssign = useCallback(
    async (taskId: string, roomName: string) => {
      const name = roomName.trim();
      if (!name) return;

      const { data: room, error: createErr } = await supabase
        .from("rooms")
        .insert({ project_id: projectId, name })
        .select("id")
        .single();

      if (createErr || !room) {
        toast({
          title: t("common.error"),
          description: createErr?.message || "Failed to create room",
          variant: "destructive",
        });
        return;
      }

      await handleInlineRoomSave(taskId, room.id);
      setNewRoomName("");
    },
    [projectId, handleInlineRoomSave, t, toast]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) {
        toast({
          title: t("common.error"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        fetchData();
      }
    },
    [fetchData, t, toast]
  );

  const calcTaskProfit = useCallback((task: PlanningTask) => {
    const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
    const costPct = task.labor_cost_percent ?? profileLaborCostPercent ?? 50;
    const laborProfit = laborTotal * (1 - costPct / 100);

    const ueProfit = (task.subcontractor_cost || 0) * (task.markup_percent || 0) / 100;

    // Material profit
    const items = task.material_items || [];
    let materialProfit = 0;
    if (items.length > 0) {
      const hasPerRow = items.some(i => (i.markup_percent ?? null) !== null);
      if (hasPerRow) {
        materialProfit = items.reduce((sum, i) => sum + (i.amount || 0) * (i.markup_percent || 0) / 100, 0);
      } else {
        const base = items.reduce((sum, i) => sum + (i.amount || 0), 0);
        materialProfit = base * (task.material_markup_percent || 0) / 100;
      }
    } else {
      materialProfit = (task.material_estimate || 0) * (task.material_markup_percent || 0) / 100;
    }

    return laborProfit + ueProfit + materialProfit;
  }, [profileLaborCostPercent]);

  const totalBudget = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalProfit = tasks.reduce((sum, t) => sum + calcTaskProfit(t), 0);
  const pricedCount = tasks.filter((t) => t.budget && t.budget > 0).length;

  // Count visible columns for colspan on inline-add row
  const visibleColCount = 1 + extraCount + 1 + (effectiveLock ? 0 : 1); // task + extras + price + edit

  return (
    <Card className="border-l-4 border-l-primary/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {t("planningTasks.title", "Scope of work")}
            </CardTitle>
            <CardDescription>
              {t("planningTasks.description", "Define tasks to include in your quote")}
            </CardDescription>
          </div>
          {tasks.length > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("planningTasks.estimatedBudget", "Estimated budget")}
                </span>
                <span className="text-base font-semibold">
                  {formatCurrency(totalBudget, currency)}
                </span>
              </div>
              {totalProfit > 0 && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("planningTasks.estimatedProfit", "Est. profit")}
                  </span>
                  <span className={`text-sm font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(totalProfit, currency)}
                  </span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {pricedCount}/{tasks.length} {t("planningTasks.priced", "priced")}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {locked && (
          <Alert variant="default" className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-sm">
                {lockOverridden
                  ? t("planningTasks.unlocked", "Editing enabled — changes won't affect the sent quote")
                  : t("planningTasks.locked", "Scope is locked while a quote is active")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => setLockOverridden(!lockOverridden)}
              >
                {lockOverridden ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    {t("planningTasks.relock", "Lock")}
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    {t("planningTasks.unlock", "Unlock editing")}
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium mb-1">
              {t("planningTasks.empty", "No tasks yet")}
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              {t("planningTasks.emptyHint", "Add the work items that will make up your quote")}
            </p>
            {!effectiveLock && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("planningTasks.addFirst", "Add first task")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      {t("planningTasks.taskName", "Task")}
                    </TableHead>
                    {show.description && (
                      <TableHead className="hidden sm:table-cell w-[200px]">
                        {t("tasks.description", "Description")}
                      </TableHead>
                    )}
                    {show.hours && (
                      <TableHead className="hidden sm:table-cell text-right w-[80px]">
                        {t("taskCost.estimatedHours", "Hours")}
                      </TableHead>
                    )}
                    {show.hourlyRate && (
                      <TableHead className="hidden sm:table-cell text-right w-[100px]">
                        {t("taskCost.hourlyRate", "Hourly rate")}
                      </TableHead>
                    )}
                    {show.room && (
                      <TableHead className="hidden sm:table-cell w-[130px]">
                        {t("planningTasks.room", "Room")}
                      </TableHead>
                    )}
                    {show.costType && (
                      <TableHead className="hidden sm:table-cell w-[120px]">
                        {t("planningTasks.costType", "Type")}
                      </TableHead>
                    )}
                    {show.material && (
                      <TableHead className="hidden sm:table-cell text-right w-[110px]">
                        {t("taskCost.materialEstimate", "Material")}
                      </TableHead>
                    )}
                    <TableHead className="text-right w-[120px]">
                      {t("planningTasks.customerPrice", "Customer price")}
                    </TableHead>
                    {show.profit && (
                      <TableHead className="hidden sm:table-cell text-right w-[110px]">
                        <span className="inline-flex items-center gap-1">
                          {t("taskCost.result", "Result")}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px]">
                                <p className="text-xs">{t("planningTasks.profitTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                      </TableHead>
                    )}
                    {!effectiveLock && <TableHead className="w-[80px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const hasOwnLabor = !!(task.estimated_hours && task.hourly_rate);
                    const hasSubcontractor = !!task.subcontractor_cost;
                    // Detail-calc mode: budget is auto-computed when BOTH hours AND rate are set
                    const isDetailCalc = !!(task.estimated_hours && task.hourly_rate);

                    const renderInlineCell = (
                      field: "estimated_hours" | "hourly_rate" | "material_estimate" | "budget",
                      value: number | null,
                      format: "hours" | "currency",
                    ) => {
                      // Budget is locked when in detail-calc mode
                      const isLocked = field === "budget" && isDetailCalc;
                      const isEditing = editingCell?.taskId === task.id && editingCell?.field === field;

                      if (isEditing && !effectiveLock && !isLocked) {
                        return (
                          <Input
                            type="number"
                            className="w-20 h-7 text-right text-sm"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleInlineSave(task.id, field, editValue);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            onBlur={() => handleInlineSave(task.id, field, editValue)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      }

                      const display = value
                        ? format === "hours"
                          ? `${value}h`
                          : formatCurrency(value, currency)
                        : null;

                      if (effectiveLock || isLocked) {
                        return display ? (
                          <span className={`text-sm ${field === "budget" ? "font-medium" : "text-muted-foreground"}`}>{display}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        );
                      }

                      return (
                        <button
                          className={`hover:bg-muted px-1.5 py-0.5 rounded cursor-text text-sm ${field === "budget" && value ? "font-medium" : "text-muted-foreground"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({ taskId: task.id, field });
                            setEditValue(value != null ? String(value) : "");
                          }}
                        >
                          {display || "–"}
                        </button>
                      );
                    };

                    return (
                    <TableRow
                      key={task.id}
                    >
                      <TableCell className="font-medium py-2.5">
                        <button
                          type="button"
                          className={`text-left hover:underline hover:text-primary transition-colors ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                          onClick={() => setEditTaskId(task.id)}
                        >
                          {task.title}
                        </button>
                      </TableCell>
                      {show.description && (
                        <TableCell className="hidden sm:table-cell py-2.5 max-w-[200px]">
                          {editingCell?.taskId === task.id && editingCell?.field === "description" && !effectiveLock ? (
                            <Input
                              className="h-7 text-sm"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleInlineTextSave(task.id, "description", editValue);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onBlur={() => handleInlineTextSave(task.id, "description", editValue)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : effectiveLock ? (
                            task.description ? (
                              <span className="text-sm text-muted-foreground truncate block" title={task.description}>{task.description}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">–</span>
                            )
                          ) : (
                            <button
                              className="hover:bg-muted px-1.5 py-0.5 rounded cursor-text text-sm text-muted-foreground truncate block max-w-full text-left"
                              title={task.description || undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ taskId: task.id, field: "description" });
                                setEditValue(task.description || "");
                              }}
                            >
                              {task.description || "–"}
                            </button>
                          )}
                        </TableCell>
                      )}
                      {show.hours && (
                        <TableCell className="text-right hidden sm:table-cell py-2.5">
                          {renderInlineCell("estimated_hours", task.estimated_hours, "hours")}
                        </TableCell>
                      )}
                      {show.hourlyRate && (
                        <TableCell className="text-right hidden sm:table-cell py-2.5">
                          {renderInlineCell("hourly_rate", task.hourly_rate, "currency")}
                        </TableCell>
                      )}
                      {show.room && (
                        <TableCell className="hidden sm:table-cell py-2.5">
                          {editingCell?.taskId === task.id && editingCell?.field === "room_id" && !effectiveLock ? (
                            <Popover open onOpenChange={(isOpen) => { if (!isOpen) { setEditingCell(null); setNewRoomName(""); } }}>
                              <PopoverTrigger asChild>
                                <button className="text-sm text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                  {task.room_name || "–"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1" align="start">
                                <div className="space-y-0.5">
                                  <button
                                    className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted ${!task.room_id ? "bg-muted font-medium" : ""}`}
                                    onClick={() => handleInlineRoomSave(task.id, null)}
                                  >
                                    –
                                  </button>
                                  {rooms.map((r) => (
                                    <button
                                      key={r.id}
                                      className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted ${task.room_id === r.id ? "bg-muted font-medium" : ""}`}
                                      onClick={() => handleInlineRoomSave(task.id, r.id)}
                                    >
                                      {r.name}
                                    </button>
                                  ))}
                                  <div className="border-t pt-1 mt-1">
                                    <form
                                      className="flex items-center gap-1 px-1"
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        handleCreateRoomAndAssign(task.id, newRoomName);
                                      }}
                                    >
                                      <Input
                                        autoFocus
                                        placeholder={t("planningTasks.newRoom", "New room...")}
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        className="h-7 text-sm flex-1"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <Button
                                        type="submit"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 shrink-0"
                                        disabled={!newRoomName.trim()}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                    </form>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : effectiveLock ? (
                            <span className="text-sm text-muted-foreground">{task.room_name || "–"}</span>
                          ) : (
                            <button
                              className="hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer text-sm text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ taskId: task.id, field: "room_id" });
                                setEditValue(task.room_id || "");
                              }}
                            >
                              {task.room_name || "–"}
                            </button>
                          )}
                        </TableCell>
                      )}
                      {show.costType && (
                        <TableCell className="hidden sm:table-cell py-2.5">
                          {(hasOwnLabor || hasSubcontractor) ? (
                            <div className="flex flex-wrap gap-1">
                              {hasOwnLabor && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {t("taskCost.ownLabor", "Own labor")}
                                </Badge>
                              )}
                              {hasSubcontractor && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {t("taskCost.subcontractor", "Subcontractor")}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </TableCell>
                      )}
                      {show.material && (
                        <TableCell className="text-right hidden sm:table-cell py-2.5">
                          {renderInlineCell("material_estimate", task.material_estimate, "currency")}
                        </TableCell>
                      )}
                      <TableCell className="text-right py-2.5">
                        {renderInlineCell("budget", task.budget, "currency")}
                      </TableCell>
                      {show.profit && (() => {
                        const rowProfit = calcTaskProfit(task);
                        return (
                          <TableCell className="text-right hidden sm:table-cell py-2.5">
                            {rowProfit > 0 ? (
                              <span className={`text-sm ${rowProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                                {formatCurrency(rowProfit, currency)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">–</span>
                            )}
                          </TableCell>
                        );
                      })()}
                      {!effectiveLock && (
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTaskId(task.id);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })}

                  {/* Inline add row */}
                  {isAdding && !effectiveLock && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={visibleColCount} className="py-2">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleQuickAdd();
                          }}
                        >
                          <Input
                            autoFocus
                            placeholder={t("planningTasks.taskPlaceholder", "e.g. Demolish bathroom")}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="h-8 text-sm"
                            disabled={addingLoading}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-8 px-3"
                            disabled={!newTitle.trim() || addingLoading}
                          >
                            {t("common.add", "Add")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => {
                              setIsAdding(false);
                              setNewTitle("");
                            }}
                          >
                            {t("common.cancel", "Cancel")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-4">
              <div className="flex items-center gap-2">
                {!effectiveLock && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("planningTasks.addTask", "Add task")}
                  </Button>
                )}

                {/* Column visibility toggle */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Columns3 className="h-4 w-4" />
                      {t("budget.columns", "Columns")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52" align="start">
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-2">
                        {t("planningTasks.showColumns", "Show columns")}
                      </p>
                      {EXTRA_COLUMNS.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={visibleExtras.has(col.key)}
                            onCheckedChange={() => toggleColumn(col.key)}
                          />
                          {t(col.labelKey)}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {!effectiveLock && tasks.length > 0 && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => onCreateQuote?.()}
                >
                  {t("projectStatus.cta.generateQuote", "Generate quote")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <TaskEditDialog
        taskId={editTaskId}
        projectId={projectId}
        open={editTaskId !== null}
        onOpenChange={(open) => !open && setEditTaskId(null)}
        onSaved={() => fetchData()}
        currency={currency}
        projectStatus="planning"
      />
    </Card>
  );
}
