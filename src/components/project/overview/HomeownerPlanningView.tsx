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
import { Plus, Trash2, Send, ClipboardList, Info, Columns3, Play, Bell, X, Sparkles, ChevronDown, ChevronRight, Package } from "lucide-react";
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
import { GuestLoginPrompt } from "@/components/guest/GuestLoginPrompt";
import { StartProjectModal } from "./StartProjectModal";
import { useGuestMode } from "@/hooks/useGuestMode";
import { ImportQuotePopover, type ExternalQuote } from "./ImportQuotePopover";
import { ExternalQuoteCell, type QuoteAssignment } from "./ExternalQuoteCell";
import { PlanningSmartImportDialog } from "./PlanningSmartImportDialog";
import {
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_TO_COST_CENTER,
  type TaskCategory,
} from "@/services/aiDocumentService.types";

// Reverse map: cost_center value → Swedish label
const COST_CENTER_LABELS: Record<string, string> = Object.entries(TASK_CATEGORY_TO_COST_CENTER).reduce(
  (acc, [cat, cc]) => {
    if (!acc[cc]) acc[cc] = TASK_CATEGORY_LABELS[cat as TaskCategory];
    return acc;
  },
  {} as Record<string, string>
);

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
  budget: number | null;
  material_estimate: number | null;
  rot_amount: number | null;
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

type ExtraColumnKey = "description" | "room" | "area" | "quote" | "budget" | "materialEstimate" | "rotAmount";

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
  { key: "budget", labelKey: "planningTasks.budget", defaultOn: false },
  { key: "materialEstimate", labelKey: "planningTasks.materialEstimate", defaultOn: false },
  { key: "rotAmount", labelKey: "files.rotAmount", defaultOn: false },
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

interface ProjectReminder {
  id: string;
  titleKey: string;
  bodyKey: string;
  severity: "warning" | "info";
  actionTarget?: string;
  actionKey?: string;
}

interface HomeownerPlanningViewProps {
  projectId: string;
  projectName?: string;
  projectAddress?: string;
  currency?: string | null;
  onActivate?: () => void;
  /** When true, hides owner-only actions (activate, import quote, share RFQ) */
  contributorMode?: boolean;
  reminders?: ProjectReminder[];
  onDismissReminder?: (id: string) => void;
  onDismissAllReminders?: () => void;
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
  reminders = [],
  onDismissReminder,
  onDismissAllReminders,
}: HomeownerPlanningViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isGuest } = useGuestMode();
  const [tasks, setTasks] = useState<HomeownerTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [loginPromptAction, setLoginPromptAction] = useState<"activate" | "share_rfq" | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);

  // Inline add
  const [isAdding, setIsAdding] = useState(false);
  const [smartImportOpen, setSmartImportOpen] = useState(false);
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

  // Material counts per task
  const [materialCounts, setMaterialCounts] = useState<Map<string, number>>(new Map());

  // Category grouping
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
    budget: visibleExtras.has("budget"),
    materialEstimate: visibleExtras.has("materialEstimate"),
    rotAmount: visibleExtras.has("rotAmount"),
  }), [visibleExtras, contributorMode]);

  // ---------- Fetch ----------
  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, room_id, room_ids, cost_center, status, budget, material_estimate, rot_amount")
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
          budget: t.budget,
          material_estimate: t.material_estimate,
          rot_amount: t.rot_amount,
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

  const fetchMaterialCounts = useCallback(async () => {
    const { data } = await supabase
      .from("materials")
      .select("id, task_id")
      .eq("project_id", projectId)
      .not("task_id", "is", null);
    if (data) {
      const counts = new Map<string, number>();
      for (const m of data) {
        if (m.task_id) counts.set(m.task_id, (counts.get(m.task_id) || 0) + 1);
      }
      setMaterialCounts(counts);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    fetchRooms();
    fetchExternalQuotes();
    fetchMaterialCounts();
  }, [fetchTasks, fetchRooms, fetchExternalQuotes, fetchMaterialCounts]);

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
  const totalAreaSqm = rooms.reduce((sum, room) => {
    const area = computeFloorAreaSqm(room as RecipeRoom);
    return sum + (area ?? 0);
  }, 0);
  const totalBudget = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalMaterialEstimate = tasks.reduce((sum, t) => sum + (t.material_estimate || 0), 0);
  const totalRot = tasks.reduce((sum, t) => sum + (t.rot_amount || 0), 0);

  // ---------- Category grouping ----------
  const toggleGroup = useCallback((category: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  type DisplayItem =
    | { type: "task"; task: HomeownerTask & { room_names: string[] } }
    | { type: "groupHeader"; category: string; count: number; budget: number };

  const displayItems = useMemo((): DisplayItem[] => {
    const withRooms = tasksWithRoomNames;
    if (!groupByCategory) return withRooms.map((t) => ({ type: "task" as const, task: t }));

    // Group by cost_center
    const groups = new Map<string, typeof withRooms>();
    for (const task of withRooms) {
      const cat = task.cost_center || "ovrigt";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(task);
    }

    const items: DisplayItem[] = [];
    Array.from(groups.entries()).forEach(([category, groupTasks]) => {
      const groupBudget = groupTasks.reduce((s, t) => s + (t.budget || 0), 0);
      items.push({ type: "groupHeader", category, count: groupTasks.length, budget: groupBudget });
      if (!collapsedGroups.has(category)) {
        for (const task of groupTasks) {
          items.push({ type: "task", task });
        }
      }
    });
    return items;
  }, [tasksWithRoomNames, groupByCategory, collapsedGroups]);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{t("homeownerPlanning.rfqSummary", "Your renovation plan")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("homeownerPlanning.rfqDescription", "Add tasks and rooms to build a detailed request for quotes")}
                </p>
              </div>
              {!contributorMode && (
              <div className="flex flex-wrap items-center gap-2">
                {totalTasks >= 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5"
                    onClick={() => isGuest ? setLoginPromptAction("activate") : setShowStartModal(true)}
                    disabled={activating}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("homeownerPlanning.activateProject", "Start project")}
                  </Button>
                )}
                {/* Reminders popover */}
                {reminders.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 relative">
                        <Bell className="h-3.5 w-3.5" />
                        {t("reminders.sectionTitle", "Reminders")}
                        <span className="h-4 min-w-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-medium flex items-center justify-center">
                          {reminders.length}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{t("reminders.sectionTitle", "Reminders")}</p>
                        {onDismissAllReminders && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={onDismissAllReminders}>
                            {t("reminders.dismissAll", "Clear all")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {reminders.map((r) => (
                          <div key={r.id} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50">
                            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs">{t(r.titleKey)}</p>
                              <p className="text-xs text-muted-foreground">{t(r.bodyKey)}</p>
                            </div>
                            {onDismissReminder && (
                              <button onClick={() => onDismissReminder(r.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{totalTasks}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.tasks", "Tasks")}</div>
              </div>
              <div className="rounded-lg border bg-white p-3 text-center">
                <div className="text-2xl font-bold tabular-nums">{rooms.length}</div>
                <div className="text-xs text-muted-foreground">{t("homeownerPlanning.rooms", "Rooms")}</div>
              </div>
              {totalAreaSqm > 0 && (
                <div className="rounded-lg border bg-white p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums">{Math.round(totalAreaSqm)} m²</div>
                  <div className="text-xs text-muted-foreground">{t("homeownerPlanning.totalArea", "Floor area")}</div>
                </div>
              )}
              {totalBudget > 0 && (
                <div className="rounded-lg border bg-white p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalBudget, currency)}</div>
                  <div className="text-xs text-muted-foreground">{t("homeownerPlanning.totalBudget", "Budget")}</div>
                </div>
              )}
              {totalMaterialEstimate > 0 && (
                <div className="rounded-lg border bg-white p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-amber-700">{formatCurrency(totalMaterialEstimate, currency)}</div>
                  <div className="text-xs text-muted-foreground">{t("homeownerPlanning.totalMaterial", "Material")}</div>
                </div>
              )}
              {totalRot > 0 && (
                <div className="rounded-lg border bg-white p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-green-700">{formatCurrency(totalRot, currency)}</div>
                  <div className="text-xs text-muted-foreground">{t("homeownerPlanning.totalRot", "ROT")}</div>
                </div>
              )}
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
            <div className="flex items-center gap-2">
              {/* Import quote — populates table with quote data */}
              {!contributorMode && (
                <ImportQuotePopover
                  projectId={projectId}
                  quotes={externalQuotes}
                  currency={currency}
                  onQuotesChange={fetchExternalQuotes}
                  onSmartImport={() => setSmartImportOpen(true)}
                />
              )}
              {/* Group by category toggle */}
              <Button
                variant={groupByCategory ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 shrink-0"
                title={t("homeownerPlanning.groupByCategory", "Group by category")}
                onClick={() => setGroupByCategory((prev) => !prev)}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
              {/* Column toggle */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title={t("budget.columns", "Columns")}>
                    <Columns3 className="h-4 w-4" />
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
          </div>
        </CardHeader>
        <CardContent>
          {tasksWithRoomNames.length > 0 && (
            <div className="rounded-md border overflow-x-auto mb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t("planningTasks.task", "Task")}</TableHead>
                    {show.description && <TableHead>{t("tasks.description", "Description")}</TableHead>}
                    {show.room && <TableHead className="w-[160px]">{t("tasks.room", "Room")}</TableHead>}
                    {show.area && <TableHead className="w-[80px] text-right hidden sm:table-cell">{t("homeownerPlanning.area", "Area")}</TableHead>}
                    {show.quote && <TableHead className="w-[100px] text-center">{t("homeownerPlanning.quote", "Quote")}</TableHead>}
                    {show.budget && <TableHead className="w-[120px] text-right">{t("planningTasks.budget", "Budget")}</TableHead>}
                    {show.materialEstimate && <TableHead className="w-[130px] text-right">{t("planningTasks.materialEstimate", "Materialbudget")}</TableHead>}
                    {show.rotAmount && <TableHead className="w-[110px] text-right">{t("files.rotAmount", "ROT-avdrag")}</TableHead>}
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item) => {
                    if (item.type === "groupHeader") {
                      const colSpan = 1 + (show.description ? 1 : 0) + (show.room ? 1 : 0) + (show.area ? 1 : 0) + (show.quote ? 1 : 0) + (show.budget ? 1 : 0) + (show.materialEstimate ? 1 : 0) + (show.rotAmount ? 1 : 0) + 1;
                      const isCollapsed = collapsedGroups.has(item.category);
                      const label = COST_CENTER_LABELS[item.category] || TASK_CATEGORY_LABELS[item.category as TaskCategory] || item.category;
                      return (
                        <TableRow key={`group-${item.category}`} className="bg-muted/50 hover:bg-muted/70">
                          <TableCell colSpan={colSpan} className="py-2">
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full text-left font-medium text-sm"
                              onClick={() => toggleGroup(item.category)}
                            >
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <span>{label}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.count}</Badge>
                              {item.budget > 0 && (
                                <span className="ml-auto text-xs tabular-nums text-muted-foreground font-normal">
                                  {formatCurrency(item.budget, currency)}
                                </span>
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const task = item.task;
                    const workType = detectWorkType(task);
                    const areaSqm = getTaskAreaSqm(task);
                    const matCount = materialCounts.get(task.id) || 0;
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
                              className="text-left hover:bg-muted px-1.5 py-0.5 rounded cursor-text flex items-center gap-1.5 max-w-[200px] min-w-0"
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
                              <span className="truncate">{task.title}</span>
                              {matCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 shrink-0" title={t("homeownerPlanning.materialCount", { count: matCount })}>
                                  <Package className="h-3 w-3" />
                                  <span className="text-[10px]">{matCount}</span>
                                </span>
                              )}
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
                              className="hover:bg-muted px-1.5 py-0.5 rounded cursor-pointer text-sm text-muted-foreground text-left max-w-[120px] truncate block"
                              title={task.room_names.join(", ")}
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
                        {show.budget && (
                          <TableCell className="text-right py-2.5">
                            {task.budget ? (
                              <span className="text-sm tabular-nums">{Math.round(task.budget).toLocaleString("sv-SE")} kr</span>
                            ) : <span className="text-xs text-muted-foreground">–</span>}
                          </TableCell>
                        )}
                        {show.materialEstimate && (
                          <TableCell className="text-right py-2.5">
                            {task.material_estimate ? (
                              <span className="text-sm tabular-nums text-amber-700">{Math.round(task.material_estimate).toLocaleString("sv-SE")} kr</span>
                            ) : <span className="text-xs text-muted-foreground">–</span>}
                          </TableCell>
                        )}
                        {show.rotAmount && (
                          <TableCell className="text-right py-2.5">
                            {task.rot_amount ? (
                              <span className="text-sm tabular-nums text-green-700">{Math.round(task.rot_amount).toLocaleString("sv-SE")} kr</span>
                            ) : <span className="text-xs text-muted-foreground">–</span>}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setSmartImportOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("homeownerPlanning.smartImport", "Smart import")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("homeownerPlanning.addTask", "Add task")}
              </Button>
            </div>
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

      {/* Start project modal — choose path */}
      <StartProjectModal
        open={showStartModal}
        onOpenChange={setShowStartModal}
        onStartSelf={handleActivate}
        onSendRfq={() => setShareDialogOpen(true)}
      />

      {/* Guest login prompt */}
      <GuestLoginPrompt
        open={!!loginPromptAction}
        onOpenChange={(open) => { if (!open) setLoginPromptAction(null); }}
        action={loginPromptAction || "save_project"}
        projectId={projectId}
      />

      {/* Smart import dialog — AI extract tasks + rooms from document */}
      <PlanningSmartImportDialog
        projectId={projectId}
        open={smartImportOpen}
        onOpenChange={setSmartImportOpen}
        onImportComplete={() => { fetchTasks(); fetchRooms(); }}
      />
    </div>
  );
}
