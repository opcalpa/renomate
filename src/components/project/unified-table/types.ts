export type RowType = "task" | "material";

export interface UnifiedRow {
  id: string;
  rowType: RowType;
  name: string;

  // Budget (both)
  budget: number;
  ordered: number;
  paid: number;
  status: string;

  // Shared optional
  room?: string;
  roomId?: string;
  costCenter?: string;
  startDate?: string;
  finishDate?: string;
  hasAttachment: boolean;
  attachmentCount: number;

  // Task-only
  taskStatus?: string;
  priority?: string;
  progress?: number;
  dueDate?: string | null;
  assignee?: string;
  assigneeId?: string;
  paymentStatus?: string;
  estimatedHours?: number | null;
  hourlyRate?: number | null;
  subcontractorCost?: number | null;
  materialEstimate?: number | null;
  markupPercent?: number | null;
  isAta?: boolean;

  // Material-only
  isUnlinked?: boolean;
  taskId?: string;
  vendorName?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export type UnifiedColumnKey =
  | "name"
  | "rowType"
  | "status"
  | "priority"
  | "budget"
  | "ordered"
  | "paid"
  | "remaining"
  | "room"
  | "assignee"
  | "costCenter"
  | "startDate"
  | "finishDate"
  | "dueDate"
  | "progress"
  | "paymentStatus"
  | "estimatedHours"
  | "hourlyRate"
  | "subcontractorCost"
  | "materialEstimate"
  | "markupPercent"
  | "vendorName"
  | "quantity"
  | "attachment"
  | "actions";

export interface UnifiedColumnDef {
  key: UnifiedColumnKey;
  label: string;
  align?: "left" | "right";
  width?: string;
  extra?: boolean;
  editType?: "numeric" | "select" | "date" | "progress" | "none";
  dbField?: string;
  appliesTo: "task" | "material" | "both";
}

export type ViewMode = "table" | "kanban";

export type KanbanGroupBy =
  | "status"
  | "materialStatus"
  | "priority"
  | "assignee"
  | "room"
  | "costCenter"
  | "paymentStatus";

export interface KanbanColumn {
  id: string;
  label: string;
  rows: UnifiedRow[];
}

export interface KanbanGroupByConfig {
  key: KanbanGroupBy;
  labelKey: string;
  appliesTo: "task" | "material" | "both";
  dbField: string;
}

export interface UnifiedSavedView {
  id: string;
  name: string;
  columnOrder: UnifiedColumnKey[];
  visibleExtras: UnifiedColumnKey[];
  sortKey: UnifiedColumnKey | null;
  sortDir: "asc" | "desc";
  compactRows?: boolean;
  activeRowTypes: RowType[];
  viewMode?: ViewMode;
  groupBy?: KanbanGroupBy;
}

export const CORE_COLUMN_KEYS: UnifiedColumnKey[] = [
  "name",
  "rowType",
  "status",
  "actions",
];

export const EXTRA_COLUMN_KEYS: UnifiedColumnKey[] = [
  "priority",
  "budget",
  "ordered",
  "paid",
  "remaining",
  "room",
  "assignee",
  "costCenter",
  "startDate",
  "finishDate",
  "dueDate",
  "progress",
  "paymentStatus",
  "estimatedHours",
  "hourlyRate",
  "subcontractorCost",
  "materialEstimate",
  "markupPercent",
  "vendorName",
  "quantity",
  "attachment",
];

export const DEFAULT_VISIBLE_EXTRAS: UnifiedColumnKey[] = [
  "room",
  "assignee",
  "budget",
  "ordered",
  "paid",
  "remaining",
];
