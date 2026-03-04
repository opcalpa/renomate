import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskEditDialog } from "@/components/project/TaskEditDialog";
import { MaterialEditDialog } from "@/components/project/MaterialEditDialog";
import { useUnifiedTableData } from "./useUnifiedTableData";
import { useUnifiedTableView } from "./useUnifiedTableView";
import { UnifiedSummaryCards } from "./UnifiedSummaryCards";
import { UnifiedTableToolbar } from "./UnifiedTableToolbar";
import { UnifiedTableBody } from "./UnifiedTableBody";
import { UnifiedKanbanBoard } from "./UnifiedKanbanBoard";
import type { UnifiedRow } from "./types";

interface UnifiedTableTabProps {
  projectId: string;
  currency?: string | null;
  isReadOnly?: boolean;
  userType?: string | null;
}

export function UnifiedTableTab({
  projectId,
  currency,
  isReadOnly,
}: UnifiedTableTabProps) {
  const { t } = useTranslation();

  const {
    rows,
    rooms,
    stakeholders,
    projectBudget,
    extraTotal,
    loading,
    refetch,
  } = useUnifiedTableData(projectId);

  const view = useUnifiedTableView(projectId);

  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);

  const handleRowClick = (row: UnifiedRow) => {
    if (row.rowType === "task") {
      setEditTaskId(row.id);
    } else {
      setEditMaterialId(row.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold">{t("unifiedTable.tabTitle")}</h2>
        <Badge variant="outline" className="text-[10px]">
          {t("unifiedTable.sandboxBadge")}
        </Badge>
      </div>

      <UnifiedSummaryCards
        rows={rows}
        activeRowTypes={view.activeRowTypes}
        projectBudget={projectBudget}
        extraTotal={extraTotal}
        currency={currency}
      />

      <UnifiedTableToolbar
        activeRowTypes={view.activeRowTypes}
        toggleRowType={view.toggleRowType}
        searchQuery={view.searchQuery}
        setSearchQuery={view.setSearchQuery}
        visibleExtras={view.visibleExtras}
        toggleExtraColumn={view.toggleExtraColumn}
        allColumns={view.ALL_COLUMNS}
        compactRows={view.compactRows}
        setCompactRows={view.setCompactRows}
        viewMode={view.viewMode}
        setViewMode={view.setViewMode}
        groupBy={view.groupBy}
        setGroupBy={view.setGroupBy}
        savedViews={view.savedViews}
        saveView={view.saveView}
        loadView={view.loadView}
        deleteView={view.deleteView}
      />

      {view.viewMode === "table" ? (
        <UnifiedTableBody
          rows={rows}
          activeRowTypes={view.activeRowTypes}
          searchQuery={view.searchQuery}
          visibleColumns={view.visibleColumns}
          sortKey={view.sortKey}
          sortDir={view.sortDir}
          handleSort={view.handleSort}
          handleDragStart={view.handleDragStart}
          handleDragOver={view.handleDragOver}
          handleDrop={view.handleDrop}
          compactRows={view.compactRows}
          currency={currency}
          isReadOnly={isReadOnly}
          onRowClick={handleRowClick}
          onDataChanged={refetch}
          rooms={rooms}
          stakeholders={stakeholders}
        />
      ) : (
        <UnifiedKanbanBoard
          rows={rows}
          groupBy={view.groupBy}
          activeRowTypes={view.activeRowTypes}
          searchQuery={view.searchQuery}
          rooms={rooms}
          stakeholders={stakeholders}
          currency={currency}
          isReadOnly={isReadOnly}
          onRowClick={handleRowClick}
          onDataChanged={refetch}
        />
      )}

      <TaskEditDialog
        taskId={editTaskId}
        projectId={projectId}
        open={editTaskId !== null}
        onOpenChange={(open) => !open && setEditTaskId(null)}
        onSaved={refetch}
        currency={currency}
      />

      <MaterialEditDialog
        materialId={editMaterialId}
        projectId={projectId}
        open={editMaterialId !== null}
        onOpenChange={(open) => !open && setEditMaterialId(null)}
        onSaved={refetch}
        currency={currency}
      />
    </div>
  );
}
