// Main exports
export { RoomDetailDialog } from "./RoomDetailDialog";
export { RoomDetailForm } from "./RoomDetailForm";
export { PhotoSection } from "./PhotoSection";

// Hooks
export { useRoomForm } from "./hooks/useRoomForm";

// Field components
export { MultiSelect } from "./fields/MultiSelect";
export { ComboboxFretext } from "./fields/ComboboxFretext";

// Section components
export { IdentitySection } from "./sections/IdentitySection";
export { HorizontalSection } from "./sections/HorizontalSection";
export { VerticalSection } from "./sections/VerticalSection";
export { TechnicalSection } from "./sections/TechnicalSection";
export { SmartDataSection } from "./sections/SmartDataSection";

// Types
export type {
  Room,
  RoomFormData,
  RoomDetailDialogProps,
  SectionProps,
  IdentitySectionProps,
  SmartDataSectionProps,
  FloorSpec,
  CeilingSpec,
  WallSpec,
  JoinerySpec,
  ElectricalSpec,
  HeatingSpec,
  Photo,
} from "./types";

// Constants
export * from "./constants";
