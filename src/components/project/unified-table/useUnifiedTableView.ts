import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type {
  RowType,
  ViewMode,
  KanbanGroupBy,
  UnifiedColumnKey,
  UnifiedColumnDef,
  UnifiedSavedView,
} from "./types";
import { EXTRA_COLUMN_KEYS, DEFAULT_VISIBLE_EXTRAS } from "./types";
import { buildAllColumns } from "./columns";

const VIEWS_STORAGE_KEY = (projectId: string) =>
  `unified-table-views-${projectId}`;

function loadSavedViews(projectId: string): UnifiedSavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY(projectId));
    if (!raw) return [];
    return JSON.parse(raw) as UnifiedSavedView[];
  } catch {
    return [];
  }
}

function persistSavedViews(projectId: string, views: UnifiedSavedView[]) {
  localStorage.setItem(VIEWS_STORAGE_KEY(projectId), JSON.stringify(views));
}

export function useUnifiedTableView(projectId: string) {
  const { t } = useTranslation();

  const ALL_COLUMNS = useMemo(() => buildAllColumns(t), [t]);

  const [columns, setColumns] = useState<UnifiedColumnDef[]>(ALL_COLUMNS);
  const [visibleExtras, setVisibleExtras] = useState<Set<UnifiedColumnKey>>(
    () => new Set(DEFAULT_VISIBLE_EXTRAS)
  );

  // Active row types
  const [activeRowTypes, setActiveRowTypes] = useState<Set<RowType>>(
    () => new Set<RowType>(["task", "material"])
  );

  const toggleRowType = useCallback((type: RowType) => {
    setActiveRowTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type) && next.size > 1) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Keep columns in sync when ALL_COLUMNS changes (language switch)
  useEffect(() => {
    setColumns((prev) => {
      const keyOrder = prev.map((c) => c.key);
      const updated = keyOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is UnifiedColumnDef => c !== undefined);
      for (const col of ALL_COLUMNS) {
        if (!updated.some((c) => c.key === col.key)) {
          updated.push(col);
        }
      }
      return updated;
    });
  }, [ALL_COLUMNS]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.extra || visibleExtras.has(c.key)),
    [columns, visibleExtras]
  );

  const toggleExtraColumn = useCallback((key: UnifiedColumnKey) => {
    setVisibleExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sort state
  const [sortKey, setSortKey] = useState<UnifiedColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback(
    (key: UnifiedColumnKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  // Drag reorder
  const dragCol = useRef<number | null>(null);
  const dragOverCol = useRef<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    dragCol.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverCol.current = idx;
  }, []);

  const handleDrop = useCallback(() => {
    if (dragCol.current === null || dragOverCol.current === null) return;
    if (dragCol.current === dragOverCol.current) return;
    setColumns((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(dragCol.current!, 1);
      reordered.splice(dragOverCol.current!, 0, moved);
      return reordered;
    });
    dragCol.current = null;
    dragOverCol.current = null;
  }, []);

  // Compact rows
  const [compactRows, setCompactRows] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // View mode (table / kanban)
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [groupBy, setGroupBy] = useState<KanbanGroupBy>("status");

  // Saved views
  const [savedViews, setSavedViews] = useState<UnifiedSavedView[]>(() =>
    loadSavedViews(projectId)
  );

  const saveView = useCallback(
    (name: string) => {
      const newView: UnifiedSavedView = {
        id: crypto.randomUUID(),
        name,
        columnOrder: columns.map((c) => c.key),
        visibleExtras: Array.from(visibleExtras),
        sortKey,
        sortDir,
        compactRows,
        activeRowTypes: Array.from(activeRowTypes),
        viewMode,
        groupBy,
      };
      const updated = [...savedViews, newView];
      setSavedViews(updated);
      persistSavedViews(projectId, updated);
      return newView;
    },
    [columns, visibleExtras, sortKey, sortDir, compactRows, activeRowTypes, viewMode, groupBy, savedViews, projectId]
  );

  const loadView = useCallback(
    (view: UnifiedSavedView) => {
      const orderedColumns = view.columnOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is UnifiedColumnDef => c !== undefined);
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
      setActiveRowTypes(new Set(view.activeRowTypes ?? ["task", "material"]));
      setViewMode(view.viewMode ?? "table");
      setGroupBy(view.groupBy ?? "status");
    },
    [ALL_COLUMNS]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      const updated = savedViews.filter((v) => v.id !== viewId);
      setSavedViews(updated);
      persistSavedViews(projectId, updated);
    },
    [savedViews, projectId]
  );

  return {
    ALL_COLUMNS,
    EXTRA_COLUMN_KEYS,
    columns,
    visibleColumns,
    visibleExtras,
    toggleExtraColumn,
    sortKey,
    sortDir,
    handleSort,
    handleDragStart,
    handleDragOver,
    handleDrop,
    compactRows,
    setCompactRows,
    searchQuery,
    setSearchQuery,
    activeRowTypes,
    toggleRowType,
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    savedViews,
    saveView,
    loadView,
    deleteView,
  };
}
