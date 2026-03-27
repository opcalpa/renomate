import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  [key: string]: unknown;
}

interface UseBulkTaskActionsProps {
  tasks: Task[];
  projectId: string;
  onTaskUpdated: () => void;
}

export function useBulkTaskActions({ tasks, projectId, onTaskUpdated }: UseBulkTaskActionsProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);

  // Auto-prune selection when tasks change (filtered/deleted)
  useEffect(() => {
    setSelectedIds((prev) => {
      const pruned = new Set([...prev].filter((id) => taskIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [taskIds]);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount > 0 && selectedCount === tasks.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const showBulkBar = selectedCount >= 1;

  const toggleOne = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === tasks.length) {
        return new Set();
      }
      return new Set(tasks.map((t) => t.id));
    });
  }, [tasks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkUpdateField = useCallback(
    async (dbField: string, value: unknown) => {
      if (selectedIds.size === 0) return;
      setIsBulkLoading(true);
      try {
        const ids = [...selectedIds];
        const { error } = await supabase
          .from("tasks")
          .update({ [dbField]: value })
          .in("id", ids);

        if (error) {
          toast.error(t("tasksTable.bulkUpdateFailed", "Failed to update tasks"));
          return;
        }
        toast.success(t("tasksTable.bulkUpdateSuccess", { count: ids.length, defaultValue: "Updated {{count}} tasks" }));
        clearSelection();
        onTaskUpdated();
      } finally {
        setIsBulkLoading(false);
      }
    },
    [selectedIds, clearSelection, onTaskUpdated, t],
  );

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkLoading(true);
    try {
      const ids = [...selectedIds];
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", ids);

      if (error) {
        toast.error(t("tasksTable.bulkDeleteFailed", "Failed to delete tasks"));
        return;
      }
      toast.success(t("tasksTable.bulkDeleteSuccess", { count: ids.length, defaultValue: "Deleted {{count}} tasks" }));
      clearSelection();
      onTaskUpdated();
    } finally {
      setIsBulkLoading(false);
    }
  }, [selectedIds, clearSelection, onTaskUpdated, t]);

  return {
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    showBulkBar,
    isBulkLoading,
    toggleOne,
    toggleAll,
    clearSelection,
    bulkUpdateField,
    bulkDelete,
  };
}
