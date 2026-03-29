import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Debounce timer shared across all instances to batch server writes
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrites: Record<string, unknown> = {};

async function flushToServer() {
  const writes = { ...pendingWrites };
  pendingWrites = {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, ui_preferences")
    .eq("user_id", user.id)
    .single();
  if (!profile) return;

  const current = (profile.ui_preferences as Record<string, unknown>) || {};
  const merged = { ...current, ...writes };

  await supabase
    .from("profiles")
    .update({ ui_preferences: merged })
    .eq("id", profile.id);
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(flushToServer, 2000);
}

/**
 * Queue a key/value for server sync. Used by external localStorage writers
 * (e.g. table view hooks) that manage their own localStorage but want server backup.
 */
export function scheduleServerSync(key: string, value: unknown) {
  pendingWrites[key] = value;
  scheduleSync();
}

/**
 * Hook that persists a value to localStorage (instant) + Supabase profiles.ui_preferences (debounced).
 * On mount: reads localStorage first (fast), then hydrates from server if localStorage is empty.
 */
export function usePersistedPreference<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch { /* ignore */ }
    return defaultValue;
  });

  const hydratedRef = useRef(false);

  // Hydrate from server on first mount if localStorage was empty
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const stored = localStorage.getItem(key);
    if (stored !== null) return; // localStorage has data, trust it

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("ui_preferences")
          .eq("user_id", user.id)
          .single();
        if (!profile?.ui_preferences) return;
        const prefs = profile.ui_preferences as Record<string, unknown>;
        if (key in prefs) {
          const serverValue = prefs[key] as T;
          localStorage.setItem(key, JSON.stringify(serverValue));
          setValue(serverValue);
        }
      } catch { /* ignore — offline or not logged in */ }
    })();
  }, [key]);

  const setPersisted = useCallback((update: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof update === "function" ? (update as (prev: T) => T)(prev) : update;
      localStorage.setItem(key, JSON.stringify(next));
      pendingWrites[key] = next;
      scheduleSync();
      return next;
    });
  }, [key]);

  return [value, setPersisted];
}

/**
 * One-time sync: pull all server prefs into localStorage on login.
 * Call this once at app root level.
 */
export async function hydratePreferencesFromServer() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("ui_preferences")
      .eq("user_id", user.id)
      .single();
    if (!profile?.ui_preferences) return;
    const prefs = profile.ui_preferences as Record<string, unknown>;
    for (const [key, val] of Object.entries(prefs)) {
      // Only hydrate if localStorage doesn't already have a value
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    }
  } catch { /* ignore */ }
}
