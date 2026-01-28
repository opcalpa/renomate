// Room name suggestions for ComboboxFretext
export const ROOM_NAME_SUGGESTIONS = [
  "Vardagsrum",
  "Kök",
  "Sovrum",
  "Sovrum 1",
  "Sovrum 2",
  "Sovrum 3",
  "Badrum",
  "Toalett",
  "Hall",
  "Entré",
  "Arbetsrum",
  "Kontor",
  "Tvättstuga",
  "Klädkammare",
  "Förråd",
  "Balkong",
  "Altan",
  "Garage",
  "Källare",
  "Vind",
  "Gästrum",
  "Lekrum",
  "Matsal",
  "Allrum",
];

// Room status options
export const ROOM_STATUS_OPTIONS = [
  { value: "befintligt", label: "Befintligt" },
  { value: "ska_renoveras", label: "Ska renoveras" },
  { value: "nyproduktion", label: "Nyproduktion" },
];

// Priority options
export const PRIORITY_OPTIONS = [
  { value: "low", label: "Låg" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Hög" },
];

// Floor material options
export const FLOOR_MATERIAL_OPTIONS = [
  { value: "parkett", label: "Parkett" },
  { value: "klinker", label: "Klinker" },
  { value: "linoleum", label: "Linoleum" },
  { value: "betong", label: "Betong" },
  { value: "laminat", label: "Laminat" },
  { value: "vinyl", label: "Vinyl" },
  { value: "matta", label: "Matta" },
  { value: "sten", label: "Sten" },
];

// Floor treatment options (multi-select)
export const FLOOR_TREATMENT_OPTIONS = [
  { value: "vaxad", label: "Vaxad" },
  { value: "oljad", label: "Oljad" },
  { value: "mattlackad", label: "Mattlackad" },
  { value: "naturell", label: "Naturell" },
  { value: "hoglans", label: "Högblank" },
  { value: "slipad", label: "Slipad" },
];

// Skirting (golvlist) options
export const SKIRTING_OPTIONS = [
  { value: "tra_10cm", label: "Trä 10 cm" },
  { value: "tra_7cm", label: "Trä 7 cm" },
  { value: "tra_5cm", label: "Trä 5 cm" },
  { value: "mdf_10cm", label: "MDF 10 cm" },
  { value: "mdf_7cm", label: "MDF 7 cm" },
  { value: "aluminium", label: "Aluminium" },
  { value: "ingen", label: "Ingen" },
];

// Ceiling material options
export const CEILING_MATERIAL_OPTIONS = [
  { value: "gips", label: "Gips" },
  { value: "puts", label: "Puts" },
  { value: "akustikplattor", label: "Akustikplattor" },
  { value: "tra_panel", label: "Träpanel" },
  { value: "spant", label: "Spänntak" },
];

// Ceiling molding (taklist) options
export const CEILING_MOLDING_OPTIONS = [
  { value: "halkarl", label: "Hålkärl" },
  { value: "svanhals", label: "Svanhals" },
  { value: "klassisk", label: "Klassisk" },
  { value: "modern", label: "Modern" },
  { value: "ingen", label: "Ingen" },
];

// Wall treatment options (multi-select)
export const WALL_TREATMENT_OPTIONS = [
  { value: "malat", label: "Målat" },
  { value: "tapetserat", label: "Tapetserat" },
  { value: "kaklat", label: "Kaklat" },
  { value: "panel", label: "Panel" },
  { value: "puts", label: "Puts" },
  { value: "betong", label: "Betong" },
  { value: "tegel", label: "Tegel" },
];

// Wall material options (for walls and elevation objects)
export const WALL_MATERIAL_OPTIONS = [
  { value: "gips", label: "Gips" },
  { value: "betong", label: "Betong" },
  { value: "tegelsten", label: "Tegelsten" },
  { value: "lattvaggsblock", label: "Lättväggblock" },
  { value: "tra_regelverk", label: "Trä regelverk" },
  { value: "stalreglar", label: "Stålreglar" },
  { value: "mdf", label: "MDF" },
  { value: "osb", label: "OSB" },
  { value: "plywood", label: "Plywood" },
  { value: "glasvagg", label: "Glasvägg" },
];

// Elevation object material options
export const ELEVATION_OBJECT_MATERIAL_OPTIONS = [
  { value: "tra", label: "Trä" },
  { value: "metall", label: "Metall" },
  { value: "glas", label: "Glas" },
  { value: "sten", label: "Sten" },
  { value: "keramik", label: "Keramik" },
  { value: "plast", label: "Plast" },
  { value: "tyg", label: "Tyg" },
  { value: "lader", label: "Läder" },
  { value: "gips", label: "Gips" },
  { value: "betong", label: "Betong" },
];

// Door type options
export const DOOR_TYPE_OPTIONS = [
  { value: "spegeldorr", label: "Spegeldörr" },
  { value: "slat", label: "Slät" },
  { value: "glasad", label: "Glasad" },
  { value: "panel", label: "Panel" },
  { value: "skjutdorr", label: "Skjutdörr" },
  { value: "pardorr", label: "Pardörr" },
];

// Trim type options
export const TRIM_TYPE_OPTIONS = [
  { value: "klassisk", label: "Klassisk" },
  { value: "modern", label: "Modern" },
  { value: "minimalistisk", label: "Minimalistisk" },
  { value: "antik", label: "Antik" },
  { value: "ingen", label: "Ingen" },
];

// Electrical series options
export const ELECTRICAL_SERIES_OPTIONS = [
  { value: "schneider_renova", label: "Schneider Renova" },
  { value: "elko_rs", label: "Elko RS" },
  { value: "gira", label: "Gira" },
  { value: "jung", label: "Jung" },
  { value: "abb", label: "ABB" },
];

// Outlet/switch type options (multi-select)
export const OUTLET_TYPE_OPTIONS = [
  { value: "enkel_uttag", label: "Enkelt uttag" },
  { value: "dubbel_uttag", label: "Dubbelt uttag" },
  { value: "usb_uttag", label: "USB-uttag" },
  { value: "enkel_brytare", label: "Enkel brytare" },
  { value: "dubbel_brytare", label: "Dubbel brytare" },
  { value: "dimmer", label: "Dimmer" },
  { value: "rorelsedetktor", label: "Rörelsedetektor" },
];

// Lighting type options (multi-select)
export const LIGHTING_TYPE_OPTIONS = [
  { value: "taklampa", label: "Taklampa" },
  { value: "spotlights", label: "Spotlights" },
  { value: "vagglampa", label: "Vägglampa" },
  { value: "led_list", label: "LED-list" },
  { value: "golvlampa", label: "Golvlampa (uttag)" },
  { value: "pendel", label: "Pendel" },
];

// Heating type options
export const HEATING_TYPE_OPTIONS = [
  { value: "radiator", label: "Radiator" },
  { value: "golvarme", label: "Golvvärme" },
  { value: "konvektor", label: "Konvektor" },
  { value: "elvärme", label: "Elvärme" },
  { value: "ingen", label: "Ingen" },
];

// Room color palette
export const ROOM_COLOR_OPTIONS = [
  { name: "Blå", color: "rgba(59, 130, 246, 0.2)", hex: "#3b82f6" },
  { name: "Grön", color: "rgba(16, 185, 129, 0.2)", hex: "#10b981" },
  { name: "Orange", color: "rgba(245, 158, 11, 0.2)", hex: "#f59e0b" },
  { name: "Lila", color: "rgba(168, 85, 247, 0.2)", hex: "#a855f7" },
  { name: "Rosa", color: "rgba(236, 72, 153, 0.2)", hex: "#ec4899" },
  { name: "Cyan", color: "rgba(6, 182, 212, 0.2)", hex: "#06b6d4" },
  { name: "Gul", color: "rgba(251, 191, 36, 0.2)", hex: "#fbbf24" },
  { name: "Grå", color: "rgba(100, 116, 139, 0.2)", hex: "#64748b" },
];

// Default form values
export const DEFAULT_FORM_VALUES = {
  name: "",
  description: "",
  color: "rgba(59, 130, 246, 0.2)",
  status: "befintligt",
  ceiling_height_mm: 2400,
  priority: "medium",
  links: "",
  notes: "",
  floor_spec: {},
  ceiling_spec: {},
  wall_spec: {},
  joinery_spec: {},
  electrical_spec: {},
  heating_spec: {},
};
