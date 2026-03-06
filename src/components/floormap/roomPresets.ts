import { Home, UtensilsCrossed, BedDouble, Bath, DoorOpen, WashingMachine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface RoomPreset {
  value: string;
  labelKey: string;
  defaultName: string;
  color: string;
  icon: LucideIcon;
}

export const ROOM_PRESETS: RoomPreset[] = [
  { value: "kitchen", labelKey: "roomPresets.kitchen", defaultName: "Kök", color: "#FDE68A", icon: UtensilsCrossed },
  { value: "bedroom", labelKey: "roomPresets.bedroom", defaultName: "Sovrum", color: "#BAE6FD", icon: BedDouble },
  { value: "livingRoom", labelKey: "roomPresets.livingRoom", defaultName: "Vardagsrum", color: "#D9F99D", icon: Home },
  { value: "bathroom", labelKey: "roomPresets.bathroom", defaultName: "Badrum", color: "#C4B5FD", icon: Bath },
  { value: "hallway", labelKey: "roomPresets.hallway", defaultName: "Hall", color: "#FED7AA", icon: DoorOpen },
  { value: "laundry", labelKey: "roomPresets.laundry", defaultName: "Tvättstuga", color: "#A5F3FC", icon: WashingMachine },
];
