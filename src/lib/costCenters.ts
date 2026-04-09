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
  icon: LucideIcon;
}

export const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: "floor", label: "Floor", icon: Grid3x3 },
  { id: "paint", label: "Paint", icon: PaintBucket },
  { id: "construction", label: "Construction", icon: HardHat },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "bathrooms", label: "Bathrooms", icon: Bath },
  { id: "plumbing", label: "Plumbing", icon: Wrench },
  { id: "tiles", label: "Tiles", icon: Grid3x3 },
  { id: "windows", label: "Windows", icon: Frame },
  { id: "doors", label: "Doors", icon: DoorOpen },
  { id: "electricity", label: "Electricity", icon: Zap },
  { id: "carpentry", label: "Carpentry", icon: Hammer },
  { id: "demolition", label: "Demolition", icon: Hammer },
  { id: "inspection", label: "Inspection", icon: ClipboardCheck },
  { id: "cleanup", label: "Cleanup & Waste", icon: Trash2 },
  { id: "design", label: "Design & Planning", icon: Pencil },
];

export const getCostCenterIcon = (costCenter: string | null): LucideIcon | null => {
  if (!costCenter) return null;
  
  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) return defaultCenter.icon;
  
  // For custom cost centers, use Ruler as default icon
  return Ruler;
};

export const getCostCenterLabel = (costCenter: string | null): string | null => {
  if (!costCenter) return null;
  
  const defaultCenter = DEFAULT_COST_CENTERS.find(cc => cc.id === costCenter);
  if (defaultCenter) return defaultCenter.label;
  
  // For custom cost centers, return the value as-is
  return costCenter;
};
