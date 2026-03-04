/**
 * Timezone-safe date utilities for date-only (YYYY-MM-DD) values.
 *
 * Problem: `new Date("2026-03-03")` is parsed as UTC midnight.
 * In CET (UTC+1) that's fine (01:00 local), but `toISOString()` on a
 * local-midnight Date shifts it back to the previous day in UTC.
 *
 * These helpers ensure dates round-trip correctly regardless of timezone.
 */

/** Parse a "YYYY-MM-DD" string into a Date at LOCAL midnight. */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Format a Date as "YYYY-MM-DD" using LOCAL date parts (not UTC). */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
