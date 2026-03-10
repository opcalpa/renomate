export type TaskColumnKey =
  // Core (always visible)
  | "title"
  | "status"
  | "priority"
  | "actions"
  // Extra (user-toggleable)
  | "assignee"
  | "room"
  | "startDate"
  | "finishDate"
  | "dueDate"
  | "progress"
  | "budget"
  | "paidAmount"
  | "remaining"
  | "paymentStatus"
  | "costCenter"
  | "estimatedHours"
  | "hourlyRate"
  | "subcontractorCost"
  | "materialEstimate"
  | "markupPercent";

export interface TaskColumnDef {
  key: TaskColumnKey;
  label: string;
  align?: "left" | "right";
  width?: string;
  extra?: boolean;
  editType?: "numeric" | "select" | "date" | "progress" | "none";
  dbField?: string;
}

export const CORE_COLUMN_KEYS: TaskColumnKey[] = [
  "title",
  "status",
  "priority",
  "actions",
];

export const EXTRA_COLUMN_KEYS: TaskColumnKey[] = [
  "assignee",
  "room",
  "startDate",
  "finishDate",
  "dueDate",
  "progress",
  "budget",
  "paidAmount",
  "remaining",
  "paymentStatus",
  "costCenter",
  "estimatedHours",
  "hourlyRate",
  "subcontractorCost",
  "materialEstimate",
  "markupPercent",
];

export const DEFAULT_VISIBLE_EXTRAS: TaskColumnKey[] = [
  "assignee",
  "room",
  "startDate",
  "finishDate",
  "progress",
  "budget",
];

