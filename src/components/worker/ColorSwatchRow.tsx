import { useTranslation } from "react-i18next";

interface WallSpec {
  main_color?: string;
  accent_wall_color?: string;
  has_accent_wall?: boolean;
  treatments?: string[];
}

interface CeilingSpec {
  color?: string;
  material?: string;
}

interface FloorSpec {
  material?: string;
  skirting_color?: string;
}

interface ColorSwatchRowProps {
  wallSpec: WallSpec | null;
  ceilingSpec: CeilingSpec | null;
  floorSpec: FloorSpec | null;
}

interface SwatchItem {
  label: string;
  color: string;
}

/** Detect if a string looks like a hex color or CSS color */
function isColorValue(val: string): boolean {
  return /^#([0-9a-f]{3,8})$/i.test(val) || /^(rgb|hsl)/i.test(val);
}

export function ColorSwatchRow({ wallSpec, ceilingSpec, floorSpec }: ColorSwatchRowProps) {
  const { t } = useTranslation();

  const swatches: SwatchItem[] = [];

  if (wallSpec?.main_color) {
    swatches.push({ label: t("worker.walls", "Walls"), color: wallSpec.main_color });
  }
  if (wallSpec?.has_accent_wall && wallSpec?.accent_wall_color) {
    swatches.push({ label: t("worker.accentWall", "Accent wall"), color: wallSpec.accent_wall_color });
  }
  if (ceilingSpec?.color) {
    swatches.push({ label: t("worker.ceiling", "Ceiling"), color: ceilingSpec.color });
  }
  if (floorSpec?.skirting_color) {
    swatches.push({ label: t("worker.skirting", "Skirting"), color: floorSpec.skirting_color });
  }

  if (swatches.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {swatches.map((s, i) => (
        <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <div
            className="h-7 w-7 rounded-md border border-border shadow-sm shrink-0"
            style={isColorValue(s.color) ? { backgroundColor: s.color } : { backgroundColor: "#e5e5e5" }}
          />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">{s.label}</p>
            <p className="text-xs font-medium truncate max-w-[120px]">{s.color}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
