/**
 * useContextualTips — React hook for surfacing contextual tips.
 *
 * Matches the current context against the tips database and returns
 * relevant tips. Dismissed tips are persisted in localStorage.
 */

import { useMemo, useCallback, useState } from "react";
import {
  findMatchingTips,
  type TipContext,
  type ContextualTip,
} from "@/lib/contextualTips";

const DISMISSED_KEY = "renomate_dismissed_tips";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore
  }
  return new Set();
}

function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

interface UseContextualTipsReturn {
  tips: ContextualTip[];
  dismiss: (tipId: string) => void;
  dismissAll: () => void;
  isDismissed: (tipId: string) => boolean;
}

export function useContextualTips(context: TipContext): UseContextualTipsReturn {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const tips = useMemo(
    () => findMatchingTips(context, dismissed),
    [context, dismissed]
  );

  const dismiss = useCallback((tipId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(tipId);
      saveDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const tip of tips) {
        next.add(tip.id);
      }
      saveDismissed(next);
      return next;
    });
  }, [tips]);

  const isDismissed = useCallback(
    (tipId: string) => dismissed.has(tipId),
    [dismissed]
  );

  return { tips, dismiss, dismissAll, isDismissed };
}
