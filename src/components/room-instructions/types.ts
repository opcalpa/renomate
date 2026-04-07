export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  source?: string;
}

export interface WallSpec {
  main_color?: string;
  accent_wall_color?: string;
  has_accent_wall?: boolean;
  treatments?: string[];
}

export interface FloorSpec {
  material?: string;
  specification?: string;
  treatments?: string[];
  skirting_type?: string;
  skirting_color?: string;
}

export interface CeilingSpec {
  color?: string;
  material?: string;
  molding_type?: string;
}

export interface JoinerySpec {
  door_type?: string;
  trim_type?: string;
}

export interface RoomTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  checklists: Checklist[];
  photos: Photo[];
}

export interface RoomMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  vendorName: string | null;
}

export interface RoomInstruction {
  id: string;
  name: string;
  wallColor: string | null;
  ceilingColor: string | null;
  trimColor: string | null;
  wallSpec: WallSpec | null;
  floorSpec: FloorSpec | null;
  ceilingSpec: CeilingSpec | null;
  joinerySpec: JoinerySpec | null;
  dimensions: { area_sqm?: number; ceiling_height_mm?: number } | null;
  referencePhotos: Photo[];
  tasks: RoomTask[];
  materials: RoomMaterial[];
  progress: { completed: number; total: number };
}
