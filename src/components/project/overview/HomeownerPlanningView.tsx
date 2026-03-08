import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, Send, ClipboardList, Home, Sparkles, Info, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import {
  detectWorkType,
  estimateTaskMultiRoom,
  parseEstimationSettings,
  ALL_WORK_TYPES,
  WORK_TYPE_LABEL_KEYS,
  type RecipeEstimationSettings,
  type RecipeRoom,
} from "@/lib/materialRecipes";
import { PlanningRoomList } from "./PlanningRoomList";
import { ShareRfqDialog } from "./ShareRfqDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomeownerTask {
  id: string;
  title: string;
  description: string | null;
  room_id: string | null;
  room_ids: string[] | null;
  room_names: string[];
  cost_center: string | null;
  status: string;
}

interface Room {
  id: string;
  name: string;
  dimensions: RecipeRoom["dimensions"];
  ceiling_height_mm: number | null;
}

// Average market rates per m² (SEK) for rough cost reference
const MARKET_RATES: Record<string, { low: number; high: number }> = {
  painting: { low: 200, high: 400 },
  flooring: { low: 400, high: 800 },
  tiling: { low: 600, high: 1200 },
  demolition: { low: 150, high: 350 },
  spackling: { low: 150, high: 300 },
  sanding: { low: 100, high: 250 },
  carpentry: { low: 400, high: 900 },
  electrical: { low: 500, high: 1200 },
  plumbing: { low: 600, high: 1500 },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeownerPlanningViewProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  currency?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeownerPlanningView({
  projectId,
  projectName,
  projectAddress,
  currency,
}: HomeownerPlanningViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<HomeownerTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline add
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "title" | "description" } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Estimation settings (for rough cost reference)
  const [estimationSettings, setEstimationSettings] = useState<RecipeEstimationSettings | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // ---------- Fetch ----------
  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, room_id, room_ids, cost_center, status, rooms!tasks_room_id_fkey(name)")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (data) {
      setTasks(
        data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          room_id: t.room_id,
          room_ids: t.room_ids as string[] | null,
          room_names: [],
          cost_center: t.cost_center,
          status: t.status,
        }))
      );
    }
    setLoading(false);
  }, [projectId]);

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name, dimensions, ceiling_height_mm")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (data) setRooms(data as Room[]);
  }, [projectId]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("estimation_settings")
        .eq("user_id", user.id)
        .single();
      if (data?.estimation_settings) {
        setEstimationSettings(parseEstimationSettings(data.estimation_settings as Record<string, unknown>));
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchRooms();
    fetchSettings();
  }, [fetchTasks, fetchRooms, fetchSettings]);

  // Resolve room names from room_ids
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const tasksWithRoomNames = tasks.map((task) => {
    const ids = task.room_ids?.length ? task.room_ids : task.room_id ? [task.room_id] : [];
    return {
      ...task,
      room_names: ids.map((id) => roomMap.get(id)?.name ?? "?"),
    };
  });

  // ---------- Actions ----------
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAddingLoading(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title: newTitle.trim(),
      status: "to_do",
    });
    if (error) {
      toast({ variant: "destructive", description: t("common.errorSaving") });
    } else {
      setNewTitle("");
      setIsAdding(false);
      fetchTasks();
    }
    setAddingLoading(false);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  };

  const updateTaskField = async (taskId: string, field: string, value: unknown) => {
    await supabase.from("tasks").update({ [field]: value }).eq("id", taskId);
    fetchTasks();
  };

  const commitCellEdit = async () => {
    if (!editingCell) return;
    await updateTaskField(editingCell.taskId, editingCell.field, editValue || null);
    setEditingCell(null);
  };

  const assignRoom = async (taskId: string, roomId: string) => {
    // For simplicity, single room assignment. Multi-room via task edit.
    await supabase.from("tasks").update({
      room_id: roomId || null,
      room_ids: roomId ? [roomId] : [],
    }).eq("id", taskId);
    fetchTasks();
  };

  // ---------- Rough cost estimation ----------
  const getEstimatedCostRange = (task: HomeownerTask): { low: number; high: number } | null => {
    const workType = detectWorkType(task);
    if (!workType) return null;

    const ids = task.room_ids?.length ? task.room_ids : task.room_id ? [task.room_id] : [];
    const linkedRooms = ids.map((id) => roomMap.get(id)).filter((r): r is Room => !!r && !!r.dimensions);
    if (linkedRooms.length === 0) return null;

    const result = estimateTaskMultiRoom(task, linkedRooms as RecipeRoom[], estimationSettings ?? undefined);
    if (!result) return null;

    const rates = MARKET_RATES[workType];
    if (!rates) return null;

    return {
      low: Math.round(result.totalAreaSqm * rates.low),
      high: Math.round(result.totalAreaSqm * rates.high),
    };
  };

  // ---------- Summary ----------
  const totalTasks = tasks.length;
  const linkedTasks = tasks.filter((t) => {
    const ids = t.room_ids?.length ? t.room_ids : t.room_id ? [t.room_id] : [];
    return ids.length > 0;
  }).length;

  let totalLow = 0;
  let totalHigh = 0;
  let estimatedCount = 0;
  for (const task of tasksWithRoomNames) {
    const range = getEstimatedCostRange(task);
    if (range) {
      totalLow += range.low;
      totalHigh += range.high;
      estimatedCount++;
    }
  }

  // ---------- Render ----------
  if (loading) {
    return <div className="space-y-4 animate-pulse"><div className="h-32 bg-muted rounded-lg" /><div className="h-48 bg-muted rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      {totalTasks > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{t("homeownerPlanning.rfqSummary", "Your renovation plan")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("homeownerPlanning.rfqDescription", "Add tasks and rooms to build a detailed request for quotes")}
                </p>
              </div>
              {totalTasks >= 1 && rooms.length >= 1 && (
                <Button size="sm" className="gap-1.5" onClick={() => setShareDialogOpen(true)}>
                  <Send className="h-3.5 w-3.5" />
                  {t("homeownerPlanning.shareRfq", "Share as quote request")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{totalTasks}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.tasks", "Tasks")}</div>
              </div>
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{rooms.length}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.rooms", "Rooms")}</div>
              </div>
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">
                  {estimatedCount > 0
                    ? `${(totalLow / 1000).toFixed(0)}–${(totalHigh / 1000).toFixed(0)}k`
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  {t("homeownerPlanning.roughEstimate", "Est. cost (SEK)")}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px]">
                        <p className="text-xs">{t("homeownerPlanning.roughEstimateTooltip", "Rough market range based on area. Actual quotes may differ.")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: What needs to be done? */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{t("homeownerPlanning.whatToDo", "What needs to be done?")}</CardTitle>
              <CardDescription>{t("homeownerPlanning.whatToDoDesc", "List every type of work. Connect each task to a room for better estimates.")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasksWithRoomNames.length > 0 && (
            <div className="rounded-md border overflow-hidden mb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t("tasks.title", "Task")}</TableHead>
                    <TableHead>{t("tasks.description", "Description")}</TableHead>
                    <TableHead className="w-[160px]">{t("tasks.room", "Room")}</TableHead>
                    <TableHead className="w-[140px] text-right">{t("homeownerPlanning.costRange", "Est. range")}</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksWithRoomNames.map((task) => {
                    const costRange = getEstimatedCostRange(task);
                    const workType = detectWorkType(task);
                    return (
                      <TableRow key={task.id}>
                        {/* Title */}
                        <TableCell className="font-medium">
                          {editingCell?.taskId === task.id && editingCell.field === "title" ? (
                            <Input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitCellEdit();
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onBlur={commitCellEdit}
                              className="h-7 text-sm"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left hover:text-primary transition-colors flex items-center gap-1.5"
                              onClick={() => {
                                setEditingCell({ taskId: task.id, field: "title" });
                                setEditValue(task.title);
                              }}
                            >
                              {workType && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                                  {t(WORK_TYPE_LABEL_KEYS[workType], workType)}
                                </Badge>
                              )}
                              {task.title}
                            </button>
                          )}
                        </TableCell>

                        {/* Description */}
                        <TableCell className="text-muted-foreground text-sm">
                          {editingCell?.taskId === task.id && editingCell.field === "description" ? (
                            <Input
                              autoFocus
                              value={editValue}
                              placeholder={t("homeownerPlanning.descPlaceholder", "e.g. white matte paint, keep ceiling")}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitCellEdit();
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onBlur={commitCellEdit}
                              className="h-7 text-sm"
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left w-full hover:text-foreground transition-colors"
                              onClick={() => {
                                setEditingCell({ taskId: task.id, field: "description" });
                                setEditValue(task.description ?? "");
                              }}
                            >
                              {task.description || (
                                <span className="text-muted-foreground/40 italic text-xs">
                                  {t("homeownerPlanning.addDetails", "Add details...")}
                                </span>
                              )}
                            </button>
                          )}
                        </TableCell>

                        {/* Room */}
                        <TableCell>
                          <Select
                            value={task.room_id ?? ""}
                            onValueChange={(v) => assignRoom(task.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder={t("homeownerPlanning.pickRoom", "Pick room")} />
                            </SelectTrigger>
                            <SelectContent>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Cost range */}
                        <TableCell className="text-right text-xs tabular-nums">
                          {costRange ? (
                            <span className="text-muted-foreground">
                              {formatCurrency(costRange.low, currency)}–{formatCurrency(costRange.high, currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>

                        {/* Delete */}
                        <TableCell>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add task */}
          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                placeholder={t("homeownerPlanning.taskPlaceholder", "e.g. Paint living room, new flooring in kitchen...")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                  if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
                }}
                className="flex-1"
                disabled={addingLoading}
              />
              <Button size="sm" onClick={addTask} disabled={addingLoading || !newTitle.trim()}>
                {t("common.add", "Add")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewTitle(""); }}>
                {t("common.cancel", "Cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("homeownerPlanning.addTask", "Add task")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Rooms — reuse builder component */}
      <PlanningRoomList
        projectId={projectId}
        locked={false}
      />

      {/* Prompt: connect tasks to rooms if not done */}
      {totalTasks > 0 && rooms.length > 0 && linkedTasks < totalTasks && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                {t("homeownerPlanning.connectHint", "Connect each task to a room to get estimated costs and create a more detailed quote request.")}
                {" "}<strong>{linkedTasks}/{totalTasks}</strong> {t("homeownerPlanning.tasksConnected", "tasks connected to rooms.")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share RFQ dialog */}
      <ShareRfqDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectId={projectId}
        projectName={projectName}
        projectAddress={projectAddress}
      />
    </div>
  );
}
