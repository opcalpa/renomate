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

/** Detect if a string can be used as CSS backgroundColor */
function isCssColor(val: string): boolean {
  if (/^#([0-9a-f]{3,8})$/i.test(val)) return true;
  if (/^(rgb|hsl)/i.test(val)) return true;
  // Common CSS named colors used in renovation context
  const namedColors = new Set(["white", "black", "gray", "grey", "red", "blue", "green", "yellow", "brown", "beige", "cream", "ivory",
    "vit", "svart", "grå", "röd", "blå", "grön", "gul", "brun", "бiлий", "білий", "чорний"]);
  return namedColors.has(val.toLowerCase().trim());
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
          {isCssColor(s.color) ? (
            <div
              className="h-7 w-7 rounded-md border border-border shadow-sm shrink-0"
              style={{ backgroundColor: s.color }}
            />
          ) : (
            <div className="h-7 w-7 rounded-md border-2 border-dashed border-primary/40 shrink-0 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary/60">🎨</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-none">{s.label}</p>
            <p className="text-xs font-semibold truncate max-w-[140px]">{s.color}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
