import { addDays, differenceInDays } from "date-fns";

/** Height of each task row in pixels */
export const ROW_HEIGHT = 48;

/** Height of the date ruler area */
export const RULER_HEIGHT = 56;

/** Vertical padding inside the task bar */
export const BAR_PADDING_Y = 8;

/** Minimum bar width in pixels */
export const MIN_BAR_WIDTH = 24;

/** Default pixels per day (zoom level) */
export const DEFAULT_PIXELS_PER_DAY = 120;

/** Zoom constraints */
export const MIN_PIXELS_PER_DAY = 16;
export const MAX_PIXELS_PER_DAY = 300;

/** Hex colors mapped to task statuses for Konva rendering */
export const STATUS_HEX: Record<string, string> = {
  to_do: "#f59e0b",
  in_progress: "#3b82f6",
  done: "#10b981",
  completed: "#10b981",
  on_hold: "#9ca3af",
  blocked: "#ef4444",
  cancelled: "#f87171",
  planned: "#818cf8",
};

const FALLBACK_HEX = "#94a3b8";

/** Returns hex color for a status string */
export function getTaskColor(status: string): string {
  return STATUS_HEX[status] || FALLBACK_HEX;
}

/** Darken a hex color by a ratio (0-1) for progress overlay */
export function darkenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Convert a Date to x-position on the canvas */
export function dateToX(
  date: Date,
  originDate: Date,
  pixelsPerDay: number,
  panX: number
): number {
  const days = differenceInDays(date, originDate);
  return days * pixelsPerDay + panX;
}

/** Convert an x-position back to a Date */
export function xToDate(
  x: number,
  originDate: Date,
  pixelsPerDay: number,
  panX: number
): Date {
  const days = Math.round((x - panX) / pixelsPerDay);
  return addDays(originDate, days);
}

/** Weekend check (Saturday=6, Sunday=0) */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Check if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
