import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColumnToggleProps<K extends string> {
  /** All available column keys in display order */
  columns: K[];
  /** Map column key → display label */
  labels: Record<K, string>;
  /** Set of currently visible column keys */
  visible: Set<K>;
  /** Called when visibility changes */
  onChange: (visible: Set<K>) => void;
  /** Popover alignment (default: "end") */
  align?: "start" | "center" | "end";
  /** Custom trigger element. If omitted, renders a default Settings2 button. */
  trigger?: React.ReactNode;
}

/**
 * Unified column visibility toggle used across all tables.
 * Shows "Visa alla / Dölj alla" when there are 5+ columns.
 */
export function ColumnToggle<K extends string>({
  columns,
  labels,
  visible,
  onChange,
  align = "end",
  trigger,
}: ColumnToggleProps<K>) {
  const { t } = useTranslation();
  const allVisible = columns.every((c) => visible.has(c));
  const noneVisible = columns.every((c) => !visible.has(c));

  const toggleColumn = (col: K) => {
    const next = new Set(visible);
    if (next.has(col)) {
      next.delete(col);
    } else {
      next.add(col);
    }
    onChange(next);
  };

  const toggleAll = () => {
    if (allVisible) {
      onChange(new Set());
    } else {
      onChange(new Set(columns));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-52 p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t("columns.title", "Visa/dölj kolumner")}
        </p>

        {columns.length >= 5 && (
          <button
            type="button"
            onClick={toggleAll}
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors mb-1 text-primary font-medium"
          >
            {allVisible
              ? t("columns.hideAll", "Dölj alla")
              : noneVisible
                ? t("columns.showAll", "Visa alla")
                : t("columns.showAll", "Visa alla")}
          </button>
        )}

        <div className="space-y-0.5">
          {columns.map((col) => (
            <label
              key={col}
              className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors cursor-pointer"
            >
              <Checkbox
                checked={visible.has(col)}
                onCheckedChange={() => toggleColumn(col)}
                className="h-4 w-4"
              />
              <span className="truncate">{labels[col] || col}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
