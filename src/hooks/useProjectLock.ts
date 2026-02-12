import { useState, useEffect, useCallback } from "react";
import {
  getProjectLockStatus,
  lockProject,
  unlockProject,
  type ProjectLockStatus,
} from "@/services/projectLockService";

interface UseProjectLockResult {
  lockStatus: ProjectLockStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  lock: (quoteId: string) => Promise<void>;
  unlock: () => Promise<void>;
}

/**
 * Hook to manage project lock status
 */
export function useProjectLock(projectId: string | undefined): UseProjectLockResult {
  const [lockStatus, setLockStatus] = useState<ProjectLockStatus>({
    isLocked: false,
    lockedAt: null,
    lockedByQuoteId: null,
    quote: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const status = await getProjectLockStatus(projectId);
      setLockStatus(status);
    } catch (error) {
      console.error("Failed to get project lock status:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lock = useCallback(
    async (quoteId: string) => {
      if (!projectId) return;
      await lockProject(projectId, quoteId);
      await refresh();
    },
    [projectId, refresh]
  );

  const unlock = useCallback(async () => {
    if (!projectId) return;
    await unlockProject(projectId);
    await refresh();
  }, [projectId, refresh]);

  return {
    lockStatus,
    loading,
    refresh,
    lock,
    unlock,
  };
}
