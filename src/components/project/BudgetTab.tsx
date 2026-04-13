import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, GripVertical, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, Columns3, Plus, Rows3, Layers, Paperclip, Copy, ChevronDown, ChevronRight, FileText, ShoppingCart, Trash2, Package, Hammer, Handshake } from "lucide-react";
import { AttachmentIndicator } from "@/components/shared/AttachmentIndicator";
import { FilePreviewPopover } from "@/components/shared/FilePreviewPopover";
import { getStatusBadgeColor } from "@/lib/statusColors";
import { computeEvidenceStatus, getEvidenceColor } from "@/lib/evidenceStatus";
import { BudgetChartsSection } from "./BudgetChartsSection";
import { BuilderSummaryCards } from "./budget/BuilderSummaryCards";
import { HomeownerBudgetView } from "./budget/HomeownerBudgetView";
import { HomeownerAnalysisSection } from "./budget/HomeownerAnalysisSection";
import { InvoiceMethodDialog } from "@/components/invoices/InvoiceMethodDialog";
import { RotSummaryCard } from "./overview/RotSummaryCard";
import { useTaxDeductionVisible } from "@/hooks/useTaxDeduction";
import { TaskEditDialog } from "./TaskEditDialog";
import { MaterialEditDialog } from "./MaterialEditDialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// --- Types ---

interface BudgetRow {
  id: string;
  name: string;
  type: "task" | "material";
  budget: number;
  paid: number;
  estimatedCost: number;
  isEstimated: boolean;
  taskCostType?: string | null;
  room?: string;
  roomId?: string;
  assignee?: string;
  assigneeId?: string;
  costCenter?: string;
  startDate?: string;
  finishDate?: string;
  hasAttachment: boolean;
  attachmentCount: number;
  isUnlinked?: boolean;
  taskId?: string;
  materialBudget: number;
  materialConsumed: number;
  status?: string;
  // Task-specific
  estimatedHours?: number;
  hourlyRate?: number;
  subcontractorCost?: number;
  markupPercent?: number;
  materialMarkupPercent?: number;
  laborCostPercent?: number;
  paymentStatus?: string;
  // Material-specific
  quantity?: number;
  pricePerUnit?: number;
  orderedAmount?: number;
  vendor?: string;
  // ROT
  rotAmount?: number;
  // Evidence status
  evidenceStatus?: "verified" | "registered" | "missing" | "na";
}

type ColumnKey = "name" | "type" | "status" | "budget" | "paid" | "remaining" | "margin" | "matBudget" | "matConsumed" | "matRemaining" | "room" | "assignee" | "costCenter" | "startDate" | "finishDate" | "attachment" | "evidence" | "estimatedHours" | "hourlyRate" | "subcontractorCost" | "paymentStatus" | "quantity" | "pricePerUnit" | "orderedAmount" | "vendor" | "rotAmount";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  align?: "left" | "right";
  extra?: boolean;
}

const EXTRA_COLUMN_KEYS: ColumnKey[] = [
  "room", "assignee", "costCenter", "startDate", "finishDate", "attachment", "evidence",
  // Task-specific extras
  "estimatedHours", "hourlyRate", "subcontractorCost", "paymentStatus",
  // Material-specific extras
  "quantity", "pricePerUnit", "orderedAmount", "vendor",
  // ROT
  "rotAmount",
];
const HOMEOWNER_HIDDEN_COLUMNS = new Set<ColumnKey>([
  "margin", "matBudget", "matConsumed", "matRemaining",
  "assignee", "costCenter",
  // Builder-internal task cost details
  "estimatedHours", "hourlyRate", "subcontractorCost", "paymentStatus",
]);
const HOMEOWNER_EXTRA_KEYS: ColumnKey[] = [
  "room", "startDate", "finishDate", "attachment", "evidence",
  "paid", "remaining",
  "quantity", "pricePerUnit", "orderedAmount", "vendor",
];

// Status badge colors for combined status column
// Status badge colors now come from shared getStatusBadgeColor()

const budgetStatusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: "toDo",
    in_progress: "inProgress",
    on_hold: "onHold",
  };
  return map[s] || s;
};

interface BudgetTabProps {
  projectId: string;
  currency?: string | null;
  isReadOnly?: boolean;
  userType?: string | null;
  country?: string | null;
}

// --- Auto-persist table prefs ---

interface BudgetTablePrefs {
  columnOrder: ColumnKey[];
  visibleExtras: ColumnKey[];
  sortKey: ColumnKey | null;
  sortDir: "asc" | "desc";
  compactRows?: boolean;
}

const BUDGET_PREFS_KEY = (projectId: string) => `budget-table-prefs-${projectId}`;

function loadBudgetPrefs(projectId: string): BudgetTablePrefs | null {
  try {
    const raw = localStorage.getItem(BUDGET_PREFS_KEY(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as BudgetTablePrefs;
  } catch {
    return null;
  }
}

function persistBudgetPrefs(projectId: string, prefs: BudgetTablePrefs) {
  const key = BUDGET_PREFS_KEY(projectId);
  localStorage.setItem(key, JSON.stringify(prefs));
  import("@/hooks/usePersistedPreference").then(({ scheduleServerSync }) => scheduleServerSync(key, prefs));
}

// --- Cost helpers ---

function computeTaskEstimatedCost(
  task: {
    estimated_hours?: number | null;
    hourly_rate?: number | null;
    labor_cost_percent?: number | null;
    subcontractor_cost?: number | null;
    material_estimate?: number | null;
  },
  defaultLaborCostPercent: number,
  plannedMaterialCost?: number
): number {
  const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
  const laborCost = laborTotal * ((task.labor_cost_percent ?? defaultLaborCostPercent) / 100);
  const ueCost = task.subcontractor_cost || 0;
  // Planned materials (from materials table) take priority; fall back to flat estimate for
  // tasks that predate the migration or were saved without creating materials rows.
  const materialCost = (plannedMaterialCost != null && plannedMaterialCost > 0)
    ? plannedMaterialCost
    : (task.material_estimate || 0);
  return laborCost + ueCost + materialCost;
}

const getEffectiveCost = (row: BudgetRow) => row.paid > 0 ? row.paid : row.estimatedCost;

function computeMaterialBudget(
  task: { material_estimate?: number | null },
  plannedMaterialCost?: number
): number {
  // Planned materials (from materials table) take priority; fall back to flat estimate.
  if (plannedMaterialCost != null && plannedMaterialCost > 0) return plannedMaterialCost;
  return task.material_estimate || 0;
}

// --- Component ---

const BudgetTab = ({ projectId, currency, isReadOnly, userType, country }: BudgetTabProps) => {
  const isBuilder = userType !== "homeowner";
  const { t } = useTranslation();
  const { showTaxDeduction } = useTaxDeductionVisible(country);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [extraTotal, setExtraTotal] = useState(0);
  const [projectBudget, setProjectBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [defaultLaborCostPercent, setDefaultLaborCostPercent] = useState(50);
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "task" | "material">("all");

  // Grouping
  type GroupByOption = "none" | "room" | "costCenter" | "status";
  const [groupBy, setGroupBy] = useState<GroupByOption>(() =>
    (localStorage.getItem(`budget-groupby-${projectId}`) as GroupByOption) || "none"
  );
  const handleGroupByChange = (v: GroupByOption) => {
    setGroupBy(v);
    localStorage.setItem(`budget-groupby-${projectId}`, v);
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterFinishDate, setFilterFinishDate] = useState("");
  const [filterAttachment, setFilterAttachment] = useState<"all" | "has" | "missing">("all");
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());

  // Collapsible columns
  const budgetPrefs = useRef(loadBudgetPrefs(projectId));
  const [visibleExtras, setVisibleExtras] = useState<Set<ColumnKey>>(
    () => budgetPrefs.current?.visibleExtras
      ? new Set(budgetPrefs.current.visibleExtras)
      : new Set()
  );

  // Translated column/status definitions
  const ALL_COLUMNS: ColumnDef[] = useMemo(() => [
    { key: "name", label: t('budget.name') },
    { key: "type", label: t('budget.type') },
    { key: "status", label: t('budget.status', 'Status') },
    { key: "budget", label: isBuilder ? t('budget.customerPrice') : t('homeownerBudget.quoted', 'Offert'), align: "right" },
    { key: "matBudget", label: t('budget.matBudget'), align: "right" },
    { key: "matConsumed", label: t('budget.matConsumed'), align: "right" },
    { key: "matRemaining", label: t('budget.matRemaining'), align: "right" },
    { key: "paid", label: isBuilder ? t('budget.cost') : t('homeownerBudget.paid', 'Betalat'), align: "right" },
    { key: "remaining", label: isBuilder ? t('budget.result') : t('homeownerBudget.outstanding', 'Kvarstående'), align: "right" },
    { key: "margin", label: t('budget.margin'), align: "right" },
    { key: "room", label: t('budget.room'), extra: true },
    { key: "assignee", label: t('budget.assignee'), extra: true },
    { key: "costCenter", label: t('budget.costCenter'), extra: true },
    { key: "startDate", label: t('common.startDate'), extra: true },
    { key: "finishDate", label: t('common.finishDate'), extra: true },
    { key: "attachment", label: t('common.attachment'), extra: true },
    { key: "evidence", label: t('evidence.column', 'Underlag'), extra: true },
    // Task-specific extras
    { key: "estimatedHours", label: t('budget.estimatedHours', 'Est. hours'), align: "right", extra: true },
    { key: "hourlyRate", label: t('budget.hourlyRate', 'Hourly rate'), align: "right", extra: true },
    { key: "subcontractorCost", label: t('budget.subcontractorCost', 'Subcontractor'), align: "right", extra: true },
    { key: "paymentStatus", label: t('budget.paymentStatus', 'Payment'), extra: true },
    // Material-specific extras
    { key: "quantity", label: t('budget.quantity', 'Quantity'), align: "right", extra: true },
    { key: "pricePerUnit", label: t('budget.pricePerUnit', 'Price/unit'), align: "right", extra: true },
    { key: "orderedAmount", label: t('budget.orderedAmount', 'Ordered'), align: "right", extra: true },
    { key: "vendor", label: t('budget.vendor', 'Vendor'), extra: true },
    // ROT
    { key: "rotAmount", label: t('files.rotAmount', 'ROT-avdrag'), align: "right", extra: true },
  ], [t, isBuilder]);

  // For homeowners, filter out builder-only columns and remap certain core columns as extra
  const homeownerExtraSet = useMemo(() => new Set(HOMEOWNER_EXTRA_KEYS), []);
  const effectiveColumns = useMemo(() => {
    if (isBuilder) return ALL_COLUMNS;
    return ALL_COLUMNS
      .filter((col) => !HOMEOWNER_HIDDEN_COLUMNS.has(col.key))
      .map((col) => homeownerExtraSet.has(col.key) ? { ...col, extra: true } : col);
  }, [ALL_COLUMNS, isBuilder, homeownerExtraSet]);

  const effectiveExtraKeys = isBuilder ? EXTRA_COLUMN_KEYS : HOMEOWNER_EXTRA_KEYS;

  // Column order (drag reorder)
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    if (budgetPrefs.current?.columnOrder) {
      const ordered = budgetPrefs.current.columnOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is ColumnDef => c !== undefined);
      for (const col of ALL_COLUMNS) {
        if (!ordered.some((c) => c.key === col.key)) ordered.push(col);
      }
      return ordered;
    }
    return ALL_COLUMNS;
  });
  const dragCol = useRef<number | null>(null);
  const dragOverCol = useRef<number | null>(null);

  // Keep columns in sync when ALL_COLUMNS changes (language switch)
  useEffect(() => {
    setColumns((prev) => {
      const keyOrder = prev.map((c) => c.key);
      const updated = keyOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is ColumnDef => c !== undefined);
      for (const col of ALL_COLUMNS) {
        if (!updated.some((c) => c.key === col.key)) {
          updated.push(col);
        }
      }
      return updated;
    });
  }, [ALL_COLUMNS]);

  // Sorting
  const [sortKey, setSortKey] = useState<ColumnKey | null>(
    () => budgetPrefs.current?.sortKey ?? null
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    () => budgetPrefs.current?.sortDir ?? "asc"
  );

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Edit dialogs
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);
  const [invoiceMethodOpen, setInvoiceMethodOpen] = useState(false);

  const [compactRows, setCompactRows] = useState(
    () => budgetPrefs.current?.compactRows ?? true
  );

  // Task → material grouping
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const toggleTaskExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Inline add row
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowType, setNewRowType] = useState<"task" | "material">("task");
  const [newRowName, setNewRowName] = useState("");
  const [newRowBudget, setNewRowBudget] = useState("");
  const [newRowRoomId, setNewRowRoomId] = useState("");
  const [addingRowLoading, setAddingRowLoading] = useState(false);
  const [allRooms, setAllRooms] = useState<{ id: string; name: string }[]>([]);
  const newRowNameRef = useRef<HTMLInputElement>(null);

  // Auto-persist table prefs
  useEffect(() => {
    persistBudgetPrefs(projectId, {
      columnOrder: columns.map((c) => c.key),
      visibleExtras: Array.from(visibleExtras),
      sortKey,
      sortDir,
      compactRows,
    });
  }, [columns, visibleExtras, sortKey, sortDir, compactRows, projectId]);

  // Visible columns (filter out hidden extras)
  const visibleColumns = useMemo(
    () => {
      // Apply user column order but filter through effective columns for role
      const effectiveKeys = new Set(effectiveColumns.map((c) => c.key));
      return columns
        .filter((col) => effectiveKeys.has(col.key))
        .filter((col) => !col.extra || visibleExtras.has(col.key));
    },
    [columns, visibleExtras, effectiveColumns]
  );

  const toggleExtraColumn = (key: ColumnKey) => {
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

  // --- Data fetching ---

  const fetchData = useCallback(async () => {
    try {
      // Fetch profile defaults for labor cost percent
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_labor_cost_percent")
          .eq("user_id", user.id)
          .single();
        if (profile?.default_labor_cost_percent != null) {
          setDefaultLaborCostPercent(profile.default_labor_cost_percent);
        }
      }

      const [tasksRes, materialsRes, extraRes, projectRes, taskDocsRes, materialDocsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, budget, ordered_amount, payment_status, paid_amount, room_id, cost_center, start_date, finish_date, is_ata, estimated_hours, hourly_rate, labor_cost_percent, subcontractor_cost, markup_percent, material_estimate, material_markup_percent, task_cost_type, rot_amount")
          .eq("project_id", projectId),
        supabase
          .from("materials")
          .select("id, name, price_total, quantity, price_per_unit, ordered_amount, paid_amount, status, room_id, task_id, vendor_name")
          .eq("project_id", projectId)
          .eq("exclude_from_budget", false),
        supabase
          .from("materials")
          .select("price_total")
          .eq("project_id", projectId)
          .eq("exclude_from_budget", true),
        supabase
          .from("projects")
          .select("total_budget")
          .eq("id", projectId)
          .single(),
        supabase
          .from("task_file_links")
          .select("task_id, file_type")
          .eq("project_id", projectId)
          .not("task_id", "is", null),
        supabase
          .from("task_file_links")
          .select("material_id, file_type")
          .eq("project_id", projectId)
          .not("material_id", "is", null),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (extraRes.error) throw extraRes.error;

      setProjectBudget(projectRes.data?.total_budget ?? 0);

      // Calculate ÄTA total from both materials (exclude_from_budget) and tasks (is_ata)
      const materialAtaTotal = (extraRes.data || []).reduce((sum, m) => sum + (m.price_total || 0), 0);
      const taskAtaTotal = (tasksRes.data || [])
        .filter((t) => t.is_ata)
        .reduce((sum, t) => sum + (t.budget || 0), 0);
      setExtraTotal(materialAtaTotal + taskAtaTotal);

      // Build document count maps + qualifying file maps (invoice/receipt)
      const taskDocCounts = new Map<string, number>();
      const taskHasInvoice = new Map<string, boolean>();
      if (!taskDocsRes.error) {
        (taskDocsRes.data || []).forEach((d: { task_id: string | null; file_type?: string }) => {
          if (d.task_id) {
            taskDocCounts.set(d.task_id, (taskDocCounts.get(d.task_id) || 0) + 1);
            if (d.file_type === "invoice" || d.file_type === "receipt") {
              taskHasInvoice.set(d.task_id, true);
            }
          }
        });
      }

      const materialDocCounts = new Map<string, number>();
      const materialHasInvoice = new Map<string, boolean>();
      if (!materialDocsRes.error) {
        (materialDocsRes.data || []).forEach((d: { material_id: string | null; file_type?: string }) => {
          if (d.material_id) {
            materialDocCounts.set(d.material_id, (materialDocCounts.get(d.material_id) || 0) + 1);
            if (d.file_type === "invoice" || d.file_type === "receipt") {
              materialHasInvoice.set(d.material_id, true);
            }
          }
        });
      }

      // Collect unique room_ids and contractor_ids to resolve names
      const roomIds = new Set<string>();

      for (const t of tasksRes.data || []) {
        if (t.room_id) roomIds.add(t.room_id);
      }
      for (const m of materialsRes.data || []) {
        if (m.room_id) roomIds.add(m.room_id);
      }

      const roomMap = new Map<string, string>();

      if (roomIds.size > 0) {
        const { data: rooms } = await supabase
          .from("rooms")
          .select("id, name")
          .in("id", Array.from(roomIds));
        for (const r of rooms || []) {
          roomMap.set(r.id, r.name);
        }
      }

      // Sum linked material costs per task — split planned vs actual
      const materialConsumedMap = new Map<string, number>();
      const materialPlannedMap = new Map<string, number>();
      for (const m of materialsRes.data || []) {
        if (m.task_id) {
          const cost = m.price_total ?? (((m.quantity || 0) * (m.price_per_unit || 0)) || 0);
          if (m.status === "planned") {
            materialPlannedMap.set(m.task_id, (materialPlannedMap.get(m.task_id) || 0) + cost);
          } else {
            materialConsumedMap.set(m.task_id, (materialConsumedMap.get(m.task_id) || 0) + cost);
          }
        }
      }

      const taskRows: BudgetRow[] = (tasksRes.data || []).filter((t) => !t.is_ata).map((t) => {
        const attachmentCount = taskDocCounts.get(t.id) || 0;
        const estCost = computeTaskEstimatedCost(t, defaultLaborCostPercent, materialPlannedMap.get(t.id));
        return {
          id: t.id,
          name: t.title,
          type: "task" as const,
          budget: t.budget ?? 0,
          paid: t.paid_amount ?? 0,
          estimatedCost: estCost,
          isEstimated: (t.paid_amount ?? 0) <= 0,
          taskCostType: (t as Record<string, unknown>).task_cost_type as string | null ?? null,
          room: t.room_id ? roomMap.get(t.room_id) : undefined,
          roomId: t.room_id ?? undefined,
          assignee: undefined,
          assigneeId: undefined,
          costCenter: t.cost_center ?? undefined,
          startDate: t.start_date ?? undefined,
          finishDate: t.finish_date ?? undefined,
          hasAttachment: attachmentCount > 0,
          attachmentCount,
          materialBudget: computeMaterialBudget(t, materialPlannedMap.get(t.id)),
          materialConsumed: materialConsumedMap.get(t.id) || 0,
          status: t.status ?? undefined,
          estimatedHours: t.estimated_hours ?? undefined,
          hourlyRate: t.hourly_rate ?? undefined,
          subcontractorCost: t.subcontractor_cost ?? undefined,
          markupPercent: t.markup_percent ?? undefined,
          materialMarkupPercent: t.material_markup_percent ?? undefined,
          laborCostPercent: t.labor_cost_percent ?? undefined,
          paymentStatus: t.payment_status ?? undefined,
          orderedAmount: t.ordered_amount ?? undefined,
          rotAmount: (t as Record<string, unknown>).rot_amount as number ?? undefined,
          evidenceStatus: computeEvidenceStatus({
            rowType: "task",
            status: t.status,
            budget: t.budget ?? 0,
            paid: t.paid_amount ?? 0,
            cost: estCost,
            hasQualifyingFile: taskHasInvoice.get(t.id) ?? false,
            fileCount: attachmentCount,
          }),
        };
      });

      const materialRows: BudgetRow[] = (materialsRes.data || []).map((m) => {
        const attachmentCount = materialDocCounts.get(m.id) || 0;
        const materialTotal = m.price_total ?? (((m.quantity || 0) * (m.price_per_unit || 0)) || 0);
        return {
          id: m.id,
          name: m.name,
          type: "material" as const,
          budget: 0,
          paid: m.paid_amount ?? 0,
          estimatedCost: materialTotal,
          isEstimated: (m.paid_amount ?? 0) <= 0,
          room: m.room_id ? roomMap.get(m.room_id) : undefined,
          roomId: m.room_id ?? undefined,
          hasAttachment: attachmentCount > 0,
          attachmentCount,
          isUnlinked: !m.task_id,
          taskId: m.task_id ?? undefined,
          materialBudget: 0,
          materialConsumed: 0,
          status: m.status ?? undefined,
          quantity: m.quantity ?? undefined,
          pricePerUnit: m.price_per_unit ?? undefined,
          orderedAmount: m.ordered_amount ?? undefined,
          vendor: m.vendor_name ?? undefined,
          evidenceStatus: computeEvidenceStatus({
            rowType: "material",
            status: m.status,
            budget: 0,
            paid: m.paid_amount ?? 0,
            cost: materialTotal,
            hasQualifyingFile: materialHasInvoice.get(m.id) ?? false,
            fileCount: attachmentCount,
          }),
        };
      });

      setRows([...taskRows, ...materialRows]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToLoadData');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, defaultLaborCostPercent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch all rooms for the inline add dropdown
  const fetchRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId)
        .order("name");
      if (error) throw error;
      setAllRooms(data || []);
    } catch (error: unknown) {
      console.error("Failed to fetch rooms:", error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Focus name input when adding row
  useEffect(() => {
    if (isAddingRow && newRowNameRef.current) {
      newRowNameRef.current.focus();
    }
  }, [isAddingRow]);

  // Inline add row handlers
  const handleStartAddRow = () => {
    setIsAddingRow(true);
    setNewRowType("task");
    setNewRowName("");
    setNewRowBudget("");
    setNewRowRoomId("");
  };

  const handleCancelAddRow = () => {
    setIsAddingRow(false);
    setNewRowName("");
    setNewRowBudget("");
    setNewRowRoomId("");
  };

  const handleSaveNewRow = async () => {
    if (!newRowName.trim()) {
      toast({ title: t('common.error'), description: t('budget.nameRequired'), variant: "destructive" });
      return;
    }

    const budgetValue = parseFloat(newRowBudget) || 0;
    setAddingRowLoading(true);

    try {
      // Get current user's profile for created_by_user_id
      const { data: { user } } = await supabase.auth.getUser();
      let profileId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        profileId = profile?.id || null;
      }

      if (newRowType === "task") {
        const { error } = await supabase.from("tasks").insert({
          project_id: projectId,
          title: newRowName.trim(),
          budget: budgetValue,
          room_id: newRowRoomId || null,
          status: "to_do",
          priority: "medium",
          payment_status: "not_paid",
          created_by_user_id: profileId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({
          project_id: projectId,
          name: newRowName.trim(),
          price_total: budgetValue,
          room_id: newRowRoomId || null,
          status: "submitted",
          exclude_from_budget: false,
          quantity: 1,
          unit: "st",
          created_by_user_id: profileId,
        });
        if (error) throw error;
      }

      toast({ title: t('common.success'), description: t('budget.rowAdded') });
      handleCancelAddRow();
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToAddRow');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    } finally {
      setAddingRowLoading(false);
    }
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !addingRowLoading) {
      e.preventDefault();
      handleSaveNewRow();
    } else if (e.key === "Escape") {
      handleCancelAddRow();
    }
  };

  // --- Row actions: Duplicate & Delete ---

  const handleDuplicateRow = async (row: BudgetRow) => {
    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      let profileId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        profileId = profile?.id || null;
      }

      if (row.type === "task") {
        // Fetch full task data to duplicate
        const { data: task, error: fetchError } = await supabase
          .from("tasks")
          .select("title, budget, room_id, status, priority, payment_status, cost_center, description")
          .eq("id", row.id)
          .single();
        if (fetchError) throw fetchError;

        const { error } = await supabase.from("tasks").insert({
          project_id: projectId,
          title: `${task.title} (${t('budget.copy')})`,
          budget: task.budget,
          room_id: task.room_id,
          status: task.status,
          priority: task.priority,
          payment_status: "not_paid",
          cost_center: task.cost_center,
          description: task.description,
          created_by_user_id: profileId,
        });
        if (error) throw error;
      } else {
        // Fetch full material data to duplicate
        const { data: material, error: fetchError } = await supabase
          .from("materials")
          .select("name, price_total, room_id, status, quantity, unit, vendor_name, vendor_link, description, exclude_from_budget")
          .eq("id", row.id)
          .single();
        if (fetchError) throw fetchError;

        const { error } = await supabase.from("materials").insert({
          project_id: projectId,
          name: `${material.name} (${t('budget.copy')})`,
          price_total: material.price_total,
          room_id: material.room_id,
          status: "submitted",
          quantity: material.quantity,
          unit: material.unit,
          vendor_name: material.vendor_name,
          vendor_link: material.vendor_link,
          description: material.description,
          exclude_from_budget: material.exclude_from_budget,
          created_by_user_id: profileId,
        });
        if (error) throw error;
      }

      toast({ title: t('common.success'), description: t('budget.rowDuplicated') });
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToDuplicate');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    }
  };

  const handleDeleteRow = async (row: BudgetRow) => {
    // Simple confirmation
    if (!window.confirm(t('budget.confirmDelete', { name: row.name }))) {
      return;
    }

    try {
      if (row.type === "task") {
        const { error } = await supabase.from("tasks").delete().eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").delete().eq("id", row.id);
        if (error) throw error;
      }

      toast({ title: t('common.success'), description: t('budget.rowDeleted') });
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToDelete');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    }
  };

  // --- Distinct filter options ---

  const distinctRooms = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of rows) {
      if (r.roomId && r.room) set.set(r.roomId, r.room);
    }
    return Array.from(set, ([id, name]) => ({ id, name }));
  }, [rows]);

  const distinctAssignees = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of rows) {
      if (r.assigneeId && r.assignee) set.set(r.assigneeId, r.assignee);
    }
    return Array.from(set, ([id, name]) => ({ id, name }));
  }, [rows]);

  const distinctCostCenters = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.costCenter) set.add(r.costCenter);
    }
    return Array.from(set);
  }, [rows]);

  const distinctStatuses = useMemo(() => {
    const taskStatuses = new Set<string>();
    const materialStatuses = new Set<string>();
    for (const r of rows) {
      if (r.type === "task" && r.status) taskStatuses.add(r.status);
      if (r.type === "material" && r.status) materialStatuses.add(r.status);
    }
    return {
      task: Array.from(taskStatuses),
      material: Array.from(materialStatuses),
    };
  }, [rows]);

  // --- Inline cell save ---

  const handleCellSave = async (row: BudgetRow, col: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setEditingCell(null);
      return;
    }

    try {
      if (row.type === "task") {
        const fieldMap: Record<string, string> = { budget: "budget", paid: "paid_amount" };
        const { error } = await supabase
          .from("tasks")
          .update({ [fieldMap[col]]: numValue })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const fieldMap: Record<string, string> = { budget: "price_total", paid: "paid_amount" };
        const { error } = await supabase
          .from("materials")
          .update({ [fieldMap[col]]: numValue })
          .eq("id", row.id);
        if (error) throw error;
      }
      setEditingCell(null);
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToUpdateValue');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    }
  };

  // --- Column drag reorder ---

  const handleDragStart = (idx: number) => {
    dragCol.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverCol.current = idx;
  };

  const handleDrop = () => {
    if (dragCol.current === null || dragOverCol.current === null) return;
    if (dragCol.current === dragOverCol.current) return;

    const reordered = [...columns];
    const [moved] = reordered.splice(dragCol.current, 1);
    reordered.splice(dragOverCol.current, 0, moved);
    setColumns(reordered);

    dragCol.current = null;
    dragOverCol.current = null;
  };

  // --- Open edit dialog ---

  const openDetail = (row: BudgetRow) => {
    if (row.type === "task") {
      setEditTaskId(row.id);
    } else {
      setEditMaterialId(row.id);
    }
  };

  // --- Sorting ---

  const handleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // --- Filtering & Sorting ---

  const hasAdvancedFilter = filterRoom !== "all" || filterAssignee !== "all" || filterCostCenter !== "all" || filterStartDate !== "" || filterFinishDate !== "" || filterAttachment !== "all";

  const filtered = rows.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterStatuses.size > 0 && (!r.status || !filterStatuses.has(r.status))) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterRoom !== "all" && r.roomId !== filterRoom) return false;
    if (filterAssignee !== "all" && r.assigneeId !== filterAssignee) return false;
    if (filterCostCenter !== "all" && r.costCenter !== filterCostCenter) return false;
    if (filterStartDate && (!r.startDate || r.startDate < filterStartDate)) return false;
    if (filterFinishDate && (!r.finishDate || r.finishDate > filterFinishDate)) return false;
    if (filterAttachment === "has" && !r.hasAttachment) return false;
    if (filterAttachment === "missing" && r.hasAttachment) return false;
    return true;
  });

  if (sortKey) {
    filtered.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "paid") {
        av = getEffectiveCost(a);
        bv = getEffectiveCost(b);
      } else if (sortKey === "remaining") {
        if (isBuilder) {
          av = a.budget - getEffectiveCost(a);
          bv = b.budget - getEffectiveCost(b);
        } else {
          const aq = a.type === "task" ? a.budget : a.estimatedCost;
          const bq = b.type === "task" ? b.budget : b.estimatedCost;
          av = aq - a.paid;
          bv = bq - b.paid;
        }
      } else if (sortKey === "margin") {
        av = a.budget > 0 ? (a.budget - getEffectiveCost(a)) / a.budget : 0;
        bv = b.budget > 0 ? (b.budget - getEffectiveCost(b)) / b.budget : 0;
      } else if (sortKey === "matBudget") {
        av = a.materialBudget; bv = b.materialBudget;
      } else if (sortKey === "matConsumed") {
        av = a.materialConsumed; bv = b.materialConsumed;
      } else if (sortKey === "matRemaining") {
        av = a.materialBudget - a.materialConsumed;
        bv = b.materialBudget - b.materialConsumed;
      } else if (sortKey === "room") {
        av = a.room || "";
        bv = b.room || "";
      } else if (sortKey === "assignee") {
        av = a.assignee || "";
        bv = b.assignee || "";
      } else if (sortKey === "costCenter") {
        av = a.costCenter || "";
        bv = b.costCenter || "";
      } else if (sortKey === "startDate") {
        av = a.startDate || "";
        bv = b.startDate || "";
      } else if (sortKey === "finishDate") {
        av = a.finishDate || "";
        bv = b.finishDate || "";
      } else if (sortKey === "status") {
        av = a.status || "";
        bv = b.status || "";
      } else if (sortKey === "estimatedHours") {
        av = a.estimatedHours ?? 0;
        bv = b.estimatedHours ?? 0;
      } else if (sortKey === "hourlyRate") {
        av = a.hourlyRate ?? 0;
        bv = b.hourlyRate ?? 0;
      } else if (sortKey === "subcontractorCost") {
        av = a.subcontractorCost ?? 0;
        bv = b.subcontractorCost ?? 0;
      } else if (sortKey === "paymentStatus") {
        av = a.paymentStatus || "";
        bv = b.paymentStatus || "";
      } else if (sortKey === "quantity") {
        av = a.quantity ?? 0;
        bv = b.quantity ?? 0;
      } else if (sortKey === "pricePerUnit") {
        av = a.pricePerUnit ?? 0;
        bv = b.pricePerUnit ?? 0;
      } else if (sortKey === "orderedAmount") {
        av = a.orderedAmount ?? 0;
        bv = b.orderedAmount ?? 0;
      } else if (sortKey === "vendor") {
        av = a.vendor || "";
        bv = b.vendor || "";
      } else if (sortKey === "rotAmount") {
        av = a.rotAmount ?? 0;
        bv = b.rotAmount ?? 0;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const totals = filtered.reduce(
    (acc, r) => ({
      budget: acc.budget + r.budget,
      paid: acc.paid + r.paid,
      cost: acc.cost + getEffectiveCost(r),
      matBudget: acc.matBudget + (r.type === "task" ? r.materialBudget : 0),
      matConsumed: acc.matConsumed + (r.type === "task" ? r.materialConsumed : 0),
    }),
    { budget: 0, paid: 0, cost: 0, matBudget: 0, matConsumed: 0 }
  );

  // Group linked materials under their parent task for display
  const [unlinkedExpanded, setUnlinkedExpanded] = useState(false);

  const displayRows = useMemo(() => {
    const childMap = new Map<string, BudgetRow[]>();
    const topLevel: BudgetRow[] = [];
    const unlinkedMaterials: BudgetRow[] = [];

    for (const row of filtered) {
      if (row.type === "material" && row.taskId) {
        const parentInList = filtered.some(r => r.type === "task" && r.id === row.taskId);
        if (parentInList) {
          if (!childMap.has(row.taskId)) childMap.set(row.taskId, []);
          childMap.get(row.taskId)!.push(row);
          continue;
        }
      }
      // Separate unlinked materials
      if (row.type === "material" && row.isUnlinked) {
        unlinkedMaterials.push(row);
        continue;
      }
      topLevel.push(row);
    }

    const result: Array<BudgetRow & { isChild?: boolean; childCount?: number; isSectionHeader?: boolean }> = [];
    for (const row of topLevel) {
      const children = row.type === "task" ? (childMap.get(row.id) || []) : [];
      result.push({ ...row, childCount: children.length });
      if (row.type === "task" && expandedTasks.has(row.id)) {
        for (const child of children) {
          result.push({ ...child, isChild: true });
        }
      }
    }

    // Add unlinked materials section
    if (unlinkedMaterials.length > 0) {
      const unlinkedTotal = unlinkedMaterials.reduce((sum, m) => sum + (m.paid || m.estimatedCost || 0), 0);
      result.push({
        id: "__unlinked_header__",
        name: t("budget.unlinkedMaterials", "Standalone materials"),
        type: "material",
        budget: 0,
        paid: unlinkedTotal,
        estimatedCost: unlinkedTotal,
        isEstimated: false,
        materialBudget: 0,
        materialConsumed: 0,
        childCount: unlinkedMaterials.length,
        isSectionHeader: true,
      } as BudgetRow & { isChild?: boolean; childCount?: number; isSectionHeader?: boolean });
      if (unlinkedExpanded) {
        for (const m of unlinkedMaterials) {
          result.push({ ...m, isChild: true });
        }
      }
    }

    // Apply grouping if active
    if (groupBy === "none") return result;

    const getGroupKey = (row: BudgetRow): string => {
      switch (groupBy) {
        case "room": return row.roomId || "__no_room__";
        case "costCenter": return row.costCenter || "__no_cc__";
        case "status": return row.status || "__no_status__";
        default: return "__ungrouped__";
      }
    };

    const getGroupLabel = (key: string): string => {
      if (key === "__no_room__") return t("budget.noRoom", "No room");
      if (key === "__no_cc__") return t("budget.noCostCenter", "No cost center");
      if (key === "__no_status__") return t("budget.noStatus", "No status");
      switch (groupBy) {
        case "room": {
          const row = result.find((r) => !r.isSectionHeader && r.roomId === key);
          return row?.room || key;
        }
        case "costCenter": {
          const ccLabels: Record<string, string> = {
            demolition: t("costCenters.demolition", "Demolition"),
            electrical: t("costCenters.electrical", "Electrical"),
            plumbing: t("costCenters.plumbing", "Plumbing"),
            tiling: t("costCenters.tiling", "Tiling"),
            carpentry: t("costCenters.carpentry", "Carpentry"),
            painting: t("costCenters.painting", "Painting"),
            flooring: t("costCenters.flooring", "Flooring"),
            kitchen: t("costCenters.kitchen", "Kitchen"),
            bathroom: t("costCenters.bathroom", "Bathroom"),
            other: t("costCenters.other", "Other"),
          };
          return ccLabels[key] || key;
        }
        case "status": {
          return t(`statuses.${key}`, t(`materialStatuses.${key}`, key));
        }
        default: return key;
      }
    };

    // Group rows (skip section headers — they'll be replaced)
    const groups = new Map<string, Array<typeof result[0]>>();
    const groupOrder: string[] = [];
    for (const row of result) {
      if (row.isSectionHeader || row.isChild) continue;
      const key = getGroupKey(row);
      if (!groups.has(key)) {
        groups.set(key, []);
        groupOrder.push(key);
      }
      groups.get(key)!.push(row);
      // Also add children if expanded
      if (row.type === "task" && expandedTasks.has(row.id)) {
        const children = result.filter((r) => r.isChild && r.taskId === row.id);
        groups.get(key)!.push(...children);
      }
    }
    // Also add unlinked section rows
    const unlinkedRows = result.filter((r) => r.isSectionHeader || (r.isChild && r.isUnlinked));

    const grouped: typeof result = [];
    for (const key of groupOrder) {
      const groupRows = groups.get(key)!;
      const topRows = groupRows.filter((r) => !r.isChild);
      const groupBudget = topRows.reduce((s, r) => s + r.budget, 0);
      const groupPaid = topRows.reduce((s, r) => s + r.paid, 0);
      grouped.push({
        id: `__group_${key}__`,
        name: getGroupLabel(key),
        type: "task",
        budget: groupBudget,
        paid: groupPaid,
        estimatedCost: 0,
        isEstimated: false,
        materialBudget: 0,
        materialConsumed: 0,
        childCount: topRows.length,
        isSectionHeader: true,
        hasAttachment: false,
        attachmentCount: 0,
        _groupKey: key,
      } as typeof result[0] & { _groupKey?: string });
      if (!collapsedGroups.has(key)) {
        grouped.push(...groupRows);
      }
    }
    // Append unlinked materials at the end
    grouped.push(...unlinkedRows);

    return grouped;
  }, [filtered, expandedTasks, unlinkedExpanded, groupBy, collapsedGroups, t]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterRoom("all");
    setFilterAssignee("all");
    setFilterCostCenter("all");
    setFilterStartDate("");
    setFilterFinishDate("");
    setFilterAttachment("all");
    setFilterStatus("all");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("sv-SE");
  };

  // --- Cell renderers ---

  const renderCell = (col: ColumnDef, row: BudgetRow & { isChild?: boolean; childCount?: number }) => {
    switch (col.key) {
      case "name":
        return (
          <span className={`inline-flex items-center gap-1${row.isChild ? " pl-6" : ""}`}>
            {row.isChild && (
              <span className="text-muted-foreground text-xs mr-0.5">└</span>
            )}
            <button
              className="font-medium text-left hover:underline text-primary cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(row);
              }}
            >
              {row.name}
            </button>
            {row.type === "task" && (row.childCount ?? 0) > 0 && (
              <button
                className="ml-1.5 inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskExpand(row.id);
                }}
              >
                <ShoppingCart className="h-3 w-3" />
                <span className="text-xs">{row.childCount}</span>
              </button>
            )}
            {row.isUnlinked && (
              <span className="ml-1.5 text-amber-500" title={t("budget.unlinkedWarning")}>
                &#9888;
              </span>
            )}
          </span>
        );
      case "type": {
        if (row.type === "material") {
          return (
            <Badge variant={row.isChild ? "outline" : "secondary"} className="gap-1">
              <ShoppingCart className="h-3 w-3" />
              {t('budget.material')}
            </Badge>
          );
        }
        const isSubcontractor = row.taskCostType === "subcontractor" || (!row.taskCostType && (row.subcontractorCost ?? 0) > 0);
        const hasOwnLabor = row.taskCostType === "own_labor" || (!row.taskCostType && (row.estimatedHours ?? 0) > 0);
        return (
          <Badge variant="default" className="gap-1">
            {isSubcontractor ? <Handshake className="h-3 w-3" /> : <Hammer className="h-3 w-3" />}
            {isSubcontractor && !hasOwnLabor
              ? t('budget.subcontractor', 'UE')
              : t('budget.task')}
          </Badge>
        );
      }
      case "status": {
        if (!row.status) return <span className="text-muted-foreground">{"\u2014"}</span>;
        const statusLabel = row.type === "task"
          ? t(`statuses.${budgetStatusKey(row.status)}`, row.status)
          : t(`materialStatuses.${row.status}`, row.status);
        return <Badge className={cn("border", getStatusBadgeColor(row.status))}>{statusLabel}</Badge>;
      }
      case "budget": {
        if (row.type === "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
        if (!isBuilder) return <span>{formatCurrency(row.budget, currency)}</span>;
        const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.key;
        if (isEditing) {
          return (
            <Input
              type="number"
              className="w-24 h-7 text-right"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave(row, col.key, editValue);
                if (e.key === "Escape") setEditingCell(null);
              }}
              onBlur={() => handleCellSave(row, col.key, editValue)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <button
            className="hover:bg-muted px-1 rounded cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ rowId: row.id, col: col.key });
              setEditValue(String(row.budget));
            }}
          >
            {formatCurrency(row.budget, currency)}
          </button>
        );
      }
      case "paid": {
        if (!isBuilder) {
          // Homeowner: show only actual paid amount — no estimate fallback
          return <span>{formatCurrency(row.paid, currency)}</span>;
        }
        // Builder: show effectiveCost (falls back to estimate when no payment)
        const effectiveCost = getEffectiveCost(row);
        const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.key;
        if (isEditing) {
          return (
            <Input
              type="number"
              className="w-24 h-7 text-right"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCellSave(row, col.key, editValue);
                if (e.key === "Escape") setEditingCell(null);
              }}
              onBlur={() => handleCellSave(row, col.key, editValue)}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <button
            className="hover:bg-muted px-1 rounded cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCell({ rowId: row.id, col: col.key });
              setEditValue(row.paid > 0 ? String(row.paid) : "");
            }}
          >
            <span className={row.isEstimated ? "text-muted-foreground italic" : ""}>
              {formatCurrency(effectiveCost, currency)}
              {row.isEstimated && effectiveCost > 0 && <span className="ml-0.5">*</span>}
            </span>
          </button>
        );
      }
      case "remaining": {
        if (isBuilder) {
          // Builder: remaining = budget - effective cost (tasks only)
          if (row.type === "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
          const result = row.budget - getEffectiveCost(row);
          return (
            <span className={result < 0 ? "text-destructive" : result > 0 ? "text-green-600" : ""}>
              {formatCurrency(result, currency)}
            </span>
          );
        }
        // Homeowner: outstanding = quoted - paid (all rows)
        const quoted = row.type === "task" ? row.budget : row.estimatedCost;
        if (quoted <= 0) return <span className="text-muted-foreground">{"\u2014"}</span>;
        const outstanding = quoted - row.paid;
        return (
          <span className={outstanding < 0 ? "text-destructive" : outstanding > 0 ? "text-amber-600" : "text-green-600"}>
            {formatCurrency(outstanding, currency)}
          </span>
        );
      }
      case "margin": {
        if (row.type === "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
        const effectiveCost = getEffectiveCost(row);
        const result = row.budget - effectiveCost;
        const marginPct = row.budget > 0 ? Math.round((result / row.budget) * 100) : 0;
        const plannedMarkup = row.markupPercent;
        let colorClass = "text-muted-foreground";
        if (marginPct < 0) colorClass = "text-destructive";
        else if (marginPct < 15) colorClass = "text-amber-500";
        else if (marginPct >= 30) colorClass = "text-green-600";
        return (
          <div className="text-right">
            <span className={colorClass}>{marginPct}%</span>
            {plannedMarkup != null && plannedMarkup > 0 && marginPct !== plannedMarkup && (
              <span className="block text-[10px] text-muted-foreground">
                {t("budget.planned", "Plan")}: {plannedMarkup}%
              </span>
            )}
          </div>
        );
      }
      case "matBudget":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return row.materialBudget > 0
          ? <span>{formatCurrency(row.materialBudget, currency)}</span>
          : <span className="text-muted-foreground">{"\u2014"}</span>;
      case "matConsumed":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return row.materialConsumed > 0
          ? <span>{formatCurrency(row.materialConsumed, currency)}</span>
          : <span className="text-muted-foreground">{"\u2014"}</span>;
      case "matRemaining": {
        if (row.type !== "task" || row.materialBudget <= 0)
          return <span className="text-muted-foreground">{"\u2014"}</span>;
        const matRemaining = row.materialBudget - row.materialConsumed;
        const pctLeft = row.materialBudget > 0 ? matRemaining / row.materialBudget : 0;
        let matColorClass = "text-green-600";
        if (pctLeft <= 0) matColorClass = "text-destructive";
        else if (pctLeft <= 0.2) matColorClass = "text-amber-500";
        return <span className={matColorClass}>{formatCurrency(matRemaining, currency)}</span>;
      }
      case "room":
        return <span className="text-sm">{row.room || "\u2014"}</span>;
      case "assignee":
        return <span className="text-sm">{row.assignee || "\u2014"}</span>;
      case "costCenter":
        return <span className="text-sm">{row.costCenter || "\u2014"}</span>;
      case "startDate":
        return <span className="text-sm">{formatDate(row.startDate)}</span>;
      case "finishDate":
        return <span className="text-sm">{formatDate(row.finishDate)}</span>;
      case "attachment":
        if (!row.hasAttachment) return null;
        return (
          <FilePreviewPopover
            projectId={projectId}
            taskId={row.type === "task" ? row.id : undefined}
            materialId={row.type === "material" ? row.id : undefined}
          >
            <button type="button" className="cursor-pointer">
              <AttachmentIndicator hasAttachment={row.hasAttachment} count={row.attachmentCount} />
            </button>
          </FilePreviewPopover>
        );
      case "evidence": {
        const es = row.evidenceStatus;
        if (!es || es === "na") return null;
        const dotColor = getEvidenceColor(es);
        const label = t(`evidence.${es}`);
        const dot = <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor}`} title={label} />;
        if (row.hasAttachment) {
          return (
            <FilePreviewPopover
              projectId={projectId}
              taskId={row.type === "task" ? row.id : undefined}
              materialId={row.type === "material" ? row.id : undefined}
            >
              <button type="button" className="cursor-pointer">{dot}</button>
            </FilePreviewPopover>
          );
        }
        return dot;
      }
      // Task-specific extras
      case "estimatedHours":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.estimatedHours != null ? row.estimatedHours : "\u2014"}</span>;
      case "hourlyRate":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.hourlyRate != null ? formatCurrency(row.hourlyRate, currency) : "\u2014"}</span>;
      case "subcontractorCost":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.subcontractorCost ? formatCurrency(row.subcontractorCost, currency) : "\u2014"}</span>;
      case "paymentStatus": {
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        if (!row.paymentStatus) return <span className="text-muted-foreground">{"\u2014"}</span>;
        const pmtKey = budgetStatusKey(row.paymentStatus);
        const pmtColor = row.paymentStatus === "paid" ? "bg-green-100 text-green-700"
          : row.paymentStatus === "partially_paid" ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-700";
        return <Badge className={pmtColor}>{t(`paymentStatuses.${pmtKey}`, row.paymentStatus)}</Badge>;
      }
      // Material-specific extras
      case "quantity":
        if (row.type !== "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.quantity != null ? row.quantity : "\u2014"}</span>;
      case "pricePerUnit":
        if (row.type !== "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.pricePerUnit != null ? formatCurrency(row.pricePerUnit, currency) : "\u2014"}</span>;
      case "orderedAmount":
        return <span className="text-sm">{row.orderedAmount ? formatCurrency(row.orderedAmount, currency) : "\u2014"}</span>;
      case "vendor":
        if (row.type !== "material") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.vendor || "\u2014"}</span>;
      case "rotAmount":
        if (row.type !== "task") return <span className="text-muted-foreground">{"\u2014"}</span>;
        return <span className="text-sm">{row.rotAmount ? formatCurrency(row.rotAmount, currency) : "\u2014"}</span>;
      default:
        return null;
    }
  };

  const renderFooterCell = (col: ColumnDef) => {
    switch (col.key) {
      case "name":
        return <span className="font-bold">{t('budget.totals')}</span>;
      case "budget":
        return <span className="font-bold">{formatCurrency(totals.budget, currency)}</span>;
      case "paid":
        // Homeowner: sum of actual payments only; Builder: sum of effective costs
        return <span className="font-bold">{formatCurrency(isBuilder ? totals.cost : totals.paid, currency)}</span>;
      case "remaining": {
        if (isBuilder) {
          const totalResult = totals.budget - totals.cost;
          return (
            <span className={`font-bold ${totalResult < 0 ? "text-destructive" : totalResult > 0 ? "text-green-600" : ""}`}>
              {formatCurrency(totalResult, currency)}
            </span>
          );
        }
        // Homeowner: sum of (quoted - paid) for tasks + unlinked materials only
        // Linked materials are already included in the parent task's quote
        const totalOutstanding = filtered.reduce((sum, r) => {
          if (r.type === "material" && r.taskId) return sum; // skip linked materials
          const quoted = r.type === "task" ? r.budget : r.estimatedCost;
          return sum + (quoted > 0 ? quoted - r.paid : 0);
        }, 0);
        return (
          <span className={`font-bold ${totalOutstanding < 0 ? "text-destructive" : totalOutstanding > 0 ? "text-amber-600" : "text-green-600"}`}>
            {formatCurrency(totalOutstanding, currency)}
          </span>
        );
      }
      case "margin": {
        const totalResult = totals.budget - totals.cost;
        const totalMargin = totals.budget > 0 ? Math.round((totalResult / totals.budget) * 100) : 0;
        let colorClass = "";
        if (totalMargin < 0) colorClass = "text-destructive";
        else if (totalMargin < 15) colorClass = "text-amber-500";
        else if (totalMargin >= 30) colorClass = "text-green-600";
        return <span className={`font-bold ${colorClass}`}>{totalMargin}%</span>;
      }
      case "matBudget":
        return <span className="font-bold">{formatCurrency(totals.matBudget, currency)}</span>;
      case "matConsumed":
        return <span className="font-bold">{formatCurrency(totals.matConsumed, currency)}</span>;
      case "matRemaining": {
        const totalMatRemaining = totals.matBudget - totals.matConsumed;
        const matPctLeft = totals.matBudget > 0 ? totalMatRemaining / totals.matBudget : 0;
        let matFooterColor = "text-green-600";
        if (matPctLeft <= 0) matFooterColor = "text-destructive";
        else if (matPctLeft <= 0.2) matFooterColor = "text-amber-500";
        return <span className={`font-bold ${totals.matBudget > 0 ? matFooterColor : ""}`}>{formatCurrency(totalMatRemaining, currency)}</span>;
      }
      case "rotAmount": {
        const totalRot = rows.filter(r => r.type === "task").reduce((sum, r) => sum + (r.rotAmount ?? 0), 0);
        return totalRot > 0 ? <span className="font-bold text-green-700">{formatCurrency(totalRot, currency)}</span> : null;
      }
      default:
        return null;
    }
  };

  // --- Loading state ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Simplified read-only view for clients/viewers ---
  if (isReadOnly) {
    const totalSpent = totals.paid;
    const spentPercent = projectBudget > 0 ? Math.min(Math.round((totalSpent / projectBudget) * 100), 100) : 0;
    const remaining = projectBudget - totalSpent;
    const taskTotal = rows.filter(r => r.type === "task").reduce((s, r) => s + r.budget, 0);
    const materialTotal = rows.filter(r => r.type === "material").reduce((s, r) => s + r.budget, 0);

    return (
      <div className="space-y-5 sm:space-y-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('budget.title')}</h2>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('budget.simpleTotalBudget', 'Total budget')}</p>
              <p className="text-3xl font-bold">{formatCurrency(projectBudget, currency)}</p>
            </div>
            <p className="text-lg font-semibold text-muted-foreground">{spentPercent}%</p>
          </div>
          <Progress value={spentPercent} className="h-3" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('budget.simpleSpent', 'Spent')}</p>
              <p className="text-xl font-semibold">{formatCurrency(totalSpent, currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{t('budget.simpleRemaining', 'Remaining')}</p>
              <p className={`text-xl font-semibold ${remaining < 0 ? "text-destructive" : ""}`}>
                {formatCurrency(remaining, currency)}
              </p>
            </div>
          </div>
        </div>

        {(taskTotal > 0 || materialTotal > 0) && (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{t('budget.simpleBreakdown', 'Breakdown')}</p>
            {taskTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('budget.simpleTasks', 'Work & services')}</span>
                <span className="font-medium">{formatCurrency(taskTotal, currency)}</span>
              </div>
            )}
            {materialTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('budget.simpleMaterials', 'Materials & purchases')}</span>
                <span className="font-medium">{formatCurrency(materialTotal, currency)}</span>
              </div>
            )}
            {extraTotal > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('budget.simpleExtra', 'Outside budget')}</span>
                  <span className="font-medium text-muted-foreground">{formatCurrency(extraTotal, currency)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {rows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('budget.simpleEmpty', 'No budget items yet. Your project manager will add costs as work progresses.')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {isBuilder ? (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('budget.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('budget.description')}
          </p>
          <div className="mb-6">
            <BuilderSummaryCards projectId={projectId} currency={currency} onCreateInvoice={() => setInvoiceMethodOpen(true)} />
          </div>
        </>
      ) : (
        <div className="mb-6">
          <HomeownerBudgetView projectId={projectId} currency={currency} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-row flex-wrap items-end gap-2 md:gap-4 mb-4">
        <div className={`transition-all duration-200 ${searchQuery || searchExpanded ? "min-w-[140px] max-w-[200px]" : "w-8"}`}>
          {searchQuery || searchExpanded ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="budget-search"
                autoFocus
                placeholder={t('budget.filterByName')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
                className="pl-9 h-8"
              />
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSearchExpanded(true)}
              title={t('budget.filterByName')}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="w-[130px]">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | "task" | "material")}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('budget.allTypes')}</SelectItem>
              <SelectItem value="task">{t('budget.tasks')}</SelectItem>
              <SelectItem value="material">{t('budget.materials')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status filter - multiselect */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 gap-1.5 text-sm font-normal">
              {filterStatuses.size === 0
                ? t('budget.status', 'Status')
                : filterStatuses.size === 1
                  ? t(`statuses.${budgetStatusKey([...filterStatuses][0])}`, t(`materialStatuses.${[...filterStatuses][0]}`, [...filterStatuses][0]))
                  : `${filterStatuses.size} ${t('budget.statusesSelected', 'valda')}`}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            {filterStatuses.size > 0 && (
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs mb-1" onClick={() => setFilterStatuses(new Set())}>
                {t('budget.clearFilter', 'Rensa filter')}
              </Button>
            )}
            {distinctStatuses.task.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('budget.task')}</div>
                {distinctStatuses.task.map((s) => (
                  <label key={`task-${s}`} className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={filterStatuses.has(s)}
                      onCheckedChange={(checked) => {
                        const next = new Set(filterStatuses);
                        checked ? next.add(s) : next.delete(s);
                        setFilterStatuses(next);
                      }}
                    />
                    <span className="text-sm">{t(`statuses.${budgetStatusKey(s)}`, s)}</span>
                  </label>
                ))}
              </>
            )}
            {distinctStatuses.material.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t('budget.material')}</div>
                {distinctStatuses.material.map((s) => (
                  <label key={`mat-${s}`} className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer">
                    <Checkbox
                      checked={filterStatuses.has(s)}
                      onCheckedChange={(checked) => {
                        const next = new Set(filterStatuses);
                        checked ? next.add(s) : next.delete(s);
                        setFilterStatuses(next);
                      }}
                    />
                    <span className="text-sm">{t(`materialStatuses.${s}`, s)}</span>
                  </label>
                ))}
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Filter+ button */}
        <Button
          variant={hasAdvancedFilter ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
          title={t('budget.advancedFilter')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        {/* Columns toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" title={t('budget.columns')}>
              <Columns3 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">{t('budget.extraColumns')}</p>
              {effectiveExtraKeys.map((key) => {
                const col = ALL_COLUMNS.find((c) => c.key === key);
                return (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
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

        {/* Evidence summary */}
        {(() => {
          const applicable = filtered.filter((r) => r.evidenceStatus && r.evidenceStatus !== "na");
          if (applicable.length === 0) return null;
          const verified = applicable.filter((r) => r.evidenceStatus === "verified").length;
          const missing = applicable.filter((r) => r.evidenceStatus === "missing").length;
          return (
            <span className={cn("text-xs tabular-nums px-2 py-1 rounded-md border", missing > 0 ? "border-amber-300 text-amber-700 bg-amber-50" : "border-green-300 text-green-700 bg-green-50")}>
              {verified}/{applicable.length} {t("evidence.summaryLabel")}
            </span>
          );
        })()}

        {/* Compact rows toggle */}
        <Button
          variant={compactRows ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setCompactRows((prev) => !prev)}
          title={t('budget.compactRows', 'Compact rows')}
        >
          <Rows3 className="h-4 w-4" />
        </Button>

        {/* Group by */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={groupBy !== "none" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title={t("budget.groupNone")}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">{t("budget.groupBy", "Group by")}</p>
              {(["none", "room", "costCenter", "status"] as GroupByOption[]).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent ${groupBy === opt ? "bg-accent font-medium" : ""}`}
                  onClick={() => handleGroupByChange(opt)}
                >
                  {opt === "none" && t("budget.groupNone")}
                  {opt === "room" && t("budget.groupByRoom")}
                  {opt === "costCenter" && t("budget.groupByCostCenter")}
                  {opt === "status" && t("budget.groupByStatus")}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {(searchQuery || filterType !== "all" || hasAdvancedFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            {t('budget.clearFilters')}
          </Button>
        )}
      </div>

      {/* Advanced Filters Row */}
      {showAdvancedFilters && (
        <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-muted/30 rounded-lg border">
          {distinctRooms.length > 0 && (
            <div className="w-[160px]">
              <Label className="text-sm mb-1.5 block">{t('budget.room')}</Label>
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budget.allRooms')}</SelectItem>
                  {distinctRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {distinctAssignees.length > 0 && (
            <div className="w-[160px]">
              <Label className="text-sm mb-1.5 block">{t('budget.assignee')}</Label>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budget.allAssignees')}</SelectItem>
                  {distinctAssignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {distinctCostCenters.length > 0 && (
            <div className="w-[160px]">
              <Label className="text-sm mb-1.5 block">{t('budget.costCenter')}</Label>
              <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budget.all')}</SelectItem>
                  {distinctCostCenters.map((cc) => (
                    <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-[160px]">
            <Label className="text-sm mb-1.5 block">{t('budget.startDateFrom')}</Label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="w-[160px]">
            <Label className="text-sm mb-1.5 block">{t('budget.finishDateTo')}</Label>
            <Input
              type="date"
              value={filterFinishDate}
              onChange={(e) => setFilterFinishDate(e.target.value)}
            />
          </div>
          <div className="w-[160px]">
            <Label className="text-sm mb-1.5 block">{t('budget.filterAttachment')}</Label>
            <Select value={filterAttachment} onValueChange={(v) => setFilterAttachment(v as "all" | "has" | "missing")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('budget.allAttachments')}</SelectItem>
                <SelectItem value="has">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3" />
                    {t('budget.hasAttachment')}
                  </span>
                </SelectItem>
                <SelectItem value="missing">{t('budget.missingAttachment')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground md:hidden flex items-center gap-1">
          ← {t('budget.swipeToSeeMore', 'Svep för mer')} →
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/60 mb-1 text-right">
        {isBuilder ? t('budget.exMomsNote', 'All amounts ex. VAT') : t('budget.incMomsNote', 'All amounts inc. VAT')}
      </p>
      <div className="border rounded-lg overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col, idx) => (
                <TableHead
                  key={col.key}
                  className={`${col.align === "right" ? "text-right" : ""} select-none${compactRows ? " py-1 text-xs h-8" : ""}${idx === 0 ? " sticky left-0 z-20 bg-card after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                >
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                    )}
                  </button>
                </TableHead>
              ))}
              {/* Actions column header (builder only) */}
              {isBuilder && (
                <TableHead className={`w-20${compactRows ? " py-1 text-xs h-8" : ""}`} />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 && !isAddingRow ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (isBuilder ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  {t('budget.noBudgetItems')}
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => {
                const rowMeta = row as unknown as { isSectionHeader?: boolean; childCount?: number; _groupKey?: string };

                // Unlinked materials section header
                if (rowMeta.isSectionHeader && row.id === "__unlinked_header__") return (
                  <TableRow
                    key="unlinked-header"
                    className={`cursor-pointer hover:bg-muted/50 bg-amber-50/50 border-t-2 border-amber-200${compactRows ? " h-8" : ""}`}
                    onClick={() => setUnlinkedExpanded(!unlinkedExpanded)}
                  >
                    <TableCell colSpan={visibleColumns.length + (isBuilder ? 1 : 0)} className="py-2">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 text-amber-500 transition-transform ${unlinkedExpanded ? "" : "-rotate-90"}`} />
                        <Package className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">{row.name}</span>
                        <Badge variant="secondary" className="text-xs">{rowMeta.childCount}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{formatCurrency(row.estimatedCost, currency)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );

                // Group header (from groupBy)
                if (rowMeta.isSectionHeader && rowMeta._groupKey != null) return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer hover:bg-muted/50 bg-primary/5 border-t-2 border-primary/20${compactRows ? " h-8" : ""}`}
                    onClick={() => toggleGroupCollapse(rowMeta._groupKey!)}
                  >
                    <TableCell colSpan={visibleColumns.length + (isBuilder ? 1 : 0)} className="py-2">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 text-primary transition-transform ${collapsedGroups.has(rowMeta._groupKey!) ? "-rotate-90" : ""}`} />
                        <span className="text-sm font-semibold">{row.name}</span>
                        <Badge variant="secondary" className="text-xs">{rowMeta.childCount}</Badge>
                        {row.budget > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                            {t("dashboard.budget")}: {formatCurrency(row.budget, currency)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );

                // Regular row
                return (
                <TableRow
                  key={`${row.type}-${row.id}`}
                  className={`cursor-pointer hover:bg-muted/50${compactRows ? " h-8" : ""}${row.isChild ? " bg-muted/30" : ""}`}
                  onClick={() => openDetail(row)}
                >
                  {visibleColumns.map((col, colIdx) => (
                    <TableCell
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : ""}${compactRows ? " py-0.5 px-2 text-xs" : ""}${row.isChild && compactRows ? " text-[11px]" : ""}${colIdx === 0 ? ` sticky left-0 z-10 ${row.isChild ? "bg-muted/30" : "bg-card"} after:content-[''] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border` : ""}`}
                    >
                      {renderCell(col, row)}
                    </TableCell>
                  ))}
                  {/* Row Actions (builder only) */}
                  {isBuilder && (
                    <TableCell className={`${compactRows ? "py-0.5 px-1" : "px-2"}`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={compactRows ? "h-6 w-6" : "h-8 w-8"}
                          onClick={() => handleDuplicateRow(row)}
                          title={t('budget.duplicate')}
                        >
                          <Copy className={compactRows ? "h-3 w-3" : "h-4 w-4"} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${compactRows ? "h-6 w-6" : "h-8 w-8"} text-muted-foreground hover:text-destructive`}
                          onClick={() => handleDeleteRow(row)}
                          title={t('budget.deleteRow')}
                        >
                          <Trash2 className={compactRows ? "h-3 w-3" : "h-4 w-4"} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}

            {/* Inline Add Row (builder only) */}
            {isBuilder && (
              isAddingRow ? (
                <TableRow className={`bg-primary/5 border-primary/20${compactRows ? " h-8" : ""}`}>
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : ""}${compactRows ? " py-0.5 px-2 text-xs" : " py-1"}`}
                    >
                      {col.key === "name" ? (
                        <Input
                          ref={newRowNameRef}
                          type="text"
                          placeholder={t('budget.enterName')}
                          className={`${compactRows ? "h-6 text-xs" : "h-8"} w-full min-w-[120px]`}
                          value={newRowName}
                          onChange={(e) => setNewRowName(e.target.value)}
                          onKeyDown={handleNewRowKeyDown}
                          disabled={addingRowLoading}
                        />
                      ) : col.key === "type" ? (
                        <Select
                          value={newRowType}
                          onValueChange={(v) => setNewRowType(v as "task" | "material")}
                          disabled={addingRowLoading}
                        >
                          <SelectTrigger className={`${compactRows ? "h-6 text-xs" : "h-8"} w-[100px]`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="task">{t('budget.task')}</SelectItem>
                            <SelectItem value="material">{t('budget.material')}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : col.key === "budget" ? (
                        <Input
                          type="number"
                          placeholder="0"
                          className={`${compactRows ? "h-6 text-xs" : "h-8"} w-24 text-right`}
                          value={newRowBudget}
                          onChange={(e) => setNewRowBudget(e.target.value)}
                          onKeyDown={handleNewRowKeyDown}
                          disabled={addingRowLoading}
                        />
                      ) : col.key === "room" ? (
                        <Select
                          value={newRowRoomId || "none"}
                          onValueChange={(v) => setNewRowRoomId(v === "none" ? "" : v)}
                          disabled={addingRowLoading}
                        >
                          <SelectTrigger className={`${compactRows ? "h-6 text-xs" : "h-8"} w-[120px]`}>
                            <SelectValue placeholder={t('budget.selectRoom')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('budget.noRoom')}</SelectItem>
                            {allRooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </TableCell>
                  ))}
                  {/* Save/Cancel buttons in actions column */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className={compactRows ? "h-6 text-xs px-2" : "h-8"}
                        onClick={handleSaveNewRow}
                        disabled={addingRowLoading || !newRowName.trim()}
                      >
                        {addingRowLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          t('common.save')
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={compactRows ? "h-6 text-xs px-2" : "h-8"}
                        onClick={handleCancelAddRow}
                        disabled={addingRowLoading}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  className={`hover:bg-muted/50 cursor-pointer${compactRows ? " h-8" : ""}`}
                  onClick={handleStartAddRow}
                >
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className={`text-muted-foreground${compactRows ? " py-0.5 px-2 text-xs" : ""}`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Plus className="h-4 w-4" />
                      {t('budget.addRow')}
                    </span>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={`${col.align === "right" ? "text-right" : ""}${compactRows ? " py-0.5 px-2 text-xs" : ""}`}
                  >
                    {renderFooterCell(col)}
                  </TableCell>
                ))}
                {isBuilder && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Budget Charts Section (builder only) */}
      {isBuilder && <BudgetChartsSection rows={rows} currency={currency} />}

      {/* Yearly analysis section (homeowner only) */}
      {!isBuilder && (
        <div className="mt-6">
          <HomeownerAnalysisSection projectId={projectId} currency={currency} />
        </div>
      )}

      {/* ROT section — builders only (homeowners see per-person in DeclarationTable) */}
      {showTaxDeduction && isBuilder && (
        <div className="mt-6">
          <RotSummaryCard projectId={projectId} />
        </div>
      )}

      {/* Task Edit Dialog */}
      <TaskEditDialog
        taskId={editTaskId}
        projectId={projectId}
        open={editTaskId !== null}
        onOpenChange={(open) => !open && setEditTaskId(null)}
        onSaved={fetchData}
        currency={currency}
      />

      {/* Material Edit Dialog */}
      <MaterialEditDialog
        materialId={editMaterialId}
        projectId={projectId}
        open={editMaterialId !== null}
        onOpenChange={(open) => !open && setEditMaterialId(null)}
        onSaved={fetchData}
        currency={currency}
      />

      {isBuilder && (
        <InvoiceMethodDialog
          projectId={projectId}
          open={invoiceMethodOpen}
          onOpenChange={setInvoiceMethodOpen}
        />
      )}
    </div>
  );
};

export default BudgetTab;
