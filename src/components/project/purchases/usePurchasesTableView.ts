import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  PurchaseColumnKey,
  PurchaseColumnDef,
  EXTRA_COLUMN_KEYS,
  DEFAULT_VISIBLE_EXTRAS,
} from "./purchasesTypes";

const PREFS_KEY = (projectId: string, isMobile: boolean) =>
  `purchases-table-prefs-${projectId}${isMobile ? "_mobile" : ""}`;

const MOBILE_DEFAULT_VISIBLE_EXTRAS: PurchaseColumnKey[] = ["priceTotal"];

interface TablePrefs {
  columnOrder: PurchaseColumnKey[];
  visibleExtras: PurchaseColumnKey[];
  sortKey: PurchaseColumnKey | null;
  sortDir: "asc" | "desc";
  compactRows: boolean;
}

function loadPrefs(projectId: string, isMobile: boolean): TablePrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY(projectId, isMobile));
    if (!raw) return null;
    return JSON.parse(raw) as TablePrefs;
  } catch {
    return null;
  }
}

function persistPrefs(projectId: string, isMobile: boolean, prefs: TablePrefs) {
  const key = PREFS_KEY(projectId, isMobile);
  localStorage.setItem(key, JSON.stringify(prefs));
  import("@/hooks/usePersistedPreference").then(({ scheduleServerSync }) => scheduleServerSync(key, prefs));
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
      { key: "fileCategory", label: t("files.category", "Filkategori"), width: "w-[120px]", extra: true, editType: "none" },
      { key: "rotAmount", label: t("files.rotAmount", "ROT-avdrag"), width: "w-[110px]", align: "right", extra: true, editType: "numeric", dbField: "rot_amount" },
      { key: "paidDate", label: t("common.paidDate", "Betaldat"), width: "w-[130px]", extra: true, editType: "none", dbField: "paid_date" },
      { key: "actions", label: t("common.actions"), width: "w-[60px]", editType: "none" },
    ],
    [t]
  );

  const isMobile = useRef(typeof window !== "undefined" && window.innerWidth < 768).current;
  const saved = useRef(loadPrefs(projectId, isMobile));

  const [columns, setColumns] = useState<PurchaseColumnDef[]>(() => {
    if (saved.current?.columnOrder) {
      const ordered = saved.current.columnOrder
        .map((key) => ALL_COLUMNS.find((c) => c.key === key))
        .filter((c): c is PurchaseColumnDef => c !== undefined);
      for (const col of ALL_COLUMNS) {
        if (!ordered.some((c) => c.key === col.key)) ordered.push(col);
      }
      return ordered;
    }
    return ALL_COLUMNS;
  });

  const [visibleExtras, setVisibleExtras] = useState<Set<PurchaseColumnKey>>(
    () => saved.current?.visibleExtras
      ? new Set(saved.current.visibleExtras)
      : new Set(isMobile ? MOBILE_DEFAULT_VISIBLE_EXTRAS : DEFAULT_VISIBLE_EXTRAS)
  );

  const [sortKey, setSortKey] = useState<PurchaseColumnKey | null>(
    () => saved.current?.sortKey ?? null
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    () => saved.current?.sortDir ?? "asc"
  );
  const [compactRows, setCompactRows] = useState(
    () => saved.current?.compactRows ?? false
  );

  // Auto-persist on every change
  useEffect(() => {
    persistPrefs(projectId, isMobile, {
      columnOrder: columns.map((c) => c.key),
      visibleExtras: Array.from(visibleExtras),
      sortKey,
      sortDir,
      compactRows,
    });
  }, [columns, visibleExtras, sortKey, sortDir, compactRows, projectId, isMobile]);

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
  };
}

export type PurchasesTableViewState = ReturnType<typeof usePurchasesTableView>;
