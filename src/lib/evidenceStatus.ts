/**
 * Evidence status for cost traceability.
 * Computed from existing task_file_links — no new DB fields.
 */

export type EvidenceStatus = "verified" | "registered" | "missing" | "na";

const COMPLETED_TASK_STATUSES = new Set(["done", "completed"]);
const ACTIVE_MATERIAL_STATUSES = new Set(["approved", "billed", "paid"]);
const QUALIFYING_FILE_TYPES = new Set(["invoice", "receipt"]);

interface EvidenceInput {
  rowType: "task" | "material";
  status: string | null | undefined;
  budget: number;
  paid: number;
  cost: number;
  hasQualifyingFile: boolean;
  fileCount: number;
}

export function computeEvidenceStatus(input: EvidenceInput): EvidenceStatus {
  const { rowType, status, budget, paid, cost, hasQualifyingFile, fileCount } = input;
  const hasCost = budget > 0 || paid > 0 || cost > 0;

  if (rowType === "task") {
    const isCompleted = COMPLETED_TASK_STATUSES.has(status ?? "");
    if (!isCompleted && !hasCost) return "na";
    if (hasQualifyingFile && hasCost) return "verified";
    if (hasCost) return "registered";
    if (isCompleted && !hasCost && fileCount === 0) return "missing";
    return "na";
  }

  // material
  const isActive = ACTIVE_MATERIAL_STATUSES.has(status ?? "");
  if (!isActive && !hasCost) return "na";
  if (hasQualifyingFile && hasCost) return "verified";
  if (hasCost) return "registered";
  if (isActive && !hasCost) return "missing";
  return "na";
}

export function isQualifyingFileType(fileType: string | null | undefined): boolean {
  return QUALIFYING_FILE_TYPES.has(fileType ?? "");
}

export function getEvidenceColor(status: EvidenceStatus): string | null {
  switch (status) {
    case "verified": return "bg-green-500";
    case "registered": return "bg-amber-400";
    case "missing": return "bg-red-500";
    default: return null;
  }
}

export function getEvidenceTextColor(status: EvidenceStatus): string | null {
  switch (status) {
    case "verified": return "text-green-600";
    case "registered": return "text-amber-500";
    case "missing": return "text-red-500";
    default: return null;
  }
}
