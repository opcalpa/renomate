import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Send, ClipboardList, Info, Columns3, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectWorkType,
  computeFloorAreaSqm,
  WORK_TYPE_LABEL_KEYS,
  type RecipeRoom,
} from "@/lib/materialRecipes";
import { formatCurrency } from "@/lib/currency";
import { PlanningRoomList } from "./PlanningRoomList";
import { ShareRfqDialog } from "./ShareRfqDialog";
import { ImportQuotePopover, type ExternalQuote } from "./ImportQuotePopover";
import { ExternalQuoteCell, type QuoteAssignment } from "./ExternalQuoteCell";

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

// ---------------------------------------------------------------------------
// Column visibility config
// ---------------------------------------------------------------------------

type ExtraColumnKey = "description" | "room" | "area" | "quote";

interface ExtraColumnDef {
  key: ExtraColumnKey;
  labelKey: string;
  defaultOn: boolean;
}

const EXTRA_COLUMNS: ExtraColumnDef[] = [
  { key: "description", labelKey: "tasks.description", defaultOn: true },
  { key: "room", labelKey: "tasks.room", defaultOn: true },
  { key: "area", labelKey: "homeownerPlanning.area", defaultOn: true },
  { key: "quote", labelKey: "homeownerPlanning.quote", defaultOn: true },
];

const PREFS_KEY = (projectId: string) => `homeowner-planning-cols-${projectId}`;

function loadVisibleExtras(projectId: string): Set<ExtraColumnKey> {
  try {
    const raw = localStorage.getItem(PREFS_KEY(projectId));
    if (raw) return new Set(JSON.parse(raw) as ExtraColumnKey[]);
  } catch { /* ignore */ }
  return new Set(EXTRA_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeownerPlanningViewProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  currency?: string | null;
  onActivate?: () => void;
  /** When true, hides owner-only actions (activate, import quote, share RFQ) */
  contributorMode?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeownerPlanningView({
  projectId,
  projectName,
  projectAddress,
  currency,
  onActivate,
  contributorMode = false,
}: HomeownerPlanningViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<HomeownerTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Inline add
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "title" | "description" | "room_id" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newRoomName, setNewRoomName] = useState("");

  // Column visibility
  const [visibleExtras, setVisibleExtras] = useState<Set<ExtraColumnKey>>(
    () => loadVisibleExtras(projectId)
  );

  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // External quotes
  const [externalQuotes, setExternalQuotes] = useState<ExternalQuote[]>([]);
  const [quoteAssignments, setQuoteAssignments] = useState<QuoteAssignment[]>([]);

  // Persist column prefs
  useEffect(() => {
    localStorage.setItem(PREFS_KEY(projectId), JSON.stringify([...visibleExtras]));
  }, [visibleExtras, projectId]);

  const toggleColumn = useCallback((key: ExtraColumnKey) => {
    setVisibleExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const show = useMemo(() => ({
    description: visibleExtras.has("description"),
    room: visibleExtras.has("room"),
    area: visibleExtras.has("area"),
    quote: !contributorMode && visibleExtras.has("quote"),
  }), [visibleExtras, contributorMode]);

  // ---------- Fetch ----------
  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, room_id, room_ids, cost_center, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

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

  const fetchExternalQuotes = useCallback(async () => {
    // Fetch quotes
    const { data: quotesData } = await supabase
      .from("external_quotes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    // Fetch all assignments for this project's quotes
    const { data: assignmentsData } = await supabase
      .from("external_quote_assignments")
      .select("id, external_quote_id, task_id, allocated_amount")
      .in(
        "external_quote_id",
        (quotesData ?? []).map((q) => q.id)
      );

    const assignments = (assignmentsData ?? []) as QuoteAssignment[];
    setQuoteAssignments(assignments);

    // Enrich quotes with allocation info
    const enriched: ExternalQuote[] = (quotesData ?? []).map((q) => {
      const qAssignments = assignments.filter((a) => a.external_quote_id === q.id);
      return {
        ...q,
        total_amount: Number(q.total_amount) || 0,
        allocated: qAssignments.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0),
        task_count: qAssignments.length,
      };
    });
    setExternalQuotes(enriched);
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    fetchRooms();
    fetchExternalQuotes();
  }, [fetchTasks, fetchRooms, fetchExternalQuotes]);

  // Resolve room names from room_ids
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const tasksWithRoomNames = tasks.map((task) => {
    const ids = task.room_ids?.length ? task.room_ids : task.room_id ? [task.room_id] : [];
    return {
      ...task,
      room_ids: ids,
      room_names: ids.map((id) => roomMap.get(id)?.name ?? "?"),
    };
  });

  // ---------- Actions ----------
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAddingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: newTitle.trim(),
        status: "to_do",
        created_by_user_id: profile.id,
      });
      if (error) throw error;
      setNewTitle("");
      setIsAdding(false);
      fetchTasks();
    } catch {
      toast({ variant: "destructive", description: t("common.errorSaving") });
    }
    setAddingLoading(false);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  };

  const commitCellEdit = async () => {
    if (!editingCell || editingCell.field === "room_id") return;
    await supabase
      .from("tasks")
      .update({ [editingCell.field]: editValue || null })
      .eq("id", editingCell.taskId);
    setEditingCell(null);
    fetchTasks();
  };

  const handleRoomToggle = useCallback(
    async (taskId: string, roomId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const current = task?.room_ids || [];
      const next = current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId];

      const { error } = await supabase
        .from("tasks")
        .update({ room_ids: next, room_id: next[0] || null })
        .eq("id", taskId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        fetchTasks();
      }
    },
    [tasks, fetchTasks, t, toast]
  );

  const handleClearRooms = useCallback(
    async (taskId: string) => {
      await supabase
        .from("tasks")
        .update({ room_ids: [], room_id: null })
        .eq("id", taskId);
      setEditingCell(null);
      fetchTasks();
    },
    [fetchTasks]
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
        toast({ title: t("common.error"), description: createErr?.message || "Failed", variant: "destructive" });
        return;
      }

      await handleRoomToggle(taskId, room.id);
      setNewRoomName("");
      fetchRooms();
    },
    [projectId, handleRoomToggle, fetchRooms, t, toast]
  );

  // ---------- Activate project ----------
  const handleActivate = async () => {
    setActivating(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: "active" })
        .eq("id", projectId);
      if (error) throw error;
      toast({ description: t("homeownerPlanning.projectActivated", "Project activated!") });
      onActivate?.();
    } catch {
      toast({ variant: "destructive", description: t("common.errorSaving") });
    } finally {
      setActivating(false);
    }
  };

  // ---------- Helpers ----------
  const getTaskAreaSqm = (task: HomeownerTask): number | null => {
    const ids = task.room_ids?.length ? task.room_ids : task.room_id ? [task.room_id] : [];
    if (ids.length === 0) return null;
    let total = 0;
    let hasAny = false;
    for (const id of ids) {
      const room = roomMap.get(id);
      if (!room) continue;
      const area = computeFloorAreaSqm(room as RecipeRoom);
      if (area != null) {
        total += area;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  };

  // ---------- Summary ----------
  const totalTasks = tasks.length;
  const linkedTasks = tasks.filter((t) => {
    const ids = t.room_ids?.length ? t.room_ids : t.room_id ? [t.room_id] : [];
    return ids.length > 0;
  }).length;
  const totalQuoted = quoteAssignments.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);

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
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{t("homeownerPlanning.rfqSummary", "Your renovation plan")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("homeownerPlanning.rfqDescription", "Add tasks and rooms to build a detailed request for quotes")}
                </p>
              </div>
              {!contributorMode && (
              <div className="flex items-center gap-2 shrink-0">
                {totalTasks >= 1 && onActivate && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5"
                    onClick={handleActivate}
                    disabled={activating}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("homeownerPlanning.activateProject", "Activate project")}
                  </Button>
                )}
                <ImportQuotePopover
                  projectId={projectId}
                  quotes={externalQuotes}
                  currency={currency}
                  onQuotesChange={fetchExternalQuotes}
                />
                {totalTasks >= 1 && rooms.length >= 1 && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShareDialogOpen(true)}>
                    <Send className="h-3.5 w-3.5" />
                    {t("homeownerPlanning.shareRfq", "Share as quote request")}
                  </Button>
                )}
              </div>
              )}
            </div>

            <div className={`grid gap-4 mt-4 ${externalQuotes.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{totalTasks}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.tasks", "Tasks")}</div>
              </div>
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{rooms.length}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.rooms", "Rooms")}</div>
              </div>
              {externalQuotes.length > 0 && (
                <div className="rounded-lg border bg-white p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalQuoted, currency)}</div>
                  <div className="text-xs text-muted-foreground">{t("homeownerPlanning.quoted", "Quoted")}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">{t("homeownerPlanning.whatToDo", "What needs to be done?")}</CardTitle>
                <CardDescription>{t("homeownerPlanning.whatToDoDesc", "List every type of work. Connect each task to a room for better estimates.")}</CardDescription>
              </div>
            </div>
            {/* Column toggle */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 shrink-0">
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("budget.columns", "Columns")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52" align="end">
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-2">{t("planningTasks.showColumns", "Show columns")}</p>
                  {EXTRA_COLUMNS.filter((col) => !contributorMode || col.key !== "quote").map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
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
        </CardHeader>
        <CardContent>
          {tasksWithRoomNames.length > 0 && (
            <div className="rounded-md border overflow-hidden mb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t("planningTasks.task", "Task")}</TableHead>
                    {show.description && <TableHead>{t("tasks.description", "Description")}</TableHead>}
                    {show.room && <TableHead className="w-[160px]">{t("tasks.room", "Room")}</TableHead>}
                    {show.area && <TableHead className="w-[80px] text-right hidden sm:table-cell">{t("homeownerPlanning.area", "Area")}</TableHead>}
                    {show.quote && <TableHead className="w-[100px] text-center">{t("homeownerPlanning.quote", "Quote")}</TableHead>}
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksWithRoomNames.map((task) => {
                    const workType = detectWorkType(task);
                    const areaSqm = getTaskAreaSqm(task);
                    return (
                      <TableRow key={task.id}>
                        {/* Title — always visible */}
                        <TableCell className="font-medium py-2.5">
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
                              className="text-left hover:bg-muted px-1.5 py-0.5 rounded cursor-text flex items-center gap-1.5"
                              onClick={() => {
                                setEditingCell({ taskId: task.id, field: "title" });
                                setEditValue(task.title);
                              }}
                            >
                              {workType && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal shrink-0">
                                  {t(WORK_TYPE_LABEL_KEYS[workType], workType)}
                                </Badge>
                              )}
                              {task.title}
                            </button>
                          )}
                        </TableCell>

                        {/* Description */}
                        {show.description && (
                        <TableCell className="text-muted-foreground text-sm py-2.5">
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
                              className="text-left w-full hover:bg-muted px-1.5 py-0.5 rounded cursor-text text-sm text-muted-foreground truncate block max-w-full"
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
                        )}

                        {/* Room — multi-select popover with inline create */}
                        {show.room && (
                        <TableCell className="py-2.5">
                          {editingCell?.taskId === task.id && editingCell?.field === "room_id" ? (
                            <Popover open onOpenChange={(isOpen) => { if (!isOpen) { setEditingCell(null); setNewRoomName(""); } }}>
                              <PopoverTrigger asChild>
                                <button className="text-sm text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                  {task.room_names.length > 0 ? task.room_names.join(", ") : "–"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-1" align="start">
                                <div className="space-y-0.5">
                                  {rooms.map((r) => {
                                    const checked = task.room_ids.includes(r.id);
                                    return (
                                      <label
                                        key={r.id}
                                        className="flex items-center gap-2 w-full text-sm px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => handleRoomToggle(task.id, r.id)}
                                        />
                                        {r.name}
                                      </label>
                                    );
                                  })}
                                  {task.room_ids.length > 0 && (
                                    <button
                                      className="w-full text-left text-xs text-muted-foreground px-2 py-1 hover:bg-muted rounded"
                                      onClick={() => handleClearRooms(task.id)}
                                    >
                                      {t("common.clearAll", "Clear all")}
                                    </button>
                                  )}
                                  <div className="border-t pt-1 mt-1">
                                    <form
                                      className="flex items-center gap-1 px-1"
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        handleCreateRoomAndAssign(task.id, newRoomName);
                                      }}
                                    >
                                      <Input
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
                          ) : (
                            <button
                              className="hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer text-sm text-muted-foreground text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({ taskId: task.id, field: "room_id" });
                                setEditValue("");
                              }}
                            >
                              {task.room_names.length > 0 ? task.room_names.join(", ") : "–"}
                            </button>
                          )}
                        </TableCell>
                        )}

                        {/* Area (m²) */}
                        {show.area && (
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground hidden sm:table-cell py-2.5">
                          {areaSqm != null ? `${areaSqm.toFixed(1)} m²` : "–"}
                        </TableCell>
                        )}

                        {/* Quote */}
                        {show.quote && (
                        <TableCell className="py-2.5">
                          <ExternalQuoteCell
                            taskId={task.id}
                            quotes={externalQuotes}
                            assignment={quoteAssignments.find((a) => a.task_id === task.id) ?? null}
                            currency={currency}
                            onAssignmentChange={fetchExternalQuotes}
                          />
                        </TableCell>
                        )}

                        {/* Delete — always visible */}
                        <TableCell className="py-2.5">
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

      {/* Rooms — reuse builder component */}
      <PlanningRoomList
        projectId={projectId}
        locked={false}
        onRoomChange={fetchRooms}
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
