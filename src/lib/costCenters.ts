import {
  Hammer,
  PaintBucket,
  HardHat,
  Wrench,
  Grid3x3,
  Frame,
  Zap,
  Ruler,
  ClipboardCheck,
  Trash2,
  Pencil,
  LucideIcon
} from "lucide-react";

export interface CostCenter {
  id: string;
  label: string;
  labelKey: string;
  icon: LucideIcon;
}

// Work type categories — NOT rooms. "Where" = Room, "What type" = Category.
export const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: "demolition", label: "Demolition", labelKey: "costCenters.demolition", icon: Hammer },
  { id: "construction", label: "Construction", labelKey: "costCenters.construction", icon: HardHat },
  { id: "electricity", label: "Electricity", labelKey: "costCenters.electricity", icon: Zap },
  { id: "plumbing", label: "Plumbing", labelKey: "costCenters.plumbing", icon: Wrench },
  { id: "tiles", label: "Tiles", labelKey: "costCenters.tiles", icon: Grid3x3 },
  { id: "floor", label: "Floor", labelKey: "costCenters.floor", icon: Grid3x3 },
  { id: "paint", label: "Paint", labelKey: "costCenters.paint", icon: PaintBucket },
  { id: "carpentry", label: "Carpentry", labelKey: "costCenters.carpentry", icon: Hammer },
  { id: "windows_doors", label: "Windows & Doors", labelKey: "costCenters.windowsDoors", icon: Frame },
  { id: "inspection", label: "Inspection", labelKey: "costCenters.inspection", icon: ClipboardCheck },
  { id: "cleanup", label: "Cleanup & Waste", labelKey: "costCenters.cleanup", icon: Trash2 },
  { id: "design", label: "Design & Planning", labelKey: "costCenters.design", icon: Pencil },
];

export const getCostCenterIcon = (costCenter: string | null): LucideIcon | null => {
  if (!costCenter) return null;

  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) return defaultCenter.icon;

  // Legacy IDs still resolve to icons
  if (costCenter === "kitchen" || costCenter === "bathrooms" || costCenter === "bathroom") return Wrench;
  if (costCenter === "windows" || costCenter === "doors") return Frame;

  // For custom cost centers, use Ruler as default icon
  return Ruler;
};

export const getCostCenterLabel = (costCenter: string | null, t?: (key: string, fallback?: string) => string): string | null => {
  if (!costCenter) return null;

  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) {
    return t ? t(defaultCenter.labelKey, defaultCenter.label) : defaultCenter.label;
  }

  // Legacy IDs — map to current labels
  const LEGACY_MAP: Record<string, string> = {
    kitchen: "costCenters.plumbing",
    bathrooms: "costCenters.plumbing",
    bathroom: "costCenters.plumbing",
    windows: "costCenters.windowsDoors",
    doors: "costCenters.windowsDoors",
  };
  if (LEGACY_MAP[costCenter]) {
    return t ? t(LEGACY_MAP[costCenter], costCenter) : costCenter;
  }

  // For custom cost centers, return the value as-is
  return costCenter;
};
