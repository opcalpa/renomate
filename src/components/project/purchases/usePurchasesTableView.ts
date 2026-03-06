import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  PurchaseColumnKey,
  PurchaseColumnDef,
  PurchaseSavedView,
  EXTRA_COLUMN_KEYS,
  DEFAULT_VISIBLE_EXTRAS,
} from "./purchasesTypes";

const VIEWS_STORAGE_KEY = (projectId: string) =>
  `purchases-table-views-${projectId}`;

function loadSavedViews(projectId: string): PurchaseSavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY(projectId));
    if (!raw) return [];
    return JSON.parse(raw) as PurchaseSavedView[];
  } catch {
    return [];
  }
}

function persistSavedViews(projectId: string, views: PurchaseSavedView[]) {
  localStorage.setItem(VIEWS_STORAGE_KEY(projectId), JSON.stringify(views));
}

export function usePurchasesTableView(projectId: string) {
  const { t } = useTranslation();

  const ALL_COLUMNS: PurchaseColumnDef[] = useMemo(
    () => [
      { key: "name", label: t("purchases.materialName"), width: "w-[250px]", editType: "none" },
      { key: "status", label: t("common.status"), width: "w-[130px]", editType: "select" },
      { key: "quantity", label: t("common.quantity"), width: "w-[100px]", extra: true, editType: "none" },
      { key: "pricePerUnit", label: t("purchases.pricePerUnit"), width: "w-[110px]", align: "right", extra: true, editType: "numeric", dbField: "price_per_unit" },
      { key: "priceTotal", label: t("purchases.priceTotal"), width: "w-[110px]", align: "right", extra: true, editType: "numeric", dbField: "price_total" },
      { key: "paidAmount", label: t("purchases.paidAmount"), width: "w-[110px]", align: "right", extra: true, editType: "numeric", dbField: "paid_amount" },
      { key: "remaining", label: t("purchasesTable.remaining"), width: "w-[110px]", align: "right", extra: true, editType: "none" },
      { key: "vendor", label: t("purchases.vendor"), width: "w-[140px]", extra: true, editType: "none" },
      { key: "room", label: t("purchases.room"), width: "w-[120px]", extra: true, editType: "select", dbField: "room_id" },
      { key: "task", label: t("purchases.task"), width: "w-[150px]", extra: true, editType: "select", dbField: "task_id" },
      { key: "assignedTo", label: t("purchases.assignedTo"), width: "w-[140px]", extra: true, editType: "select", dbField: "assigned_to_user_id" },
      { key: "createdBy", label: t("purchases.addedBy"), width: "w-[130px]", extra: true, editType: "none" },
      { key: "createdAt", label: t("purchasesTable.date"), width: "w-[110px]", extra: true, editType: "none" },
      { key: "attachment", label: t("purchasesTable.attachment"), width: "w-[80px]", extra: true, editType: "none" },
      { key: "actions", label: t("common.actions"), width: "w-[60px]", editType: "none" },
    ],
    [t]
  );

  const [columns, setColumns] = useState<PurchaseColumnDef[]>(ALL_COLUMNS);
  const [visibleExtras, setVisibleExtras] = useState<Set<PurchaseColumnKey>>(
    () => new Set(DEFAULT_VISIBLE_EXTRAS)
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.extra || visibleExtras.has(c.key)),
    [columns, visibleExtras]
  );

  const toggleExtraColumn = useCallback((key: PurchaseColumnKey) => {
    setVisibleExtras((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sort state
  const [sortKey, setSortKey] = useState<PurchaseColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = useCallback(
    (key: PurchaseColumnKey) => {
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
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragColIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragColIdx(null);
    setDragOverIdx(null);
  }, []);

  const handleDrop = useCallback(() => {
    if (dragColIdx === null || dragOverIdx === null || dragColIdx === dragOverIdx) {
      setDragColIdx(null);
      setDragOverIdx(null);
      return;
    }
    const fromKey = visibleColumns[dragColIdx]?.key;
    const toKey = visibleColumns[dragOverIdx]?.key;
    if (!fromKey || !toKey) return;

    setColumns((prev) => {
      const reordered = [...prev];
      const fromIdx = reordered.findIndex((c) => c.key === fromKey);
      const toIdx = reordered.findIndex((c) => c.key === toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered;
    });
    setDragColIdx(null);
    setDragOverIdx(null);
  }, [dragColIdx, dragOverIdx, visibleColumns]);

  // Compact rows
  const [compactRows, setCompactRows] = useState(false);

  // Saved views
  const [savedViews, setSavedViews] = useState<PurchaseSavedView[]>(() =>
    loadSavedViews(projectId)
  );

  const saveView = useCallback(
    (name: string) => {
      const newView: PurchaseSavedView = {
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
      return newView;
    },
    [columns, visibleExtras, sortKey, sortDir, compactRows, savedViews, projectId]
  );

  const loadView = useCallback(
    (view: PurchaseSavedView) => {
      const orderedColumns = view.columnOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is PurchaseColumnDef => c !== undefined);
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
    handleDragEnd,
    dragColIdx,
    dragOverIdx,
    compactRows,
    setCompactRows,
    savedViews,
    saveView,
    loadView,
    deleteView,
  };
}

export type PurchasesTableViewState = ReturnType<typeof usePurchasesTableView>;
