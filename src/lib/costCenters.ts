import {
  Hammer,
  PaintBucket,
  HardHat,
  ChefHat,
  Bath,
  Wrench,
  Grid3x3,
  Frame,
  DoorOpen,
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

export const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: "floor", label: "Floor", labelKey: "costCenters.floor", icon: Grid3x3 },
  { id: "paint", label: "Paint", labelKey: "costCenters.paint", icon: PaintBucket },
  { id: "construction", label: "Construction", labelKey: "costCenters.construction", icon: HardHat },
  { id: "kitchen", label: "Kitchen", labelKey: "costCenters.kitchen", icon: ChefHat },
  { id: "bathrooms", label: "Bathrooms", labelKey: "costCenters.bathrooms", icon: Bath },
  { id: "plumbing", label: "Plumbing", labelKey: "costCenters.plumbing", icon: Wrench },
  { id: "tiles", label: "Tiles", labelKey: "costCenters.tiles", icon: Grid3x3 },
  { id: "windows", label: "Windows", labelKey: "costCenters.windows", icon: Frame },
  { id: "doors", label: "Doors", labelKey: "costCenters.doors", icon: DoorOpen },
  { id: "electricity", label: "Electricity", labelKey: "costCenters.electricity", icon: Zap },
  { id: "carpentry", label: "Carpentry", labelKey: "costCenters.carpentry", icon: Hammer },
  { id: "demolition", label: "Demolition", labelKey: "costCenters.demolition", icon: Hammer },
  { id: "inspection", label: "Inspection", labelKey: "costCenters.inspection", icon: ClipboardCheck },
  { id: "cleanup", label: "Cleanup & Waste", labelKey: "costCenters.cleanup", icon: Trash2 },
  { id: "design", label: "Design & Planning", labelKey: "costCenters.design", icon: Pencil },
];

export const getCostCenterIcon = (costCenter: string | null): LucideIcon | null => {
  if (!costCenter) return null;
  
  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) return defaultCenter.icon;
  
  // For custom cost centers, use Ruler as default icon
  return Ruler;
};

export const getCostCenterLabel = (costCenter: string | null, t?: (key: string, fallback?: string) => string): string | null => {
  if (!costCenter) return null;

  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) {
    return t ? t(defaultCenter.labelKey, defaultCenter.label) : defaultCenter.label;
  }

  // For custom cost centers, return the value as-is
  return costCenter;
};
