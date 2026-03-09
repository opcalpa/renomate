/**
 * Contextual Tips Engine
 *
 * Tips are matched against the current context (task title, work type,
 * room type, project status, user role) and surfaced inline in the UI.
 *
 * Each tip has:
 * - triggers: conditions that must match for the tip to appear
 * - role: which user type sees it (homeowner, contractor, or both)
 * - i18n keys for title + body
 * - dismissible: user can hide it permanently
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TipRole = "homeowner" | "contractor" | "all";

export type TipTriggerType =
  | "workType"       // matches detectWorkType result
  | "taskTitle"      // regex against task title
  | "roomType"       // room type string match
  | "projectStatus"  // project status match
  | "costCenter"     // cost_center field match
  | "context";       // named context (e.g. "budgetTab", "firstProject")

export interface TipTrigger {
  type: TipTriggerType;
  value: string;        // regex string for taskTitle, exact match for others
}

export interface ContextualTip {
  id: string;
  triggers: TipTrigger[];    // ANY trigger match = show tip
  role: TipRole;
  titleKey: string;          // i18n key
  bodyKey: string;           // i18n key
  category: string;          // for grouping/filtering
  priority: number;          // higher = shown first (0-10)
  dismissible: boolean;
  linkKey?: string;          // i18n key for "Read more" link text
  linkUrl?: string;          // external URL or internal route
}

// ---------------------------------------------------------------------------
// Tips Database
// ---------------------------------------------------------------------------

export const CONTEXTUAL_TIPS: ContextualTip[] = [
  // ---- Building permits & structural work ----
  {
    id: "bearing_wall",
    triggers: [
      { type: "taskTitle", value: "bärande|bärvägg|bearing.wall|load.bearing|stödmur" },
      { type: "taskTitle", value: "riva.*vägg|ta.*bort.*vägg|ny.*öppning|wall.*opening" },
    ],
    role: "all",
    titleKey: "contextTips.bearingWall.title",
    bodyKey: "contextTips.bearingWall.body",
    category: "permits",
    priority: 9,
    dismissible: true,
  },
  {
    id: "building_permit_general",
    triggers: [
      { type: "taskTitle", value: "tillbyggnad|extension|utbyggnad|fasad.*ändring" },
      { type: "taskTitle", value: "balkong|altan.*tak|carport|garage" },
    ],
    role: "all",
    titleKey: "contextTips.buildingPermit.title",
    bodyKey: "contextTips.buildingPermit.body",
    category: "permits",
    priority: 8,
    dismissible: true,
  },

  // ---- Wet rooms / Bathroom ----
  {
    id: "wet_room_certification",
    triggers: [
      { type: "roomType", value: "bathroom" },
      { type: "costCenter", value: "bathroom" },
      { type: "workType", value: "tiling" },
      { type: "taskTitle", value: "badrum|bathroom|tätskikt|waterproof|kakel.*bad|dusch" },
    ],
    role: "all",
    titleKey: "contextTips.wetRoom.title",
    bodyKey: "contextTips.wetRoom.body",
    category: "certification",
    priority: 8,
    dismissible: true,
  },

  // ---- Electrical ----
  {
    id: "electrical_certification",
    triggers: [
      { type: "workType", value: "electrical" },
      { type: "costCenter", value: "electrical" },
      { type: "taskTitle", value: "\\bel\\b|elinstallation|elektriker|elcentral|electrical" },
    ],
    role: "all",
    titleKey: "contextTips.electrical.title",
    bodyKey: "contextTips.electrical.body",
    category: "certification",
    priority: 8,
    dismissible: true,
  },

  // ---- Plumbing ----
  {
    id: "plumbing_certification",
    triggers: [
      { type: "workType", value: "plumbing" },
      { type: "costCenter", value: "plumbing" },
      { type: "taskTitle", value: "\\bvvs\\b|rör|rörmokare|avlopp|vatten.*ledning|plumb" },
    ],
    role: "all",
    titleKey: "contextTips.plumbing.title",
    bodyKey: "contextTips.plumbing.body",
    category: "certification",
    priority: 7,
    dismissible: true,
  },

  // ---- ROT deduction ----
  {
    id: "rot_deduction",
    triggers: [
      { type: "context", value: "quoteCreated" },
      { type: "context", value: "budgetTab" },
    ],
    role: "homeowner",
    titleKey: "contextTips.rot.title",
    bodyKey: "contextTips.rot.body",
    category: "tax",
    priority: 6,
    dismissible: true,
    linkUrl: "https://www.skatteverket.se/privat/fastigheterochbostad/rotochrutarbete.4.2e56d4ba1202f9501680006245.html",
    linkKey: "contextTips.rot.link",
  },
  {
    id: "rot_builder_reminder",
    triggers: [
      { type: "context", value: "quoteCreated" },
      { type: "context", value: "invoiceCreated" },
    ],
    role: "contractor",
    titleKey: "contextTips.rotBuilder.title",
    bodyKey: "contextTips.rotBuilder.body",
    category: "tax",
    priority: 6,
    dismissible: true,
  },

  // ---- Planning phase ----
  {
    id: "planning_checklist",
    triggers: [
      { type: "projectStatus", value: "planning" },
    ],
    role: "homeowner",
    titleKey: "contextTips.planningChecklist.title",
    bodyKey: "contextTips.planningChecklist.body",
    category: "planning",
    priority: 5,
    dismissible: true,
  },
  {
    id: "planning_builder",
    triggers: [
      { type: "projectStatus", value: "planning" },
    ],
    role: "contractor",
    titleKey: "contextTips.planningBuilder.title",
    bodyKey: "contextTips.planningBuilder.body",
    category: "planning",
    priority: 4,
    dismissible: true,
  },

  // ---- Quotes ----
  {
    id: "compare_quotes",
    triggers: [
      { type: "context", value: "quoteReceived" },
    ],
    role: "homeowner",
    titleKey: "contextTips.compareQuotes.title",
    bodyKey: "contextTips.compareQuotes.body",
    category: "contracts",
    priority: 7,
    dismissible: true,
  },
  {
    id: "quote_specificity",
    triggers: [
      { type: "context", value: "quoteCreated" },
    ],
    role: "contractor",
    titleKey: "contextTips.quoteSpecificity.title",
    bodyKey: "contextTips.quoteSpecificity.body",
    category: "contracts",
    priority: 5,
    dismissible: true,
  },

  // ---- Condo specific ----
  {
    id: "condo_approval",
    triggers: [
      { type: "taskTitle", value: "brf|bostadsrätt|förening|stambyte|condo" },
      { type: "taskTitle", value: "badrum.*brf|brf.*badrum" },
    ],
    role: "all",
    titleKey: "contextTips.condo.title",
    bodyKey: "contextTips.condo.body",
    category: "permits",
    priority: 7,
    dismissible: true,
  },

  // ---- Painting ----
  {
    id: "painting_prep",
    triggers: [
      { type: "workType", value: "painting" },
      { type: "costCenter", value: "painting" },
    ],
    role: "homeowner",
    titleKey: "contextTips.paintingPrep.title",
    bodyKey: "contextTips.paintingPrep.body",
    category: "tips",
    priority: 3,
    dismissible: true,
  },

  // ---- First project onboarding ----
  {
    id: "first_project",
    triggers: [
      { type: "context", value: "firstProject" },
    ],
    role: "all",
    titleKey: "contextTips.firstProject.title",
    bodyKey: "contextTips.firstProject.body",
    category: "onboarding",
    priority: 10,
    dismissible: true,
  },

  // ---- Insurance ----
  {
    id: "insurance_check",
    triggers: [
      { type: "projectStatus", value: "active" },
      { type: "context", value: "projectActivated" },
    ],
    role: "homeowner",
    titleKey: "contextTips.insurance.title",
    bodyKey: "contextTips.insurance.body",
    category: "insurance",
    priority: 5,
    dismissible: true,
  },
];

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

export interface TipContext {
  taskTitle?: string;
  workType?: string | null;
  roomType?: string | null;
  costCenter?: string | null;
  projectStatus?: string | null;
  contexts?: string[];             // named contexts like "budgetTab", "firstProject"
  userRole?: "homeowner" | "contractor" | null;
}

function matchesTrigger(trigger: TipTrigger, ctx: TipContext): boolean {
  switch (trigger.type) {
    case "taskTitle":
      if (!ctx.taskTitle) return false;
      try {
        return new RegExp(trigger.value, "i").test(ctx.taskTitle);
      } catch {
        return false;
      }
    case "workType":
      return ctx.workType === trigger.value;
    case "roomType":
      return ctx.roomType === trigger.value;
    case "costCenter":
      return ctx.costCenter?.toLowerCase() === trigger.value.toLowerCase();
    case "projectStatus":
      return ctx.projectStatus === trigger.value;
    case "context":
      return ctx.contexts?.includes(trigger.value) ?? false;
    default:
      return false;
  }
}

/**
 * Find all tips matching the given context, sorted by priority.
 * Filters by user role and excluded (dismissed) tip IDs.
 */
export function findMatchingTips(
  ctx: TipContext,
  dismissedIds: Set<string> = new Set()
): ContextualTip[] {
  return CONTEXTUAL_TIPS
    .filter((tip) => {
      // Skip dismissed
      if (dismissedIds.has(tip.id)) return false;
      // Role filter
      if (tip.role !== "all" && ctx.userRole && tip.role !== ctx.userRole) return false;
      // At least one trigger must match
      return tip.triggers.some((trigger) => matchesTrigger(trigger, ctx));
    })
    .sort((a, b) => b.priority - a.priority);
}
