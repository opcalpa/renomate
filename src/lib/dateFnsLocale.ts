import { sv, enUS, de, fr, es, pl, uk, ro, lt, et } from "date-fns/locale";
import type { Locale } from "date-fns";

const localeMap: Record<string, Locale> = {
  sv, en: enUS, de, fr, es, pl, uk, ro, lt, et,
};

export function getDateLocale(lang: string): Locale {
  return localeMap[lang] || enUS;
}
