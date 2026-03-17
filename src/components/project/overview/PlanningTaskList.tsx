import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { Plus, ClipboardList, ArrowRight, Pencil, Trash2, Columns3, Lock, Unlock, Info, Sparkles, Loader2, CheckCircle2, AlertTriangle, FileUp, ChevronRight, ChevronDown, ShoppingCart, Package, Wrench, Link2, GripVertical } from "lucide-react";
import { AddMaterialDialog } from "./AddMaterialDialog";
import { MaterialFileAttachment } from "./MaterialFileAttachment";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { TaskEditDialog } from "../TaskEditDialog";
import { PlanningSmartImportDialog } from "./PlanningSmartImportDialog";
import {
  suggestMaterials,
  suggestMaterialsMultiRoom,
  detectRecipeKey,
  detectWorkType,
  estimateTaskMultiRoom,
  formatSuggestionSummary,
  parseEstimationSettings,
  ALL_WORK_TYPES,
  WORK_TYPE_LABEL_KEYS,
  type WorkType,
  type RecipeEstimationSettings,
  type RecipeRoom,
} from "@/lib/materialRecipes";

interface PlanningTask {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  room_id: string | null;
  room_ids: string[] | null;
  room_name: string | null;
  room_names: string[];
  status: string;
  task_cost_type: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
  material_markup_percent: number | null;
  material_items: { amount: number; markup_percent: number | null; quantity?: number; unit?: string; unit_price?: number }[] | null;
  labor_cost_percent: number | null;
  cost_center: string | null;
}

interface Room {
  id: string;
  name: string;
  dimensions: RecipeRoom["dimensions"];
  ceiling_height_mm: number | null;
}

interface PlanningMaterial {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  price_total: number | null;
  markup_percent: number | null;
  task_id: string | null;
  status: string;
  vendor_name: string | null;
  kind: "material" | "subcontractor";
}

type ExtraColumnKey = "hours" | "hourlyRate" | "room" | "costType" | "material" | "profit" | "description" | "markup";

interface ExtraColumnDef {
  key: ExtraColumnKey;
  labelKey: string;
  defaultOn: boolean;
  /** Only visible for builders (hidden from homeowners) */
  builderOnly?: boolean;
}

const EXTRA_COLUMNS: ExtraColumnDef[] = [
  { key: "description", labelKey: "tasks.description", defaultOn: false },
  { key: "room", labelKey: "planningTasks.room", defaultOn: true },
  { key: "hours", labelKey: "planningTasks.hoursQty", defaultOn: true, builderOnly: true },
  { key: "hourlyRate", labelKey: "planningTasks.rateUnitPrice", defaultOn: true, builderOnly: true },
  { key: "costType", labelKey: "planningTasks.costType", defaultOn: false, builderOnly: true },
  { key: "material", labelKey: "taskCost.materialEstimate", defaultOn: true, builderOnly: true },
  { key: "markup", labelKey: "planningTasks.markup", defaultOn: false, builderOnly: true },
  { key: "profit", labelKey: "taskCost.result", defaultOn: true, builderOnly: true },
];

function getDefaultExtras(isHomeowner: boolean): Set<ExtraColumnKey> {
  return new Set(
    EXTRA_COLUMNS
      .filter((c) => c.defaultOn && !(isHomeowner && c.builderOnly))
      .map((c) => c.key)
  );
}

function getAvailableColumns(isHomeowner: boolean): ExtraColumnDef[] {
  return EXTRA_COLUMNS.filter((c) => !(isHomeowner && c.builderOnly));
}

interface PlanningTaskListProps {
  projectId: string;
  currency?: string | null;
  isHomeowner?: boolean;
  onNavigateToTasks?: (taskId?: string) => void;
  onCreateQuote?: () => void;
  locked?: boolean;
}

export function PlanningTaskList({
  projectId,
  currency,
  isHomeowner = false,
  onNavigateToTasks,
  onCreateQuote,
  locked = false,
}: PlanningTaskListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomMap, setRoomMap] = useState<Map<string, Room>>(new Map());
  const [loading, setLoading] = useState(true);
  const [profileLaborCostPercent, setProfileLaborCostPercent] = useState<number | null>(null);
  const [estimationSettings, setEstimationSettings] = useState<RecipeEstimationSettings | null>(null);

  // Local override: user chose to unlock editing despite active quote
  const [lockOverridden, setLockOverridden] = useState(false);
  const effectiveLock = locked && !lockOverridden;

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit dialog state
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // Smart import dialog state
  const [smartImportOpen, setSmartImportOpen] = useState(false);

  // Inline cell editing state
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: "estimated_hours" | "hourly_rate" | "material_estimate" | "budget" | "description" | "room_id";
  } | {
    taskId: string;
    field: "mat_quantity" | "mat_price_per_unit" | "mat_markup_percent" | "mat_price_total";
    materialId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Inline new room creation
  const [newRoomName, setNewRoomName] = useState("");

  // Column visibility — homeowners get a filtered set
  const availableColumns = getAvailableColumns(isHomeowner);
  const [visibleExtras, setVisibleExtras] = useState<Set<ExtraColumnKey>>(
    () => getDefaultExtras(isHomeowner)
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
      markup: visibleExtras.has("markup"),
      profit: visibleExtras.has("profit"),
    }),
    [visibleExtras]
  );

  const extraCount = visibleExtras.size;

  // Material/UE sub-rows state
  const [materials, setMaterials] = useState<PlanningMaterial[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [addMaterialKind, setAddMaterialKind] = useState<"material" | "subcontractor">("material");

  // Auto-show markup column when material/UE rows exist
  useEffect(() => {
    if (materials.length > 0 && !isHomeowner) {
      setVisibleExtras((prev) => {
        if (prev.has("markup")) return prev;
        const next = new Set(prev);
        next.add("markup");
        return next;
      });
    }
  }, [materials.length, isHomeowner]);

  // Row drag-reorder state
  const dragItem = React.useRef<{ type: "task" | "material"; id: string; index: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = React.useState<{ type: "task" | "material"; id: string; position: "above" | "below" } | null>(null);
  const [isDraggingMaterial, setIsDraggingMaterial] = useState(false);
  const [unlinkDropHover, setUnlinkDropHover] = useState(false);

  const toggleTaskExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Group materials by task
  const materialsByTask = useMemo(() => {
    const map = new Map<string, PlanningMaterial[]>();
    const standalone: PlanningMaterial[] = [];
    for (const m of materials) {
      if (m.task_id) {
        const list = map.get(m.task_id) || [];
        list.push(m);
        map.set(m.task_id, list);
      } else {
        standalone.push(m);
      }
    }
    return { byTask: map, standalone };
  }, [materials]);

  // Unified display order: tasks and standalone materials can be freely intermixed
  type DisplayItem = { type: "task"; id: string } | { type: "standalone"; id: string };
  const [displayOrder, setDisplayOrder] = useState<DisplayItem[]>([]);

  // Rebuild display order when tasks/materials change, preserving existing order
  useEffect(() => {
    setDisplayOrder((prev) => {
      const taskIds = new Set(tasks.map((t) => t.id));
      const standaloneIds = new Set(materialsByTask.standalone.map((m) => m.id));

      // Keep existing items that still exist
      const kept = prev.filter(
        (item) =>
          (item.type === "task" && taskIds.has(item.id)) ||
          (item.type === "standalone" && standaloneIds.has(item.id))
      );
      const keptIds = new Set(kept.map((item) => item.id));

      // Append new items not in previous order
      const newItems: DisplayItem[] = [];
      for (const t of tasks) {
        if (!keptIds.has(t.id)) newItems.push({ type: "task", id: t.id });
      }
      for (const m of materialsByTask.standalone) {
        if (!keptIds.has(m.id)) newItems.push({ type: "standalone", id: m.id });
      }

      return [...kept, ...newItems];
    });
  }, [tasks, materialsByTask.standalone]);

  const fetchProfileCostPercent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("default_labor_cost_percent, estimation_settings")
        .eq("user_id", user.id)
        .single();
      setProfileLaborCostPercent(data?.default_labor_cost_percent ?? null);
      if (data?.estimation_settings) {
        setEstimationSettings(
          parseEstimationSettings(data.estimation_settings as Record<string, unknown>)
        );
      }
    } catch {
      // Non-critical
    }
  }, []);

  const fetchData = useCallback(async () => {
    const [tasksRes, roomsRes, plannedMatsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("rooms")
        .select("id, name, dimensions, ceiling_height_mm")
        .eq("project_id", projectId),
      supabase
        .from("materials")
        .select("id, name, quantity, unit, price_per_unit, price_total, markup_percent, task_id, status, vendor_name, description")
        .eq("project_id", projectId),
    ]);

    const fetchedRooms = (roomsRes.data || []) as Room[];
    const nameMap = new Map(fetchedRooms.map((r) => [r.id, r.name]));
    const fullRoomMap = new Map(fetchedRooms.map((r) => [r.id, r]));
    setRooms(fetchedRooms);
    setRoomMap(fullRoomMap);

    // Build planned materials map per task
    const allMats = plannedMatsRes.data || [];
    const plannedByTask = new Map<string, NonNullable<PlanningTask["material_items"]>>();
    for (const m of allMats) {
      if (!m.task_id) continue;
      const items = plannedByTask.get(m.task_id) || [];
      items.push({
        amount: m.price_total ?? Math.round((m.quantity || 0) * (m.price_per_unit || 0)),
        markup_percent: m.markup_percent ?? null,
        quantity: m.quantity ?? undefined,
        unit: m.unit ?? undefined,
        unit_price: m.price_per_unit ?? undefined,
      });
      plannedByTask.set(m.task_id, items);
    }

    // Store all materials for sub-row display
    setMaterials(
      allMats.map((m) => ({
        id: m.id,
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
        price_per_unit: m.price_per_unit,
        price_total: m.price_total,
        markup_percent: m.markup_percent,
        task_id: m.task_id,
        status: m.status,
        vendor_name: m.vendor_name,
        kind: (m.description === "__subcontractor__" ? "subcontractor" : "material") as "material" | "subcontractor",
      }))
    );

    setTasks(
      (tasksRes.data || []).map((task) => {
        // Prefer planned materials from materials table over legacy JSONB
        const planned = plannedByTask.get(task.id);
        // Build room_ids — prefer array field, fall back to single room_id
        const ids: string[] = (task.room_ids && task.room_ids.length > 0)
          ? task.room_ids
          : task.room_id ? [task.room_id] : [];
        return {
          ...task,
          room_id: ids[0] || null,
          room_ids: ids,
          room_name: ids[0] ? nameMap.get(ids[0]) || null : null,
          room_names: ids.map((id: string) => nameMap.get(id) || "").filter(Boolean),
          material_items: planned && planned.length > 0 ? planned : task.material_items,
        };
      })
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
        fetchData();
      }
    },
    [tasks, fetchData, t, toast]
  );

  const handleClearRooms = useCallback(
    async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ room_ids: [], room_id: null })
        .eq("id", taskId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
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

      await handleRoomToggle(taskId, room.id);
      setNewRoomName("");
    },
    [projectId, handleRoomToggle, t, toast]
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

  // --- Material/UE handlers ---

  const handleAddMaterialSubmit = useCallback(
    async (data: {
      name: string;
      kind: "material" | "subcontractor";
      linkMode: "existing" | "create" | "none";
      existingTaskId?: string;
      newTaskTitle?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, default_hourly_rate")
        .eq("user_id", user.id)
        .single();
      if (!profile) return;

      let taskId: string | null = null;

      if (data.linkMode === "existing" && data.existingTaskId) {
        taskId = data.existingTaskId;
      } else if (data.linkMode === "create" && data.newTaskTitle) {
        const { data: newTask, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            project_id: projectId,
            title: data.newTaskTitle,
            status: "planned",
            priority: "medium",
            created_by_user_id: profile.id,
            hourly_rate: profile.default_hourly_rate ?? null,
          })
          .select("id")
          .single();

        if (taskErr || !newTask) {
          toast({ title: t("common.error"), description: taskErr?.message || "Failed", variant: "destructive" });
          return;
        }
        taskId = newTask.id;
      }

      const { error } = await supabase.from("materials").insert({
        project_id: projectId,
        task_id: taskId,
        name: data.name,
        status: "submitted",
        created_by_user_id: profile.id,
        description: data.kind === "subcontractor" ? "__subcontractor__" : null,
      });

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
        return;
      }

      // Auto-expand the parent task if linked
      if (taskId) {
        setExpandedTasks((prev) => new Set(prev).add(taskId));
      }
      fetchData();
    },
    [projectId, fetchData, t, toast]
  );

  const handleDeleteMaterial = useCallback(
    async (materialId: string) => {
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", materialId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        fetchData();
      }
    },
    [fetchData, t, toast]
  );

  const handleMaterialInlineSave = useCallback(
    async (materialId: string, field: string, rawValue: string) => {
      const numValue = rawValue === "" ? null : parseFloat(rawValue);
      if (rawValue !== "" && isNaN(numValue as number)) {
        setEditingCell(null);
        return;
      }

      const mat = materials.find((m) => m.id === materialId);
      const updates: Record<string, number | null> = { [field]: numValue };

      // Auto-compute price_total when qty or unit price changes
      if (mat && (field === "quantity" || field === "price_per_unit")) {
        const qty = field === "quantity" ? (numValue || 0) : (mat.quantity || 0);
        const unitPrice = field === "price_per_unit" ? (numValue || 0) : (mat.price_per_unit || 0);
        if (qty > 0 && unitPrice > 0) {
          updates.price_total = Math.round(qty * unitPrice);
        }
      }

      const { error } = await supabase
        .from("materials")
        .update(updates)
        .eq("id", materialId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        fetchData();
      }
      setEditingCell(null);
    },
    [materials, fetchData, t, toast]
  );

  const handleLinkMaterialToTask = useCallback(
    async (materialId: string, taskId: string) => {
      const { error } = await supabase
        .from("materials")
        .update({ task_id: taskId })
        .eq("id", materialId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        setExpandedTasks((prev) => new Set(prev).add(taskId));
        fetchData();
      }
    },
    [fetchData, t, toast]
  );

  const handleUnlinkMaterial = useCallback(
    async (materialId: string) => {
      const { error } = await supabase
        .from("materials")
        .update({ task_id: null })
        .eq("id", materialId);

      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        fetchData();
      }
    },
    [fetchData, t, toast]
  );

  // --- Row drag-reorder handlers ---

  const handleRowDragStart = useCallback(
    (e: React.DragEvent, type: "task" | "material", id: string, index: number) => {
      dragItem.current = { type, id, index };
      e.dataTransfer.effectAllowed = "move";
      if (type === "material") setIsDraggingMaterial(true);
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.5";
      }
    },
    []
  );

  const handleRowDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    dragItem.current = null;
    setDragOverTarget(null);
    setIsDraggingMaterial(false);
    setUnlinkDropHover(false);
  }, []);

  const handleRowDragOver = useCallback(
    (e: React.DragEvent, type: "task" | "material", id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!dragItem.current || dragItem.current.id === id) {
        setDragOverTarget(null);
        return;
      }
      // Determine above/below based on mouse position within the row
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "above" : "below";
      setDragOverTarget({ type, id, position });
    },
    []
  );

  const handleRowDrop = useCallback(
    async (e: React.DragEvent, targetType: "task" | "material" | "child-material", targetId: string) => {
      e.preventDefault();
      const src = dragItem.current;
      if (!src || src.id === targetId) return;

      // Child material dragged onto a task → link it to that task
      if (src.type === "material" && targetType === "task") {
        const srcMat = materials.find((m) => m.id === src.id);
        // Only link if the material isn't already under this task
        if (srcMat?.task_id !== targetId) {
          await handleLinkMaterialToTask(src.id, targetId);
        }
      }
      // Dragged onto a child-material row
      else if (src.type === "material" && targetType === "child-material") {
        const srcMat = materials.find((m) => m.id === src.id);
        const targetMat = materials.find((m) => m.id === targetId);
        if (!targetMat?.task_id) return;

        // Same parent task → reorder within the group
        if (srcMat?.task_id === targetMat.task_id) {
          setMaterials((prev) => {
            const list = [...prev];
            const fromIdx = list.findIndex((m) => m.id === src.id);
            const toIdx = list.findIndex((m) => m.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const [moved] = list.splice(fromIdx, 1);
            const adjustedTo = fromIdx < toIdx ? toIdx - 1 : toIdx;
            const insertIdx = dragOverTarget?.position === "below" ? adjustedTo + 1 : adjustedTo;
            list.splice(insertIdx, 0, moved);
            return list;
          });
        }
        // Different parent → move to that task
        else {
          await handleLinkMaterialToTask(src.id, targetMat.task_id);
        }
      }
      // Reorder within displayOrder (tasks + standalone materials)
      else {
        const srcDisplayType = src.type === "task" ? "task" : "standalone";
        setDisplayOrder((prev) => {
          const list = [...prev];
          const fromIdx = list.findIndex((item) => item.id === src.id && item.type === srcDisplayType);
          const toIdx = list.findIndex((item) => item.id === targetId);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const [moved] = list.splice(fromIdx, 1);
          const adjustedTo = fromIdx < toIdx ? toIdx - 1 : toIdx;
          const insertIdx = dragOverTarget?.position === "below" ? adjustedTo + 1 : adjustedTo;
          list.splice(insertIdx, 0, moved);
          return list;
        });
      }

      dragItem.current = null;
      setDragOverTarget(null);
    },
    [handleLinkMaterialToTask, dragOverTarget, materials]
  );

  // Auto-estimate: compute hours + materials + budget from room dimensions
  const [estimatingTaskId, setEstimatingTaskId] = useState<string | null>(null);
  // Work-type picker popover state (shown when auto-detect fails)
  const [workTypePickerTaskId, setWorkTypePickerTaskId] = useState<string | null>(null);
  // Estimate feedback dialog (centered, replaces corner toasts)
  const [estimateFeedback, setEstimateFeedback] = useState<{
    title: string;
    lines: { icon: "success" | "warning" | "error"; text: string }[];
  } | null>(null);

  const runEstimate = useCallback(
    async (task: PlanningTask, workType: WorkType) => {
      const roomIds = task.room_ids || (task.room_id ? [task.room_id] : []);
      const linkedRooms = roomIds
        .map((id) => roomMap.get(id))
        .filter((r): r is Room => !!r && !!r.dimensions);

      setEstimatingTaskId(task.id);
      try {
        const taskWithType = { ...task, cost_center: workType };
        const result = estimateTaskMultiRoom(taskWithType, linkedRooms, estimationSettings ?? undefined);
        if (!result) {
          setEstimateFeedback({
            title: t("planningTasks.noEstimatePossible", "Not enough room data to estimate"),
            lines: [{ icon: "warning", text: t("planningTasks.noRoomsForEstimate", "Assign rooms with dimensions first") }],
          });
          return;
        }

        const hours = result.estimatedHours;
        const rate = task.hourly_rate || 0;
        const materialCost = result.material?.totalCost ?? 0;
        const laborTotal = hours * rate;
        const materialWithMarkup = materialCost * (1 + (task.material_markup_percent || 0) / 100);
        const budget = laborTotal + materialWithMarkup;

        // Update task fields + save cost_center for future detection
        const { error } = await supabase
          .from("tasks")
          .update({
            estimated_hours: hours,
            material_estimate: materialCost || null,
            budget: budget || null,
            cost_center: workType,
          })
          .eq("id", task.id);

        if (error) throw error;

        // Create planned material row (only if material was estimated)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await supabase.from("materials").delete().eq("task_id", task.id).eq("status", "planned");

          if (result.material) {
            const s = result.material;
            await supabase.from("materials").insert({
              id: crypto.randomUUID(),
              name: s.nameFallback,
              quantity: s.quantity,
              unit: s.unit,
              price_per_unit: s.unitPrice,
              price_total: s.totalCost,
              task_id: task.id,
              project_id: projectId,
              status: "planned",
              exclude_from_budget: false,
              created_by_user_id: authUser.id,
            });
          }
        }

        fetchData();

        // Build centered feedback dialog
        const workLabel = t(WORK_TYPE_LABEL_KEYS[result.workType], result.workType);
        const areaLabel = result.areaType === "wall"
          ? t("planningTasks.wallArea", "wall area")
          : t("planningTasks.floorArea", "floor area");
        const feedbackLines: { icon: "success" | "warning"; text: string }[] = [];
        feedbackLines.push({
          icon: "success",
          text: `${t("planningTasks.estLabor", "Labor")}: ${hours}h (${result.totalAreaSqm} m² ${areaLabel} × ${result.productivityRate} m²/h)`,
        });
        if (result.materialEstimated && result.material) {
          feedbackLines.push({
            icon: "success",
            text: `${t("planningTasks.estMaterial", "Material")}: ${formatCurrency(materialCost, currency)}`,
          });
        } else {
          feedbackLines.push({
            icon: "warning",
            text: t("planningTasks.estNoMaterial", "Material: add manually or via subcontractor quote"),
          });
        }
        if (budget > 0) {
          feedbackLines.push({
            icon: "success",
            text: `${t("planningTasks.estBudget", "Budget")}: ${formatCurrency(budget, currency)}`,
          });
        }

        setEstimateFeedback({
          title: `${workLabel} — ${t("planningTasks.estimateDone", "estimate done")}`,
          lines: feedbackLines,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setEstimateFeedback({
          title: t("common.error", "Error"),
          lines: [{ icon: "error", text: msg }],
        });
      } finally {
        setEstimatingTaskId(null);
      }
    },
    [roomMap, estimationSettings, fetchData, t, projectId, currency]
  );

  const handleAutoEstimate = useCallback(
    async (task: PlanningTask) => {
      const roomIds = task.room_ids || (task.room_id ? [task.room_id] : []);
      const linkedRooms = roomIds
        .map((id) => roomMap.get(id))
        .filter((r): r is Room => !!r && !!r.dimensions);

      if (linkedRooms.length === 0) {
        setEstimateFeedback({
          title: t("planningTasks.autoEstimate", "Auto-estimate"),
          lines: [{ icon: "warning", text: t("planningTasks.noRoomsForEstimate", "Assign rooms with dimensions first") }],
        });
        return;
      }

      const workType = detectWorkType(task);
      if (!workType) {
        // Open work-type picker popover instead of showing error toast
        setWorkTypePickerTaskId(task.id);
        return;
      }

      await runEstimate(task, workType);
    },
    [roomMap, runEstimate, t]
  );

  const handleWorkTypePicked = useCallback(
    async (taskId: string, workType: WorkType) => {
      setWorkTypePickerTaskId(null);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      await runEstimate(task, workType);
    },
    [tasks, runEstimate]
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
              {!isHomeowner && totalProfit > 0 && (
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
                      <TableHead className="hidden sm:table-cell text-right w-[90px]">
                        {t("planningTasks.hoursQty", "Hours / Qty")}
                      </TableHead>
                    )}
                    {show.hourlyRate && (
                      <TableHead className="hidden sm:table-cell text-right w-[110px]">
                        {t("planningTasks.rateUnitPrice", "Rate / Unit price")}
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
                    {show.markup && (
                      <TableHead className="hidden sm:table-cell text-right w-[80px]">
                        {t("planningTasks.markup", "Markup")}
                      </TableHead>
                    )}
                    <TableHead className="text-right w-[120px]">
                      {isHomeowner
                        ? t("planningTasks.estimatedBudget", "Budget")
                        : t("planningTasks.customerPrice", "Customer price")}
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
                  {displayOrder.map((displayItem, displayIdx) => {
                  // --- Standalone material row ---
                  if (displayItem.type === "standalone") {
                    const mat = materialsByTask.standalone.find((m) => m.id === displayItem.id);
                    if (!mat) return null;
                    const matTotal = mat.price_total ?? Math.round((mat.quantity || 0) * (mat.price_per_unit || 0));
                    const renderStandaloneInline2 = (
                      matField: "mat_quantity" | "mat_price_per_unit" | "mat_markup_percent" | "mat_price_total",
                      dbField: string,
                      value: number | null,
                      suffix?: string,
                    ) => {
                      const isEditingThis = editingCell && "materialId" in editingCell && editingCell.materialId === mat.id && editingCell.field === matField;
                      if (isEditingThis && !effectiveLock) {
                        return (
                          <Input
                            type="number"
                            className="w-16 h-7 text-right text-sm"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleMaterialInlineSave(mat.id, dbField, editValue);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            onBlur={() => handleMaterialInlineSave(mat.id, dbField, editValue)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      }
                      if (effectiveLock) {
                        return value ? (
                          <span className="text-sm text-muted-foreground">{suffix ? `${value}${suffix}` : formatCurrency(value, currency)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">–</span>
                        );
                      }
                      return (
                        <button
                          className="hover:bg-muted px-1.5 py-0.5 rounded cursor-text text-sm text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell({ taskId: "__standalone__", field: matField, materialId: mat.id });
                            setEditValue(value != null ? String(value) : "");
                          }}
                        >
                          {value ? (suffix ? `${value}${suffix}` : formatCurrency(value, currency)) : "–"}
                        </button>
                      );
                    };

                    return (
                      <TableRow
                        key={`s-${mat.id}`}
                        className={`bg-amber-50/30 ${dragOverTarget?.id === mat.id ? (dragOverTarget.position === "above" ? "border-t-2 border-t-primary" : "border-b-2 border-b-primary") : ""}`}
                        draggable={!effectiveLock}
                        onDragStart={(e) => handleRowDragStart(e, "material", mat.id, displayIdx)}
                        onDragEnd={handleRowDragEnd}
                        onDragOver={(e) => handleRowDragOver(e, "material", mat.id)}
                        onDrop={(e) => handleRowDrop(e, "material", mat.id)}
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            {!effectiveLock && (
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab active:cursor-grabbing shrink-0" />
                            )}
                            {mat.kind === "subcontractor"
                              ? <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              : <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <span className="text-sm">{mat.name}</span>
                            <MaterialFileAttachment materialId={mat.id} projectId={projectId} />
                            {!effectiveLock && tasks.length > 0 ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="inline-flex items-center gap-1 text-xs font-normal text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-50 transition-colors">
                                    <Link2 className="h-3 w-3" />
                                    {t("planningTasks.standalone")}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-2" align="start">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                    {t("planningTasks.linkToTask")}
                                  </p>
                                  <div className="flex flex-col">
                                    {tasks.map((tk) => (
                                      <button
                                        key={tk.id}
                                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                                        onClick={() => handleLinkMaterialToTask(mat.id, tk.id)}
                                      >
                                        {tk.title}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-200">
                                {t("planningTasks.standalone")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {show.description && <TableCell className="hidden sm:table-cell py-2.5" />}
                        {show.hours && (
                          <TableCell className="text-right hidden sm:table-cell py-2.5">
                            {renderStandaloneInline2("mat_quantity", "quantity", mat.quantity, mat.unit ? ` ${mat.unit}` : "")}
                          </TableCell>
                        )}
                        {show.hourlyRate && (
                          <TableCell className="text-right hidden sm:table-cell py-2.5">
                            {renderStandaloneInline2("mat_price_per_unit", "price_per_unit", mat.price_per_unit)}
                          </TableCell>
                        )}
                        {show.room && <TableCell className="hidden sm:table-cell py-2.5" />}
                        {show.costType && (
                          <TableCell className="hidden sm:table-cell py-2.5">
                            <Badge variant="outline" className="text-xs font-normal">
                              {mat.kind === "subcontractor" ? t("planningTasks.typeSubcontractor") : t("planningTasks.typeMaterial")}
                            </Badge>
                          </TableCell>
                        )}
                        {show.material && (
                          <TableCell className="text-right hidden sm:table-cell py-2.5">
                            {renderStandaloneInline2("mat_price_total", "price_total", matTotal || null)}
                          </TableCell>
                        )}
                        {show.markup && (
                          <TableCell className="text-right hidden sm:table-cell py-2.5">
                            {renderStandaloneInline2("mat_markup_percent", "markup_percent", mat.markup_percent, "%")}
                          </TableCell>
                        )}
                        <TableCell className="py-2.5" />
                        {show.profit && <TableCell className="hidden sm:table-cell py-2.5" />}
                        {!effectiveLock && (
                          <TableCell className="py-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  }

                  // --- Task row ---
                  const task = tasks.find((t) => t.id === displayItem.id);
                  if (!task) return null;
                  const idx = displayIdx;
                  {
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

                    const taskMaterials = materialsByTask.byTask.get(task.id) || [];
                    const matCount = taskMaterials.length;
                    const isExpanded = expandedTasks.has(task.id);

                    return (
                    <React.Fragment key={task.id}>
                    <TableRow
                      draggable={!effectiveLock}
                      onDragStart={(e) => handleRowDragStart(e, "task", task.id, idx)}
                      onDragEnd={handleRowDragEnd}
                      onDragOver={(e) => handleRowDragOver(e, "task", task.id)}
                      onDrop={(e) => handleRowDrop(e, "task", task.id)}
                      className={
                        dragOverTarget?.id === task.id
                          ? dragOverTarget.position === "above"
                            ? "border-t-2 border-t-primary"
                            : "border-b-2 border-b-primary"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium py-2.5">
                        <div className="flex items-center gap-1">
                          {!effectiveLock && (
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab active:cursor-grabbing shrink-0" />
                          )}
                          <button
                            type="button"
                            className={`text-left hover:underline hover:text-primary transition-colors ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                            onClick={() => setEditTaskId(task.id)}
                          >
                            {task.title}
                          </button>
                          {matCount > 0 && (
                            <button
                              type="button"
                              className="ml-1.5 inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); toggleTaskExpand(task.id); }}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              <span className="text-xs">{matCount}</span>
                            </button>
                          )}
                        </div>
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
                                  {task.room_names.length > 0 ? task.room_names.join(", ") : "–"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-1" align="start">
                                <div className="space-y-0.5">
                                  {rooms.map((r) => {
                                    const checked = (task.room_ids || []).includes(r.id);
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
                                  {(task.room_ids || []).length > 0 && (
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
                          ) : effectiveLock ? (
                            <span className="text-sm text-muted-foreground">{task.room_names.length > 0 ? task.room_names.join(", ") : "–"}</span>
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
                          {task.material_estimate ? (
                            renderInlineCell("material_estimate", task.material_estimate, "currency")
                          ) : (() => {
                            const linkedRooms = (task.room_ids || [])
                              .map((id) => roomMap.get(id))
                              .filter((r): r is Room => !!r);
                            const suggestions = linkedRooms.length > 0
                              ? suggestMaterialsMultiRoom(task, linkedRooms, estimationSettings ?? undefined)
                              : [];
                            if (suggestions.length > 0) {
                              const summary = formatSuggestionSummary(suggestions);
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditTaskId(task.id);
                                        }}
                                      >
                                        {summary}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {t("materialRecipes.clickToSuggest")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }
                            return renderInlineCell("material_estimate", null, "currency");
                          })()}
                        </TableCell>
                      )}
                      {show.markup && <TableCell className="hidden sm:table-cell py-2.5" />}
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
                            <Popover
                              open={workTypePickerTaskId === task.id}
                              onOpenChange={(open) => {
                                if (!open) setWorkTypePickerTaskId(null);
                              }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                      disabled={estimatingTaskId === task.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAutoEstimate(task);
                                      }}
                                    >
                                      {estimatingTaskId === task.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t("planningTasks.autoEstimate", "Auto-estimate")}</TooltipContent>
                              </Tooltip>
                              <PopoverContent
                                className="w-48 p-2"
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                  {t("planningTasks.pickWorkType", "What type of work?")}
                                </p>
                                <div className="flex flex-col">
                                  {ALL_WORK_TYPES.map((wt) => (
                                    <button
                                      key={wt}
                                      className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                                      onClick={() => handleWorkTypePicked(task.id, wt)}
                                    >
                                      {t(WORK_TYPE_LABEL_KEYS[wt], wt)}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
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

                    {/* Material/UE sub-rows */}
                    {isExpanded && taskMaterials.map((mat) => {
                      const matTotal = mat.price_total ?? Math.round((mat.quantity || 0) * (mat.price_per_unit || 0));
                      const renderMatInline = (
                        matField: "mat_quantity" | "mat_price_per_unit" | "mat_markup_percent" | "mat_price_total",
                        dbField: string,
                        value: number | null,
                        suffix?: string,
                      ) => {
                        const isEditingThis = editingCell && "materialId" in editingCell && editingCell.materialId === mat.id && editingCell.field === matField;
                        if (isEditingThis && !effectiveLock) {
                          return (
                            <Input
                              type="number"
                              className="w-16 h-7 text-right text-sm"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleMaterialInlineSave(mat.id, dbField, editValue);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onBlur={() => handleMaterialInlineSave(mat.id, dbField, editValue)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          );
                        }
                        if (effectiveLock) {
                          return value ? (
                            <span className="text-sm text-muted-foreground">{suffix ? `${value}${suffix}` : formatCurrency(value, currency)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          );
                        }
                        return (
                          <button
                            className="hover:bg-muted px-1.5 py-0.5 rounded cursor-text text-sm text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCell({ taskId: task.id, field: matField, materialId: mat.id });
                              setEditValue(value != null ? String(value) : "");
                            }}
                          >
                            {value ? (suffix ? `${value}${suffix}` : formatCurrency(value, currency)) : "–"}
                          </button>
                        );
                      };

                      return (
                        <TableRow
                          key={mat.id}
                          className={`bg-muted/30 hover:bg-muted/50 ${dragOverTarget?.id === mat.id ? (dragOverTarget.position === "above" ? "border-t-2 border-t-primary" : "border-b-2 border-b-primary") : ""}`}
                          draggable={!effectiveLock}
                          onDragStart={(e) => handleRowDragStart(e, "material", mat.id, 0)}
                          onDragEnd={handleRowDragEnd}
                          onDragOver={(e) => handleRowDragOver(e, "material", mat.id)}
                          onDrop={(e) => handleRowDrop(e, "child-material", mat.id)}
                        >
                          <TableCell className="py-2 pl-8">
                            <div className="flex items-center gap-1.5">
                              {!effectiveLock && (
                                <GripVertical className="h-3 w-3 text-muted-foreground/40 cursor-grab active:cursor-grabbing shrink-0" />
                              )}
                              <span className="text-muted-foreground text-xs">└</span>
                              {mat.kind === "subcontractor"
                                ? <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                                : <Package className="h-3 w-3 text-muted-foreground shrink-0" />}
                              <span className="text-sm">{mat.name}</span>
                              <MaterialFileAttachment materialId={mat.id} projectId={projectId} />
                              {!effectiveLock && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="ml-0.5 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                      <Link2 className="h-3 w-3" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-52 p-2" align="start">
                                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                      {t("planningTasks.linkToTask")}
                                    </p>
                                    <div className="flex flex-col">
                                      {tasks.filter((tk) => tk.id !== task.id).map((tk) => (
                                        <button
                                          key={tk.id}
                                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left"
                                          onClick={() => handleLinkMaterialToTask(mat.id, tk.id)}
                                        >
                                          {tk.title}
                                        </button>
                                      ))}
                                      <div className="border-t mt-1 pt-1">
                                        <button
                                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left w-full text-amber-600"
                                          onClick={() => handleUnlinkMaterial(mat.id)}
                                        >
                                          {t("planningTasks.unlinkFromTask")}
                                        </button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </TableCell>
                          {show.description && <TableCell className="hidden sm:table-cell py-2" />}
                          {show.hours && (
                            <TableCell className="text-right hidden sm:table-cell py-2">
                              {renderMatInline("mat_quantity", "quantity", mat.quantity, mat.unit ? ` ${mat.unit}` : "")}
                            </TableCell>
                          )}
                          {show.hourlyRate && (
                            <TableCell className="text-right hidden sm:table-cell py-2">
                              {renderMatInline("mat_price_per_unit", "price_per_unit", mat.price_per_unit)}
                            </TableCell>
                          )}
                          {show.room && <TableCell className="hidden sm:table-cell py-2" />}
                          {show.costType && (
                            <TableCell className="hidden sm:table-cell py-2">
                              <Badge variant="outline" className="text-xs font-normal">
                                {mat.kind === "subcontractor" ? t("planningTasks.typeSubcontractor") : t("planningTasks.typeMaterial")}
                              </Badge>
                            </TableCell>
                          )}
                          {show.material && (
                            <TableCell className="text-right hidden sm:table-cell py-2">
                              {renderMatInline("mat_price_total", "price_total", matTotal || null)}
                            </TableCell>
                          )}
                          {show.markup && (
                            <TableCell className="text-right hidden sm:table-cell py-2">
                              {renderMatInline("mat_markup_percent", "markup_percent", mat.markup_percent, "%")}
                            </TableCell>
                          )}
                          <TableCell className="py-2" />
                          {show.profit && <TableCell className="hidden sm:table-cell py-2" />}
                          {!effectiveLock && (
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    </React.Fragment>
                    );
                  }})}

                  {/* Unlink drop zone — shown when dragging a linked material */}
                  {isDraggingMaterial && (
                    <TableRow
                      className={`transition-colors ${unlinkDropHover ? "bg-amber-100 border-2 border-dashed border-amber-400" : "bg-amber-50/50 border-2 border-dashed border-amber-200"}`}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setUnlinkDropHover(true); setDragOverTarget(null); }}
                      onDragLeave={() => setUnlinkDropHover(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const src = dragItem.current;
                        if (src?.type === "material") {
                          const mat = materials.find((m) => m.id === src.id);
                          if (mat?.task_id) {
                            await handleUnlinkMaterial(src.id);
                          }
                        }
                        dragItem.current = null;
                        setDragOverTarget(null);
                        setIsDraggingMaterial(false);
                        setUnlinkDropHover(false);
                      }}
                    >
                      <TableCell colSpan={visibleColCount} className="py-3 text-center">
                        <span className={`text-sm ${unlinkDropHover ? "text-amber-700 font-medium" : "text-amber-500"}`}>
                          {t("planningTasks.unlinkFromTask", "Make standalone")}
                        </span>
                      </TableCell>
                    </TableRow>
                  )}

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
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdding(true)}
                      disabled={isAdding}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("planningTasks.addTask", "Add task")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAddMaterialKind("material"); setAddMaterialOpen(true); }}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      {t("planningTasks.addMaterial", "Add material")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAddMaterialKind("subcontractor"); setAddMaterialOpen(true); }}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      {t("planningTasks.addSubcontractor", "Add subcontractor")}
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSmartImportOpen(true)}
                            className="gap-1"
                          >
                            <FileUp className="h-4 w-4" />
                            <Sparkles className="h-3 w-3 text-amber-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("planningSmartImport.tooltip", "Import rooms & tasks from a document (PDF, DOCX, TXT)")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                {/* Column visibility toggle */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" title={t("budget.columns", "Columns")}>
                      <Columns3 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52" align="start">
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-2">
                        {t("planningTasks.showColumns", "Show columns")}
                      </p>
                      {availableColumns.map((col) => (
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

      <PlanningSmartImportDialog
        projectId={projectId}
        open={smartImportOpen}
        onOpenChange={setSmartImportOpen}
        onImportComplete={() => fetchData()}
      />

      {/* Estimate feedback dialog — centered, impossible to miss */}
      <AlertDialog open={estimateFeedback !== null} onOpenChange={(open) => !open && setEstimateFeedback(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {estimateFeedback?.title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 pt-1">
                {estimateFeedback?.lines.map((line, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    {line.icon === "success" && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                    {line.icon === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    {line.icon === "error" && <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    <span className={line.icon === "error" ? "text-destructive" : "text-foreground"}>{line.text}</span>
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>{t("common.ok", "OK")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddMaterialDialog
        open={addMaterialOpen}
        onOpenChange={setAddMaterialOpen}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title }))}
        initialKind={addMaterialKind}
        onAdd={handleAddMaterialSubmit}
      />
    </Card>
  );
}
