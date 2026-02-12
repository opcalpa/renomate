import { cn } from "@/lib/utils";

interface FilledIndicatorProps {
  filled: number;
  total: number;
  className?: string;
}

/**
 * Shows a visual indicator of how many fields are filled in a section.
 * Uses dots for compact display: ●●○○ means 2/4 filled
 */
export function FilledIndicator({ filled, total, className }: FilledIndicatorProps) {
  if (total === 0) return null;

  const isEmpty = filled === 0;
  const isFull = filled === total;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Dot indicators */}
      <div className="flex gap-0.5">
        {Array.from({ length: Math.min(total, 5) }).map((_, i) => {
          // For sections with more than 5 fields, compress the display
          const threshold = total > 5 ? Math.ceil((filled / total) * 5) : filled;
          const isFilled = i < threshold;

          return (
            <div
              key={i}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                isFilled
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              )}
            />
          );
        })}
      </div>

      {/* Text label */}
      <span
        className={cn(
          "text-xs tabular-nums",
          isEmpty
            ? "text-slate-400"
            : isFull
            ? "text-emerald-600"
            : "text-slate-500"
        )}
      >
        {isEmpty ? "—" : `${filled}/${total}`}
      </span>
    </div>
  );
}
