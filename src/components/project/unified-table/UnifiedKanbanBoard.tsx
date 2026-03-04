import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { useKanbanGrouping } from "./useKanbanGrouping";
import { getGroupByConfig } from "./kanbanConstants";
import type { KanbanGroupBy, RowType, UnifiedRow } from "./types";

interface Room {
  id: string;
  name: string;
}

interface Stakeholder {
  id: string;
  name: string;
}

interface UnifiedKanbanBoardProps {
  rows: UnifiedRow[];
  groupBy: KanbanGroupBy;
  activeRowTypes: Set<RowType>;
  searchQuery: string;
  rooms: Room[];
  stakeholders: Stakeholder[];
  currency?: string | null;
  isReadOnly?: boolean;
  onRowClick: (row: UnifiedRow) => void;
  onDataChanged: () => Promise<void>;
}

export function UnifiedKanbanBoard({
  rows,
  groupBy,
  activeRowTypes,
  searchQuery,
  rooms,
  stakeholders,
  currency,
  isReadOnly,
  onRowClick,
  onDataChanged,
}: UnifiedKanbanBoardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { columns, autoFiltered } = useKanbanGrouping({
    rows,
    groupBy,
    activeRowTypes,
    searchQuery,
    rooms,
    stakeholders,
  });

  const config = getGroupByConfig(groupBy);
  const dragRowRef = useRef<UnifiedRow | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, row: UnifiedRow) => {
      if (isReadOnly) {
        e.preventDefault();
        return;
      }
      dragRowRef.current = row;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", row.id);
    },
    [isReadOnly]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumnId(columnId);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      setDragOverColumnId(null);

      const row = dragRowRef.current;
      if (!row || !config) return;
      dragRowRef.current = null;

      // Determine current column for this row
      const currentKey = getRowGroupKeyForDrop(row, groupBy);
      if (currentKey === targetColumnId) return;

      // Determine which table and field to update
      const table = row.rowType === "task" ? "tasks" : "materials";
      const dbField = config.dbField;

      // Map targetColumnId to DB value
      const dbValue = targetColumnId === "__unassigned__" ? null : targetColumnId;

      const { error } = await supabase
        .from(table)
        .update({ [dbField]: dbValue })
        .eq("id", row.id);

      if (error) {
        toast({
          title: t("common.error"),
          description: t("unifiedTable.failedToUpdateField"),
          variant: "destructive",
        });
        return;
      }

      // Find column label for toast
      const targetCol = columns.find((c) => c.id === targetColumnId);
      toast({
        title: t("unifiedTable.itemMovedTo", {
          name: row.name,
          column: targetCol?.label ?? targetColumnId,
        }),
      });

      await onDataChanged();
    },
    [config, groupBy, columns, toast, t, onDataChanged]
  );

  return (
    <div className="space-y-3">
      {/* Auto-filter info badge */}
      {autoFiltered && config && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0" />
          {config.appliesTo === "task"
            ? t("unifiedTable.autoFilterTasks")
            : t("unifiedTable.autoFilterMaterials")}
        </div>
      )}

      {/* Read-only badge */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted border rounded-md text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          {t("unifiedTable.kanbanReadOnly")}
        </div>
      )}

      {/* Columns container */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 w-[280px] snap-start rounded-lg border bg-muted/30 ${
              dragOverColumnId === column.id
                ? "ring-2 ring-primary/50 bg-primary/5"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <h3 className="text-sm font-medium truncate">{column.label}</h3>
              <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                {column.rows.length}
              </Badge>
            </div>

            {/* Card list */}
            <div className="p-2 space-y-2 min-h-[80px]">
              {column.rows.length === 0 && dragOverColumnId === column.id && (
                <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded-md">
                  {t("unifiedTable.dropHere")}
                </div>
              )}

              {column.rows.map((row) => (
                <KanbanCard
                  key={row.id}
                  row={row}
                  currency={currency}
                  isReadOnly={isReadOnly}
                  onClick={() => onRowClick(row)}
                  onDragStart={(e) => handleDragStart(e, row)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  row,
  currency,
  isReadOnly,
  onClick,
  onDragStart,
}: {
  row: UnifiedRow;
  currency?: string | null;
  isReadOnly?: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const { t } = useTranslation();

  const priorityEmoji =
    row.priority === "high"
      ? "🔴"
      : row.priority === "medium"
        ? "🟡"
        : row.priority === "low"
          ? "🟢"
          : null;

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-background border rounded-md p-3 cursor-pointer hover:shadow-sm transition-shadow group"
    >
      <div className="flex items-start gap-2">
        {!isReadOnly && (
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0 cursor-grab" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge
              variant="outline"
              className={`text-[9px] shrink-0 ${
                row.rowType === "task"
                  ? "border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                  : "border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400"
              }`}
            >
              {row.rowType === "task"
                ? t("unifiedTable.showTasks")
                : t("unifiedTable.showMaterials")}
            </Badge>
            {priorityEmoji && (
              <span className="text-xs" title={row.priority}>
                {priorityEmoji}
              </span>
            )}
          </div>
          <p className="text-sm font-medium truncate">{row.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {row.room && <span className="truncate">{row.room}</span>}
            {row.budget > 0 && (
              <span className="shrink-0">
                {formatCurrency(row.budget, currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getRowGroupKeyForDrop(row: UnifiedRow, groupBy: KanbanGroupBy): string {
  switch (groupBy) {
    case "status":
      return row.taskStatus ?? "to_do";
    case "materialStatus":
      return row.status ?? "submitted";
    case "priority":
      return row.priority ?? "medium";
    case "assignee":
      return row.assigneeId ?? "__unassigned__";
    case "room":
      return row.roomId ?? "__unassigned__";
    case "costCenter":
      return row.costCenter ?? "__unassigned__";
    case "paymentStatus":
      return row.paymentStatus ?? "not_paid";
  }
}
