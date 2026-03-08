// ---------------------------------------------------------------------------
// Material Recipe Engine — pure utility, no React
// ---------------------------------------------------------------------------

const DEFAULT_CEILING_MM = 2400;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterialSuggestion {
  recipeKey: RecipeKey;
  nameKey: string;
  nameFallback: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  estimatedHours: number;
  workAreaSqm: number;
  formula: string;
  // Recipe parameters for editable formula display
  coverage?: number;     // m² per unit (painting: m²/L)
  coats?: number;        // number of coats (painting only)
  wasteFactor?: number;  // waste multiplier (flooring/tiling: 1.1)
}

export interface RecipeEstimationSettings {
  paint_coverage_sqm_per_liter: number;
  paint_coats: number;
  // Unit prices (SEK)
  paint_price_per_liter: number;
  floor_price_per_sqm: number;
  tile_price_per_sqm: number;
  // Productivity (m²/h)
  paint_sqm_per_hour: number;
  floor_sqm_per_hour: number;
  tile_sqm_per_hour: number;
  // Labor-only work type productivity (m²/h)
  demolition_sqm_per_hour: number;
  spackling_sqm_per_hour: number;
  sanding_sqm_per_hour: number;
  carpentry_sqm_per_hour: number;
  electrical_sqm_per_hour: number;
  plumbing_sqm_per_hour: number;
}

const DEFAULT_ESTIMATION: RecipeEstimationSettings = {
  paint_coverage_sqm_per_liter: 10,
  paint_coats: 2,
  paint_price_per_liter: 150,
  floor_price_per_sqm: 300,
  tile_price_per_sqm: 500,
  paint_sqm_per_hour: 10,
  floor_sqm_per_hour: 5,
  tile_sqm_per_hour: 3,
  demolition_sqm_per_hour: 8,
  spackling_sqm_per_hour: 6,
  sanding_sqm_per_hour: 12,
  carpentry_sqm_per_hour: 4,
  electrical_sqm_per_hour: 3,
  plumbing_sqm_per_hour: 2,
};

export interface RecipeRoom {
  dimensions: {
    area_sqm?: number;
    width_mm?: number;
    height_mm?: number;
    perimeter_mm?: number;
    non_paintable_area_sqm?: number;
  } | null;
  ceiling_height_mm?: number | null;
}

type RecipeKey = "painting" | "flooring" | "tiling";

// All detectable work types: full recipe (labor+material) or labor-only
export type WorkType = RecipeKey | "demolition" | "spackling" | "sanding" | "carpentry" | "electrical" | "plumbing";

// Which area calculation to use per work type
const WORK_TYPE_AREA: Record<WorkType, "floor" | "wall"> = {
  painting: "wall",
  flooring: "floor",
  tiling: "wall",
  demolition: "floor",
  spackling: "wall",
  sanding: "floor",
  carpentry: "floor",
  electrical: "floor",
  plumbing: "floor",
};

// Productivity setting key per work type
const WORK_TYPE_RATE_KEY: Record<WorkType, keyof RecipeEstimationSettings> = {
  painting: "paint_sqm_per_hour",
  flooring: "floor_sqm_per_hour",
  tiling: "tile_sqm_per_hour",
  demolition: "demolition_sqm_per_hour",
  spackling: "spackling_sqm_per_hour",
  sanding: "sanding_sqm_per_hour",
  carpentry: "carpentry_sqm_per_hour",
  electrical: "electrical_sqm_per_hour",
  plumbing: "plumbing_sqm_per_hour",
};

// Work types that have a material recipe
const MATERIAL_RECIPE_TYPES = new Set<WorkType>(["painting", "flooring", "tiling"]);

export interface TaskEstimationResult {
  workType: WorkType;
  areaType: "floor" | "wall";
  totalAreaSqm: number;
  productivityRate: number;
  laborEstimated: boolean;
  estimatedHours: number;
  materialEstimated: boolean;
  material: MaterialSuggestion | null;
  /** Additional material suggestions (e.g. ceiling paint) */
  extraMaterials: MaterialSuggestion[];
}

export interface EstimationOptions {
  includeCeiling?: boolean;
}

// ---------------------------------------------------------------------------
// Shared helpers (also used by PlanningRoomList)
// ---------------------------------------------------------------------------

export function computeFloorAreaSqm(room: RecipeRoom): number | null {
  if (room.dimensions?.area_sqm) return room.dimensions.area_sqm;
  const w = room.dimensions?.width_mm;
  const d = room.dimensions?.height_mm;
  if (w && d) return (w / 1000) * (d / 1000);
  return null;
}

export function computeWallAreaSqm(room: RecipeRoom): number | null {
  const ceilingMm = room.ceiling_height_mm ?? DEFAULT_CEILING_MM;
  const perimeterMm = room.dimensions?.perimeter_mm;
  if (perimeterMm) {
    return (perimeterMm / 1000) * (ceilingMm / 1000);
  }
  const w = room.dimensions?.width_mm;
  const d = room.dimensions?.height_mm;
  if (w && d) {
    const perim = 2 * (w + d);
    return (perim / 1000) * (ceilingMm / 1000);
  }
  return null;
}

function parseNum(raw: Record<string, unknown>, key: string, fallback: number): number {
  return typeof raw[key] === "number" ? raw[key] : fallback;
}

export function parseEstimationSettings(
  raw: Record<string, unknown> | null
): RecipeEstimationSettings {
  if (!raw) return { ...DEFAULT_ESTIMATION };
  const d = DEFAULT_ESTIMATION;
  return {
    paint_coverage_sqm_per_liter: parseNum(raw, "paint_coverage_sqm_per_liter", d.paint_coverage_sqm_per_liter),
    paint_coats: parseNum(raw, "paint_coats", d.paint_coats),
    paint_price_per_liter: parseNum(raw, "paint_price_per_liter", d.paint_price_per_liter),
    floor_price_per_sqm: parseNum(raw, "floor_price_per_sqm", d.floor_price_per_sqm),
    tile_price_per_sqm: parseNum(raw, "tile_price_per_sqm", d.tile_price_per_sqm),
    paint_sqm_per_hour: parseNum(raw, "paint_sqm_per_hour", d.paint_sqm_per_hour),
    floor_sqm_per_hour: parseNum(raw, "floor_sqm_per_hour", d.floor_sqm_per_hour),
    tile_sqm_per_hour: parseNum(raw, "tile_sqm_per_hour", d.tile_sqm_per_hour),
    demolition_sqm_per_hour: parseNum(raw, "demolition_sqm_per_hour", d.demolition_sqm_per_hour),
    spackling_sqm_per_hour: parseNum(raw, "spackling_sqm_per_hour", d.spackling_sqm_per_hour),
    sanding_sqm_per_hour: parseNum(raw, "sanding_sqm_per_hour", d.sanding_sqm_per_hour),
    carpentry_sqm_per_hour: parseNum(raw, "carpentry_sqm_per_hour", d.carpentry_sqm_per_hour),
    electrical_sqm_per_hour: parseNum(raw, "electrical_sqm_per_hour", d.electrical_sqm_per_hour),
    plumbing_sqm_per_hour: parseNum(raw, "plumbing_sqm_per_hour", d.plumbing_sqm_per_hour),
  };
}

// ---------------------------------------------------------------------------
// Work type detection
// ---------------------------------------------------------------------------

const COST_CENTER_MAP: Record<string, WorkType> = {
  // English
  paint: "painting", painting: "painting",
  floor: "flooring", flooring: "flooring",
  tiles: "tiling", tiling: "tiling",
  demolition: "demolition",
  spackling: "spackling",
  sanding: "sanding",
  carpentry: "carpentry",
  electrical: "electrical",
  plumbing: "plumbing",
  // Swedish
  målning: "painting",
  golv: "flooring",
  kakel: "tiling", plattsättning: "tiling",
  rivning: "demolition",
  slipning: "sanding",
  snickeri: "carpentry",
  el: "electrical",
  vvs: "plumbing", rör: "plumbing",
  // Polish
  malowanie: "painting",
  podłoga: "flooring", podłogi: "flooring",
  płytki: "tiling", kafelki: "tiling",
  rozbiórka: "demolition", wyburzenie: "demolition",
  szpachlowanie: "spackling", gładź: "spackling",
  szlifowanie: "sanding",
  stolarka: "carpentry", ciesielstwo: "carpentry",
  elektryka: "electrical", elektryk: "electrical",
  hydraulika: "plumbing", hydraulik: "plumbing",
};

// Multilingual title keyword patterns: Swedish, English, Polish
const TITLE_KEYWORDS: { pattern: RegExp; key: WorkType }[] = [
  // Painting — SV: målning/måla, EN: paint, PL: malowanie/malować
  { pattern: /målning|måla|paint|malowani|malować/i, key: "painting" },
  // Flooring — SV: golv, EN: floor, PL: podłog/parkiet
  { pattern: /golv|floor|podłog|parkiet/i, key: "flooring" },
  // Tiling — SV: kakel/plattsättning/klinker, EN: tile, PL: płytk/kafelk/glazur
  { pattern: /kakel|plattsättning|klinker|til(?:e|ing)|płytk|kafelk|glazur/i, key: "tiling" },
  // Demolition — SV: rivning/riva, EN: demo/demolition, PL: rozbiórk/wyburz/kuci
  { pattern: /rivning|riva|demol|rozbiórk|wyburz|kuci/i, key: "demolition" },
  // Spackling — SV: spackling/spackel/spackla, EN: spackl/plaster/skim, PL: szpachlow/gładź
  { pattern: /spackl|plaster|skim\s*coat|szpachlow|gładź/i, key: "spackling" },
  // Sanding — SV: slipning/slipa, EN: sand, PL: szlifowani/szlifować
  { pattern: /slipning|slipa|sand(?:ing)?|szlifow/i, key: "sanding" },
  // Carpentry — SV: snickeri/snickare/bygg, EN: carpent/woodwork, PL: stolark/ciesiel
  { pattern: /snickeri|snickare|carpent|woodwork|stolark|ciesiel/i, key: "carpentry" },
  // Electrical — SV: el/elektriker, EN: electri, PL: elektry/elektryczn
  { pattern: /\bel\b|elektriker|elinstallation|electri|elektry/i, key: "electrical" },
  // Plumbing — SV: vvs/rör/rörmokare, EN: plumb, PL: hydrauli/rur/instalacj.*wod
  { pattern: /\bvvs\b|rör|rörmokare|plumb|hydrauli|instalacj.*wod/i, key: "plumbing" },
];

export function detectRecipeKey(task: {
  cost_center?: string | null;
  title: string;
}): RecipeKey | null {
  const wt = detectWorkType(task);
  if (wt && MATERIAL_RECIPE_TYPES.has(wt)) return wt as RecipeKey;
  return null;
}

export function detectWorkType(task: {
  cost_center?: string | null;
  title: string;
}): WorkType | null {
  if (task.cost_center) {
    const key = COST_CENTER_MAP[task.cost_center.toLowerCase()];
    if (key) return key;
  }
  for (const { pattern, key } of TITLE_KEYWORDS) {
    if (pattern.test(task.title)) return key;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/** Round to nearest 0.5 */
function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function recipePainting(
  room: RecipeRoom,
  settings: RecipeEstimationSettings
): MaterialSuggestion | null {
  const wallArea = computeWallAreaSqm(room);
  if (!wallArea || wallArea <= 0) return null;

  const nonPaintable = room.dimensions?.non_paintable_area_sqm ?? 0;
  const paintable = Math.max(0, wallArea - nonPaintable);
  if (paintable <= 0) return null;

  const quantity = Math.ceil(
    (paintable / settings.paint_coverage_sqm_per_liter) * settings.paint_coats
  );
  const totalCost = Math.round(quantity * settings.paint_price_per_liter);
  const estimatedHours = roundHalf(paintable / settings.paint_sqm_per_hour);
  const formula = `${paintable.toFixed(1)} m² / ${settings.paint_coverage_sqm_per_liter} × ${settings.paint_coats} = ${quantity}L`;

  return {
    recipeKey: "painting",
    nameKey: "materialRecipes.wallPaint",
    nameFallback: "Wall paint",
    quantity,
    unit: "L",
    unitPrice: settings.paint_price_per_liter,
    totalCost,
    estimatedHours,
    workAreaSqm: paintable,
    formula,
    coverage: settings.paint_coverage_sqm_per_liter,
    coats: settings.paint_coats,
  };
}

function recipeCeilingPaint(
  room: RecipeRoom,
  settings: RecipeEstimationSettings
): MaterialSuggestion | null {
  const ceilingArea = computeFloorAreaSqm(room); // ceiling = floor area
  if (!ceilingArea || ceilingArea <= 0) return null;

  const quantity = Math.ceil(
    (ceilingArea / settings.paint_coverage_sqm_per_liter) * settings.paint_coats
  );
  const totalCost = Math.round(quantity * settings.paint_price_per_liter);
  const estimatedHours = roundHalf(ceilingArea / settings.paint_sqm_per_hour);
  const formula = `${ceilingArea.toFixed(1)} m² / ${settings.paint_coverage_sqm_per_liter} × ${settings.paint_coats} = ${quantity}L`;

  return {
    recipeKey: "painting",
    nameKey: "materialRecipes.ceilingPaint",
    nameFallback: "Ceiling paint",
    quantity,
    unit: "L",
    unitPrice: settings.paint_price_per_liter,
    totalCost,
    estimatedHours,
    workAreaSqm: ceilingArea,
    formula,
    coverage: settings.paint_coverage_sqm_per_liter,
    coats: settings.paint_coats,
  };
}

function recipeFlooring(
  room: RecipeRoom,
  settings: RecipeEstimationSettings
): MaterialSuggestion | null {
  const floorArea = computeFloorAreaSqm(room);
  if (!floorArea || floorArea <= 0) return null;

  const quantity = Math.round(floorArea * 1.1 * 10) / 10;
  const totalCost = Math.round(quantity * settings.floor_price_per_sqm);
  const estimatedHours = roundHalf(floorArea / settings.floor_sqm_per_hour);
  const formula = `${floorArea.toFixed(1)} m² × 1.10 = ${quantity} m²`;

  return {
    recipeKey: "flooring",
    nameKey: "materialRecipes.floorMaterial",
    nameFallback: "Floor material",
    quantity,
    unit: "m²",
    unitPrice: settings.floor_price_per_sqm,
    totalCost,
    estimatedHours,
    workAreaSqm: floorArea,
    formula,
    wasteFactor: 1.1,
  };
}

function recipeTiling(
  room: RecipeRoom,
  settings: RecipeEstimationSettings
): MaterialSuggestion | null {
  const wallArea = computeWallAreaSqm(room);
  if (!wallArea || wallArea <= 0) return null;

  const quantity = Math.round(wallArea * 1.1 * 10) / 10;
  const totalCost = Math.round(quantity * settings.tile_price_per_sqm);
  const estimatedHours = roundHalf(wallArea / settings.tile_sqm_per_hour);
  const formula = `${wallArea.toFixed(1)} m² × 1.10 = ${quantity} m²`;

  return {
    recipeKey: "tiling",
    nameKey: "materialRecipes.tiles",
    nameFallback: "Tiles",
    quantity,
    unit: "m²",
    unitPrice: settings.tile_price_per_sqm,
    totalCost,
    estimatedHours,
    workAreaSqm: wallArea,
    formula,
    wasteFactor: 1.1,
  };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function suggestMaterials(
  task: { cost_center?: string | null; title: string },
  room: RecipeRoom,
  settings?: Partial<RecipeEstimationSettings>
): MaterialSuggestion[] {
  const recipeKey = detectRecipeKey(task);
  if (!recipeKey) return [];

  const merged: RecipeEstimationSettings = {
    ...DEFAULT_ESTIMATION,
    ...settings,
  };

  const fns: Record<
    RecipeKey,
    (room: RecipeRoom, settings: RecipeEstimationSettings) => MaterialSuggestion | null
  > = {
    painting: (r, s) => recipePainting(r, s),
    flooring: (r, s) => recipeFlooring(r, s),
    tiling: (r, s) => recipeTiling(r, s),
  };

  const result = fns[recipeKey](room, merged);
  return result ? [result] : [];
}

// ---------------------------------------------------------------------------
// Summary formatter
// ---------------------------------------------------------------------------

/**
 * Suggest materials for a task across multiple rooms.
 * Sums area/quantities from all rooms into a single suggestion.
 */
export function suggestMaterialsMultiRoom(
  task: { cost_center?: string | null; title: string },
  rooms: RecipeRoom[],
  settings?: Partial<RecipeEstimationSettings>
): MaterialSuggestion[] {
  if (rooms.length === 0) return [];
  if (rooms.length === 1) return suggestMaterials(task, rooms[0], settings);

  const recipeKey = detectRecipeKey(task);
  if (!recipeKey) return [];

  const merged: RecipeEstimationSettings = { ...DEFAULT_ESTIMATION, ...settings };
  const fns: Record<RecipeKey, (r: RecipeRoom, s: RecipeEstimationSettings) => MaterialSuggestion | null> = {
    painting: recipePainting,
    flooring: recipeFlooring,
    tiling: recipeTiling,
  };

  // Compute per-room and aggregate
  let totalQty = 0;
  let totalHours = 0;
  let totalArea = 0;
  for (const room of rooms) {
    const result = fns[recipeKey](room, merged);
    if (result) {
      totalQty += result.quantity;
      totalHours += result.estimatedHours;
      totalArea += result.workAreaSqm;
    }
  }

  if (totalQty <= 0) return [];

  const first = fns[recipeKey](rooms[0], merged)!;
  return [{
    recipeKey,
    nameKey: first.nameKey,
    nameFallback: first.nameFallback,
    quantity: recipeKey === "painting" ? Math.ceil(totalQty) : Math.round(totalQty * 10) / 10,
    unit: first.unit,
    unitPrice: first.unitPrice,
    totalCost: Math.round(totalQty * first.unitPrice),
    estimatedHours: roundHalf(totalHours),
    workAreaSqm: Math.round(totalArea * 10) / 10,
    formula: `${rooms.length} rum, ${totalArea.toFixed(1)} m² totalt`,
    coverage: first.coverage,
    coats: first.coats,
    wasteFactor: first.wasteFactor,
  }];
}

// ---------------------------------------------------------------------------
// Unified estimation — labor always, material when recipe exists
// ---------------------------------------------------------------------------

export function estimateTaskMultiRoom(
  task: { cost_center?: string | null; title: string },
  rooms: RecipeRoom[],
  settings?: Partial<RecipeEstimationSettings>,
  options?: EstimationOptions
): TaskEstimationResult | null {
  const workType = detectWorkType(task);
  if (!workType) return null;
  if (rooms.length === 0) return null;

  const merged: RecipeEstimationSettings = { ...DEFAULT_ESTIMATION, ...settings };
  const areaType = WORK_TYPE_AREA[workType];
  const rateKey = WORK_TYPE_RATE_KEY[workType];
  const rate = merged[rateKey] as number;

  // Compute total area across all rooms
  const areaFn = areaType === "wall" ? computeWallAreaSqm : computeFloorAreaSqm;
  let totalArea = 0;
  for (const room of rooms) {
    const area = areaFn(room);
    if (area && area > 0) totalArea += area;
  }

  if (totalArea <= 0) return null;

  let estimatedHours = roundHalf(totalArea / rate);

  // Material estimation only for full-recipe types
  let material: MaterialSuggestion | null = null;
  const extraMaterials: MaterialSuggestion[] = [];
  if (MATERIAL_RECIPE_TYPES.has(workType)) {
    const suggestions = suggestMaterialsMultiRoom(task, rooms, settings);
    if (suggestions.length > 0) material = suggestions[0];
  }

  // Ceiling paint — adds extra material + extra hours when painting
  if (workType === "painting" && options?.includeCeiling) {
    let ceilingQty = 0;
    let ceilingArea = 0;
    let ceilingHours = 0;
    for (const room of rooms) {
      const c = recipeCeilingPaint(room, merged);
      if (c) {
        ceilingQty += c.quantity;
        ceilingArea += c.workAreaSqm;
        ceilingHours += c.estimatedHours;
      }
    }
    if (ceilingQty > 0) {
      extraMaterials.push({
        recipeKey: "painting",
        nameKey: "materialRecipes.ceilingPaint",
        nameFallback: "Ceiling paint",
        quantity: Math.ceil(ceilingQty),
        unit: "L",
        unitPrice: merged.paint_price_per_liter,
        totalCost: Math.round(ceilingQty * merged.paint_price_per_liter),
        estimatedHours: roundHalf(ceilingHours),
        workAreaSqm: Math.round(ceilingArea * 10) / 10,
        formula: `${ceilingArea.toFixed(1)} m² tak`,
      });
      estimatedHours = roundHalf(estimatedHours + ceilingHours);
    }
  }

  return {
    workType,
    areaType,
    totalAreaSqm: Math.round(totalArea * 10) / 10,
    productivityRate: rate,
    laborEstimated: true,
    estimatedHours,
    materialEstimated: material !== null,
    material,
    extraMaterials,
  };
}

// ---------------------------------------------------------------------------
// Work type display labels (i18n keys)
// ---------------------------------------------------------------------------

export const ALL_WORK_TYPES: WorkType[] = [
  "painting", "flooring", "tiling", "demolition",
  "spackling", "sanding", "carpentry", "electrical", "plumbing",
];

export const WORK_TYPE_LABEL_KEYS: Record<WorkType, string> = {
  painting: "workTypes.painting",
  flooring: "workTypes.flooring",
  tiling: "workTypes.tiling",
  demolition: "workTypes.demolition",
  spackling: "workTypes.spackling",
  sanding: "workTypes.sanding",
  carpentry: "workTypes.carpentry",
  electrical: "workTypes.electrical",
  plumbing: "workTypes.plumbing",
};

export function formatSuggestionSummary(suggestions: MaterialSuggestion[]): string {
  if (suggestions.length === 0) return "";
  const s = suggestions[0];
  const nameShort =
    s.recipeKey === "painting"
      ? "färg"
      : s.recipeKey === "flooring"
        ? "golv"
        : "kakel";
  return `~${s.quantity}${s.unit} ${nameShort}`;
}
