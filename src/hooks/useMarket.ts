import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePersistedPreference } from "./usePersistedPreference";
import { guessMarketFromLanguage } from "@/lib/modules";

const STORAGE_KEY = "user_market";

/**
 * Hook for the user's operating market (country).
 *
 * Market is independent from UI language — a Polish builder in Sweden
 * uses English UI but operates in the Swedish market (SE).
 *
 * Returns null for "international" (no region-specific features).
 */
export function useMarket(): [string | null, (market: string | null) => void] {
  const { i18n } = useTranslation();
  const [stored, setStored] = usePersistedPreference<string | null>(STORAGE_KEY, null);

  // "not-set" means never explicitly configured → guess from language
  const [configured, setConfigured] = usePersistedPreference<boolean>("user_market_configured", false);

  const market = useMemo(() => {
    if (configured) return stored;
    return guessMarketFromLanguage(i18n.language);
  }, [configured, stored, i18n.language]);

  const setMarket = (value: string | null) => {
    setStored(value);
    setConfigured(true);
  };

  return [market, setMarket];
}
