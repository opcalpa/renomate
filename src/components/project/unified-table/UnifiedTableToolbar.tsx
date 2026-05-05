import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Columns3,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  Rows3,
  Search,
  Table2,
  Kanban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RowType, ViewMode, KanbanGroupBy, UnifiedColumnKey, UnifiedColumnDef, UnifiedSavedView } from "./types";
import { EXTRA_COLUMN_KEYS } from "./types";
import { KANBAN_GROUP_BY_OPTIONS } from "./kanbanConstants";

interface UnifiedTableToolbarProps {
  activeRowTypes: Set<RowType>;
  toggleRowType: (type: RowType) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  visibleExtras: Set<UnifiedColumnKey>;
  toggleExtraColumn: (key: UnifiedColumnKey) => void;
  allColumns: UnifiedColumnDef[];
  compactRows: boolean;
  setCompactRows: (v: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  groupBy: KanbanGroupBy;
  setGroupBy: (g: KanbanGroupBy) => void;
  savedViews: UnifiedSavedView[];
  saveView: (name: string) => UnifiedSavedView;
  loadView: (view: UnifiedSavedView) => void;
  deleteView: (viewId: string) => void;
}

export function UnifiedTableToolbar({
  activeRowTypes,
  toggleRowType,
  searchQuery,
  setSearchQuery,
  visibleExtras,
  toggleExtraColumn,
  allColumns,
  compactRows,
  setCompactRows,
  viewMode,
  setViewMode,
  groupBy,
  setGroupBy,
  savedViews,
  saveView,
  loadView,
  deleteView,
}: UnifiedTableToolbarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [loadViewOpen, setLoadViewOpen] = useState(false);

  const handleSaveView = () => {
    const name = saveViewName.trim();
    if (!name) return;
    saveView(name);
    setSaveViewName("");
    setSaveViewOpen(false);
    toast({
      title: t("unifiedTable.viewSaved"),
      description: t("unifiedTable.viewSavedDescription", { name }),
    });
  };

  const handleLoadView = (view: UnifiedSavedView) => {
    loadView(view);
    setLoadViewOpen(false);
    toast({
      title: t("unifiedTable.viewLoaded"),
      description: t("unifiedTable.viewLoadedDescription", { name: view.name }),
    });
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3 mb-4">
      {/* Row type toggles */}
      <div className="flex items-center gap-1.5">
        <Button
          variant={activeRowTypes.has("task") ? "secondary" : "outline"}
          size="sm"
          onClick={() => toggleRowType("task")}
        >
          {t("unifiedTable.showTasks")}
        </Button>
        <Button
          variant={activeRowTypes.has("material") ? "secondary" : "outline"}
          size="sm"
          onClick={() => toggleRowType("material")}
        >
          {t("unifiedTable.showMaterials")}
        </Button>
      </div>

      {/* View mode toggle */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(val) => {
          if (val) setViewMode(val as ViewMode);
        }}
        className="gap-0 border rounded-md"
      >
        <ToggleGroupItem value="table" size="sm" className="gap-1 px-2.5 rounded-r-none data-[state=on]:bg-muted">
          <Table2 className="h-4 w-4" />
          {t("unifiedTable.viewTable")}
        </ToggleGroupItem>
        <ToggleGroupItem value="kanban" size="sm" className="gap-1 px-2.5 rounded-l-none data-[state=on]:bg-muted">
          <Kanban className="h-4 w-4" />
          {t("unifiedTable.viewKanban")}
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Group by selector (kanban only) */}
      {viewMode === "kanban" && (
        <Select value={groupBy} onValueChange={(val) => setGroupBy(val as KanbanGroupBy)}>
          <SelectTrigger className="h-9 w-[180px]">
            <span className="text-muted-foreground mr-1 text-xs">{t("unifiedTable.groupBy")}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KANBAN_GROUP_BY_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("unifiedTable.filterByName")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Columns toggle (table only) */}
      {viewMode === "table" && (
        <ColumnToggle
          columns={EXTRA_COLUMN_KEYS}
          labels={Object.fromEntries(allColumns.map(c => [c.key, c.label])) as Record<string, string>}
          visible={visibleExtras}
          onChange={(vis) => {
            for (const key of EXTRA_COLUMN_KEYS) {
              if (vis.has(key) !== visibleExtras.has(key)) toggleExtraColumn(key);
            }
          }}
          trigger={
            <Button variant="outline" size="icon" className="h-8 w-8" title={t("unifiedTable.columns")}>
              <Columns3 className="h-4 w-4" />
            </Button>
          }
        />
      )}

      {/* Compact rows (table only) */}
      {viewMode === "table" && (
        <Button
          variant={compactRows ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setCompactRows(!compactRows)}
          title={t("unifiedTable.compactRows")}
        >
          <Rows3 className="h-4 w-4" />
        </Button>
      )}

      {/* Save View */}
      <Popover open={saveViewOpen} onOpenChange={setSaveViewOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Save className="h-4 w-4" />
            {t("unifiedTable.saveView")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("unifiedTable.saveView")}</p>
            <Input
              placeholder={t("unifiedTable.viewName")}
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
              {t("common.save")}
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
              {t("unifiedTable.savedViews")} ({savedViews.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">{t("unifiedTable.savedViews")}</p>
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
                      deleteView(view.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Clear filters */}
      {searchQuery && (
        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
          {t("unifiedTable.clearFilters")}
        </Button>
      )}
    </div>
  );
}
