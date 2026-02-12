import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, GripVertical, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, Columns3, Save, FolderOpen, Trash2, Plus, Rows3 } from "lucide-react";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

// --- Types ---

interface BudgetRow {
  id: string;
  name: string;
  type: "task" | "material";
  budget: number;
  ordered: number;
  paid: number;
  status: string;
  room?: string;
  roomId?: string;
  assignee?: string;
  assigneeId?: string;
  costCenter?: string;
  startDate?: string;
  finishDate?: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  budget: number | null;
  payment_status: string | null;
  paid_amount: number | null;
  cost_center: string | null;
  start_date: string | null;
  finish_date: string | null;
  due_date: string | null;
}

interface MaterialDetail {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  price_per_unit: number | null;
  price_total: number | null;
  vendor_name: string | null;
  vendor_link: string | null;
  status: string;
  exclude_from_budget: boolean;
  created_at: string;
}

type ColumnKey = "name" | "type" | "budget" | "ordered" | "paid" | "remaining" | "room" | "assignee" | "costCenter" | "startDate" | "finishDate" | "status";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  align?: "left" | "right";
  extra?: boolean;
}

const EXTRA_COLUMN_KEYS: ColumnKey[] = ["room", "assignee", "costCenter", "startDate", "finishDate"];

interface BudgetTabProps {
  projectId: string;
  currency?: string | null;
}

// --- Saved Views ---

interface SavedView {
  id: string;
  name: string;
  columnOrder: ColumnKey[];
  visibleExtras: ColumnKey[];
  sortKey: ColumnKey | null;
  sortDir: "asc" | "desc";
  compactRows?: boolean;
}

const VIEWS_STORAGE_KEY = (projectId: string) => `budget-saved-views-${projectId}`;

function loadSavedViews(projectId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY(projectId));
    if (!raw) return [];
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
}

function persistSavedViews(projectId: string, views: SavedView[]) {
  localStorage.setItem(VIEWS_STORAGE_KEY(projectId), JSON.stringify(views));
}

// --- Component ---

const BudgetTab = ({ projectId, currency }: BudgetTabProps) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [extraTotal, setExtraTotal] = useState(0);
  const [projectBudget, setProjectBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "task" | "material">("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterRoom, setFilterRoom] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterFinishDate, setFilterFinishDate] = useState("");

  // Collapsible columns
  const [visibleExtras, setVisibleExtras] = useState<Set<ColumnKey>>(new Set());

  // Translated column/status definitions
  const ALL_COLUMNS: ColumnDef[] = useMemo(() => [
    { key: "name", label: t('budget.name') },
    { key: "type", label: t('budget.type') },
    { key: "budget", label: t('common.budget'), align: "right" },
    { key: "ordered", label: t('budget.ordered'), align: "right" },
    { key: "paid", label: t('budget.paid'), align: "right" },
    { key: "remaining", label: t('budget.remaining'), align: "right" },
    { key: "room", label: t('budget.room'), extra: true },
    { key: "assignee", label: t('budget.assignee'), extra: true },
    { key: "costCenter", label: t('budget.costCenter'), extra: true },
    { key: "startDate", label: t('common.startDate'), extra: true },
    { key: "finishDate", label: t('common.finishDate'), extra: true },
    { key: "status", label: t('common.status') },
  ], [t]);

  const TASK_PAYMENT_STATUSES = useMemo(() => [
    { value: "not_paid", label: t('paymentStatuses.notPaid') },
    { value: "billed", label: t('materialStatuses.billed') },
    { value: "partially_paid", label: t('paymentStatuses.partiallyPaid') },
    { value: "paid", label: t('materialStatuses.paid') },
  ], [t]);

  const MATERIAL_STATUSES = useMemo(() => [
    { value: "submitted", label: t('materialStatuses.submitted') },
    { value: "declined", label: t('materialStatuses.declined') },
    { value: "approved", label: t('materialStatuses.approved') },
    { value: "billed", label: t('materialStatuses.billed') },
    { value: "paid", label: t('materialStatuses.paid') },
    { value: "paused", label: t('materialStatuses.paused') },
  ], [t]);

  const ALL_STATUSES = useMemo(() => [
    { value: "not_paid", label: t('paymentStatuses.notPaid') },
    { value: "billed", label: t('materialStatuses.billed') },
    { value: "partially_paid", label: t('paymentStatuses.partiallyPaid') },
    { value: "paid", label: t('materialStatuses.paid') },
    { value: "submitted", label: t('materialStatuses.submitted') },
    { value: "declined", label: t('materialStatuses.declined') },
    { value: "approved", label: t('materialStatuses.approved') },
    { value: "paused", label: t('materialStatuses.paused') },
  ], [t]);

  // Column order (drag reorder)
  const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
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
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<BudgetRow | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [materialDetail, setMaterialDetail] = useState<MaterialDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews(projectId));
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [loadViewOpen, setLoadViewOpen] = useState(false);
  const [compactRows, setCompactRows] = useState(true);

  const handleSaveView = () => {
    const name = saveViewName.trim();
    if (!name) return;

    const newView: SavedView = {
      id: crypto.randomUUID(),
      name,
      columnOrder: columns.map((c) => c.key),
      visibleExtras: Array.from(visibleExtras),
      sortKey,
      sortDir,
      compactRows,
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    persistSavedViews(projectId, updated);
    setSaveViewName("");
    setSaveViewOpen(false);
    toast({ title: t('budget.viewSaved'), description: t('budget.viewSavedDescription', { name }) });
  };

  const handleLoadView = (view: SavedView) => {
    // Restore column order
    const orderedColumns = view.columnOrder
      .map((key) => ALL_COLUMNS.find((c) => c.key === key))
      .filter((c): c is ColumnDef => c !== undefined);
    // Append any new columns that didn't exist when the view was saved
    for (const col of ALL_COLUMNS) {
      if (!orderedColumns.some((c) => c.key === col.key)) {
        orderedColumns.push(col);
      }
    }
    setColumns(orderedColumns);
    setVisibleExtras(new Set(view.visibleExtras));
    setSortKey(view.sortKey);
    setSortDir(view.sortDir);
    setCompactRows(view.compactRows ?? false);
    setLoadViewOpen(false);
    toast({ title: t('budget.viewLoaded'), description: t('budget.viewLoadedDescription', { name: view.name }) });
  };

  const handleDeleteView = (viewId: string) => {
    const updated = savedViews.filter((v) => v.id !== viewId);
    setSavedViews(updated);
    persistSavedViews(projectId, updated);
  };

  // Visible columns (filter out hidden extras)
  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.extra || visibleExtras.has(col.key)),
    [columns, visibleExtras]
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
      const [tasksRes, materialsRes, extraRes, projectRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, budget, ordered_amount, payment_status, paid_amount, room_id, cost_center, start_date, finish_date")
          .eq("project_id", projectId)
          .gt("budget", 0),
        supabase
          .from("materials")
          .select("id, name, price_total, ordered_amount, paid_amount, status, room_id")
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
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (extraRes.error) throw extraRes.error;

      setProjectBudget(projectRes.data?.total_budget ?? 0);
      setExtraTotal(
        (extraRes.data || []).reduce((sum, m) => sum + (m.price_total || 0), 0)
      );

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

      const taskRows: BudgetRow[] = (tasksRes.data || []).map((t) => ({
        id: t.id,
        name: t.title,
        type: "task" as const,
        budget: t.budget ?? 0,
        ordered: t.ordered_amount ?? 0,
        paid: t.paid_amount ?? 0,
        status: t.payment_status || "not_paid",
        room: t.room_id ? roomMap.get(t.room_id) : undefined,
        roomId: t.room_id ?? undefined,
        assignee: undefined,
        assigneeId: undefined,
        costCenter: t.cost_center ?? undefined,
        startDate: t.start_date ?? undefined,
        finishDate: t.finish_date ?? undefined,
      }));

      const materialRows: BudgetRow[] = (materialsRes.data || []).map((m) => ({
        id: m.id,
        name: m.name,
        type: "material" as const,
        budget: m.price_total ?? 0,
        ordered: m.ordered_amount ?? 0,
        paid: m.paid_amount ?? 0,
        status: m.status || "new",
        room: m.room_id ? roomMap.get(m.room_id) : undefined,
        roomId: m.room_id ?? undefined,
      }));

      setRows([...taskRows, ...materialRows]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToLoadData');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // --- Inline status change ---

  const handleStatusChange = async (row: BudgetRow, newStatus: string) => {
    try {
      if (row.type === "task") {
        const { error } = await supabase
          .from("tasks")
          .update({ payment_status: newStatus })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("materials")
          .update({ status: newStatus })
          .eq("id", row.id);
        if (error) throw error;
      }
      await fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToUpdateStatus');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    }
  };

  // --- Inline cell save ---

  const handleCellSave = async (row: BudgetRow, col: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setEditingCell(null);
      return;
    }

    try {
      if (row.type === "task") {
        const fieldMap: Record<string, string> = { budget: "budget", ordered: "ordered_amount", paid: "paid_amount" };
        const { error } = await supabase
          .from("tasks")
          .update({ [fieldMap[col]]: numValue })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const fieldMap: Record<string, string> = { budget: "price_total", ordered: "ordered_amount", paid: "paid_amount" };
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

  // --- Detail dialog ---

  const openDetail = async (row: BudgetRow) => {
    setDetailRow(row);
    setTaskDetail(null);
    setMaterialDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      if (row.type === "task") {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, description, status, priority, progress, budget, payment_status, paid_amount, cost_center, start_date, finish_date, due_date")
          .eq("id", row.id)
          .single();
        if (error) throw error;
        setTaskDetail(data);
      } else {
        const { data, error } = await supabase
          .from("materials")
          .select("id, name, description, quantity, unit, price_per_unit, price_total, vendor_name, vendor_link, status, exclude_from_budget, created_at")
          .eq("id", row.id)
          .single();
        if (error) throw error;
        setMaterialDetail(data);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('budget.failedToLoadDetails');
      toast({ title: t('common.error'), description: msg, variant: "destructive" });
    } finally {
      setDetailLoading(false);
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

  const hasAdvancedFilter = filterRoom !== "all" || filterAssignee !== "all" || filterCostCenter !== "all" || filterStartDate !== "" || filterFinishDate !== "";

  const filtered = rows.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterRoom !== "all" && r.roomId !== filterRoom) return false;
    if (filterAssignee !== "all" && r.assigneeId !== filterAssignee) return false;
    if (filterCostCenter !== "all" && r.costCenter !== filterCostCenter) return false;
    if (filterStartDate && (!r.startDate || r.startDate < filterStartDate)) return false;
    if (filterFinishDate && (!r.finishDate || r.finishDate > filterFinishDate)) return false;
    return true;
  });

  if (sortKey) {
    filtered.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "remaining") {
        av = a.budget - a.paid;
        bv = b.budget - b.paid;
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
      ordered: acc.ordered + r.ordered,
      paid: acc.paid + r.paid,
    }),
    { budget: 0, ordered: 0, paid: 0 }
  );

  const statusOptions = (row: BudgetRow) =>
    row.type === "task" ? TASK_PAYMENT_STATUSES : MATERIAL_STATUSES;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterRoom("all");
    setFilterAssignee("all");
    setFilterCostCenter("all");
    setFilterStartDate("");
    setFilterFinishDate("");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("sv-SE");
  };

  // --- Cell renderers ---

  const renderCell = (col: ColumnDef, row: BudgetRow) => {
    switch (col.key) {
      case "name":
        return (
          <button
            className="font-medium text-left hover:underline text-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(row);
            }}
          >
            {row.name}
          </button>
        );
      case "type":
        return (
          <Badge variant={row.type === "task" ? "default" : "secondary"}>
            {row.type === "task" ? t('budget.task') : t('budget.material')}
          </Badge>
        );
      case "budget":
      case "ordered":
      case "paid": {
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
              setEditValue(String(row[col.key]));
            }}
          >
            {formatCurrency(row[col.key], currency)}
          </button>
        );
      }
      case "remaining": {
        const remaining = row.budget - row.paid;
        return (
          <span className={remaining < 0 ? "text-destructive" : ""}>
            {formatCurrency(remaining, currency)}
          </span>
        );
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
      case "status":
        return (
          <Select
            value={row.status}
            onValueChange={(v) => handleStatusChange(row, v)}
          >
            <SelectTrigger className="w-[160px]" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions(row).map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
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
      case "ordered":
        return <span className="font-bold">{formatCurrency(totals.ordered, currency)}</span>;
      case "paid":
        return <span className="font-bold">{formatCurrency(totals.paid, currency)}</span>;
      case "remaining": {
        const totalRemaining = totals.budget - totals.paid;
        return (
          <span className={`font-bold ${totalRemaining < 0 ? "text-destructive" : ""}`}>
            {formatCurrency(totalRemaining, currency)}
          </span>
        );
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('budget.title')}</h2>
      <p className="text-muted-foreground mb-6">
        {t('budget.description')}
      </p>

      {/* Summary Boxes */}
      {(() => {
        const remaining = projectBudget - totals.ordered - totals.paid;
        return (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('common.budget')}</p>
              <p className="text-xl font-bold">{formatCurrency(projectBudget, currency)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('budget.ordered')}</p>
              <p className="text-xl font-bold">{formatCurrency(totals.ordered, currency)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('budget.paid')}</p>
              <p className="text-xl font-bold">{formatCurrency(totals.paid, currency)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('budget.remaining')}</p>
              <p className={`text-xl font-bold ${remaining < 0 ? "text-destructive" : ""}`}>
                {formatCurrency(remaining, currency)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('budget.extra')}</p>
              <p className="text-xl font-bold">{formatCurrency(extraTotal, currency)}</p>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end md:gap-4 mb-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Label htmlFor="budget-search" className="text-sm mb-1.5 block">{t('common.search')}</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="budget-search"
              placeholder={t('budget.filterByName')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full md:w-[150px]">
          <Label className="text-sm mb-1.5 block">{t('budget.type')}</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | "task" | "material")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('budget.allTypes')}</SelectItem>
              <SelectItem value="task">{t('budget.tasks')}</SelectItem>
              <SelectItem value="material">{t('budget.materials')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-[180px]">
          <Label className="text-sm mb-1.5 block">{t('common.status')}</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('budget.allStatuses')}</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter+ button */}
        <Button
          variant={hasAdvancedFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
          className="gap-1"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('budget.advancedFilter')}
        </Button>

        {/* Columns toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Columns3 className="h-4 w-4" />
              {t('budget.columns')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-2">{t('budget.extraColumns')}</p>
              {EXTRA_COLUMN_KEYS.map((key) => {
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

        {/* Compact rows toggle */}
        <Button
          variant={compactRows ? "default" : "outline"}
          size="sm"
          className="gap-1"
          onClick={() => setCompactRows((prev) => !prev)}
          title={t('budget.compactRows', 'Compact rows')}
        >
          <Rows3 className="h-4 w-4" />
          {t('budget.compactRows', 'Compact')}
        </Button>

        {/* Save View */}
        <Popover open={saveViewOpen} onOpenChange={setSaveViewOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Save className="h-4 w-4" />
              {t('budget.saveView')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('budget.saveCurrentView')}</p>
              <p className="text-xs text-muted-foreground">
                {t('budget.saveViewDescription')}
              </p>
              <Input
                placeholder={t('budget.viewName')}
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveView();
                }}
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!saveViewName.trim()}
                onClick={handleSaveView}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('common.save')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Load View */}
        {savedViews.length > 0 && (
          <Popover open={loadViewOpen} onOpenChange={setLoadViewOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <FolderOpen className="h-4 w-4" />
                {t('budget.views', { count: savedViews.length })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">{t('budget.savedViews')}</p>
                {savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted group"
                  >
                    <button
                      className="flex-1 text-left text-sm truncate"
                      onClick={() => handleLoadView(view)}
                    >
                      {view.name}
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteView(view.id);
                      }}
                      title={t('budget.deleteView')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {(searchQuery || filterType !== "all" || filterStatus !== "all" || hasAdvancedFilter) && (
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
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col, idx) => (
                <TableHead
                  key={col.key}
                  className={`${col.align === "right" ? "text-right" : ""} select-none${compactRows ? " py-1 text-xs h-8" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                >
                  <span className="inline-flex items-center gap-1">
                    <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                      )}
                    </button>
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                  {t('budget.noBudgetItems')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={`${row.type}-${row.id}`}
                  className={`cursor-pointer ${row.status === "paid" ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50" : "hover:bg-muted/50"}${compactRows ? " h-8" : ""}`}
                  onClick={() => openDetail(row)}
                >
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : ""}${compactRows ? " py-0.5 px-2 text-xs" : ""}`}
                    >
                      {renderCell(col, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>
              {detailRow?.type === "task" ? t('budget.taskDetails') : t('budget.purchaseOrderDetails')}
            </DialogTitle>
            <DialogDescription>
              {detailRow?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {detailLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : detailRow?.type === "task" && taskDetail ? (
              <TaskDetailView task={taskDetail} currency={currency} />
            ) : detailRow?.type === "material" && materialDetail ? (
              <MaterialDetailView material={materialDetail} currency={currency} />
            ) : (
              <p className="text-muted-foreground py-8 text-center">{t('budget.noData')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --- Detail sub-components ---

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function TaskDetailView({ task, currency }: { task: TaskDetail; currency?: string | null }) {
  const { t } = useTranslation();

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      to_do: t('taskStatuses.toDo'),
      in_progress: t('taskStatuses.inProgress'),
      completed: t('taskStatuses.completed'),
      not_paid: t('paymentStatuses.notPaid'),
      billed: t('materialStatuses.billed'),
      partially_paid: t('paymentStatuses.partiallyPaid'),
      paid: t('materialStatuses.paid'),
    };
    return map[s] || s;
  };

  const priorityLabel = (p: string) => {
    const map: Record<string, string> = {
      low: t('priorities.low'),
      medium: t('priorities.medium'),
      high: t('priorities.high'),
    };
    return map[p] || p;
  };

  return (
    <div className="space-y-4">
      <DetailField label={t('budget.detailTitle')} value={task.title} />
      <DetailField label={t('budget.detailDescription')} value={task.description} />

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t('common.status')} value={<Badge variant="outline">{statusLabel(task.status)}</Badge>} />
        <DetailField label={t('budget.detailPriority')} value={<Badge variant="outline">{priorityLabel(task.priority)}</Badge>} />
      </div>

      <DetailField label={t('budget.detailProgress')} value={`${task.progress}%`} />

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t('common.budget')} value={task.budget != null ? formatCurrency(task.budget, currency) : undefined} />
        <DetailField label={t('budget.detailPaidAmount')} value={task.paid_amount != null ? formatCurrency(task.paid_amount, currency) : undefined} />
      </div>
      <DetailField label={t('budget.detailPaymentStatus')} value={task.payment_status ? <Badge variant="outline">{statusLabel(task.payment_status)}</Badge> : undefined} />
      <DetailField label={t('budget.costCenter')} value={task.cost_center} />

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t('common.startDate')} value={task.start_date ? new Date(task.start_date).toLocaleDateString("sv-SE") : undefined} />
        <DetailField label={t('common.finishDate')} value={task.finish_date ? new Date(task.finish_date).toLocaleDateString("sv-SE") : undefined} />
      </div>
      <DetailField label={t('budget.detailDueDate')} value={task.due_date ? new Date(task.due_date).toLocaleDateString("sv-SE") : undefined} />
    </div>
  );
}

function MaterialDetailView({ material, currency }: { material: MaterialDetail; currency?: string | null }) {
  const { t } = useTranslation();

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      submitted: t('materialStatuses.submitted'),
      declined: t('materialStatuses.declined'),
      approved: t('materialStatuses.approved'),
      billed: t('materialStatuses.billed'),
      paid: t('materialStatuses.paid'),
      paused: t('materialStatuses.paused'),
    };
    return map[s] || s;
  };

  return (
    <div className="space-y-4">
      <DetailField label={t('budget.detailName')} value={material.name} />
      <DetailField label={t('budget.detailDescription')} value={material.description} />

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <DetailField label={t('budget.detailQuantity')} value={`${material.quantity} ${material.unit}`} />
        <DetailField label={t('budget.detailPricePerUnit')} value={material.price_per_unit != null ? formatCurrency(material.price_per_unit, currency) : undefined} />
      </div>
      <DetailField label={t('budget.detailPriceTotal')} value={material.price_total != null ? formatCurrency(material.price_total, currency) : undefined} />

      <Separator />

      <DetailField label={t('common.status')} value={<Badge variant="outline">{statusLabel(material.status)}</Badge>} />
      <DetailField label={t('budget.detailVendor')} value={material.vendor_name} />
      {material.vendor_link && (
        <DetailField
          label={t('budget.detailVendorLink')}
          value={
            <a href={material.vendor_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              {material.vendor_link}
              <ExternalLink className="h-3 w-3" />
            </a>
          }
        />
      )}

      <Separator />

      <DetailField label={t('budget.detailExcludeFromBudget')} value={material.exclude_from_budget ? t('common.yes') : t('common.no')} />
      <DetailField label={t('budget.detailCreated')} value={new Date(material.created_at).toLocaleDateString("sv-SE")} />
    </div>
  );
}

export default BudgetTab;
