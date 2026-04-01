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
  | "context"        // named context (e.g. "budgetTab", "firstProject")
  | "taskCount"      // numeric comparison: "0", "<3", ">10"
  | "hasBudget"      // "true" or "false"
  | "hasDeadline"    // "true" or "false"
  | "hasTeam"        // "true" or "false"
  | "completionPct"; // numeric comparison: "<25", ">75"

export interface TipTrigger {
  type: TipTriggerType;
  value: string;        // regex string for taskTitle, exact match for others
}

export interface ContextualTip {
  id: string;
  triggers: TipTrigger[];    // ANY trigger match = show tip (unless matchAll is true)
  matchAll?: boolean;        // if true, ALL triggers must match
  role: TipRole;
  titleKey: string;          // i18n key
  bodyKey: string;           // i18n key
  category: string;          // for grouping/filtering
  priority: number;          // higher = shown first (0-10)
  dismissible: boolean;
  linkKey?: string;          // i18n key for "Read more" link text
  linkUrl?: string;          // external URL or internal route
  actionKey?: string;        // i18n key for action button text
  actionTarget?: string;     // navigation target: "tasks", "budget", "settings", "team", "chat"
  icon?: "rocket" | "target" | "users" | "calendar" | "piggybank" | "zap"; // optional icon override
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

  // ====================================================================
  // NEXT STEP TIPS — contextual onboarding based on project state
  // ====================================================================

  // -- Homeowner: Planning phase --
  {
    id: "next_add_tasks",
    triggers: [
      { type: "projectStatus", value: "planning" },
      { type: "taskCount", value: "0" },
    ],
    matchAll: true,
    role: "homeowner",
    titleKey: "nextSteps.addTasks.title",
    bodyKey: "nextSteps.addTasks.body",
    category: "nextStep",
    priority: 9,
    dismissible: true,
    actionKey: "nextSteps.addTasks.action",
    actionTarget: "tasks",
    icon: "rocket",
  },
  {
    id: "next_set_deadline",
    triggers: [
      { type: "hasDeadline", value: "false" },
      { type: "taskCount", value: ">0" },
    ],
    matchAll: true,
    role: "all",
    titleKey: "nextSteps.setDeadline.title",
    bodyKey: "nextSteps.setDeadline.body",
    category: "nextStep",
    priority: 7,
    dismissible: true,
    actionKey: "nextSteps.setDeadline.action",
    actionTarget: "settings",
    icon: "calendar",
  },
  {
    id: "next_invite_builder",
    triggers: [
      { type: "projectStatus", value: "planning" },
      { type: "taskCount", value: ">2" },
    ],
    matchAll: true,
    role: "homeowner",
    titleKey: "nextSteps.inviteBuilder.title",
    bodyKey: "nextSteps.inviteBuilder.body",
    category: "nextStep",
    priority: 8,
    dismissible: true,
    icon: "users",
    actionKey: "nextSteps.inviteBuilder.action",
  },
  {
    id: "next_set_budget",
    triggers: [
      { type: "hasBudget", value: "false" },
      { type: "projectStatus", value: "active" },
    ],
    matchAll: true,
    role: "all",
    titleKey: "nextSteps.setBudget.title",
    bodyKey: "nextSteps.setBudget.body",
    category: "nextStep",
    priority: 7,
    dismissible: true,
    actionKey: "nextSteps.setBudget.action",
    actionTarget: "budget",
    icon: "piggybank",
  },

  // -- Homeowner: Active phase --
  {
    id: "next_review_budget",
    triggers: [
      { type: "projectStatus", value: "active" },
      { type: "hasBudget", value: "true" },
      { type: "completionPct", value: ">50" },
    ],
    matchAll: true,
    role: "homeowner",
    titleKey: "nextSteps.reviewBudget.title",
    bodyKey: "nextSteps.reviewBudget.body",
    category: "nextStep",
    priority: 5,
    dismissible: true,
    actionKey: "nextSteps.reviewBudget.action",
    actionTarget: "budget",
    icon: "piggybank",
  },

  // -- Builder: Planning phase --
  {
    id: "next_builder_add_tasks",
    triggers: [
      { type: "projectStatus", value: "planning" },
      { type: "taskCount", value: "0" },
    ],
    matchAll: true,
    role: "contractor",
    titleKey: "nextSteps.builderAddTasks.title",
    bodyKey: "nextSteps.builderAddTasks.body",
    category: "nextStep",
    priority: 9,
    dismissible: true,
    actionKey: "nextSteps.builderAddTasks.action",
    actionTarget: "tasks",
    icon: "rocket",
  },
  {
    id: "next_invite_customer",
    triggers: [
      { type: "projectStatus", value: "planning" },
      { type: "taskCount", value: ">0" },
      { type: "hasTeam", value: "false" },
    ],
    matchAll: true,
    role: "contractor",
    titleKey: "nextSteps.inviteCustomer.title",
    bodyKey: "nextSteps.inviteCustomer.body",
    category: "nextStep",
    priority: 8,
    dismissible: true,
    icon: "users",
  },

  // -- Builder: Active phase --
  {
    id: "next_update_progress",
    triggers: [
      { type: "projectStatus", value: "active" },
      { type: "completionPct", value: "<100" },
      { type: "taskCount", value: ">0" },
    ],
    matchAll: true,
    role: "contractor",
    titleKey: "nextSteps.updateProgress.title",
    bodyKey: "nextSteps.updateProgress.body",
    category: "nextStep",
    priority: 4,
    dismissible: true,
    actionKey: "nextSteps.updateProgress.action",
    actionTarget: "tasks",
    icon: "target",
  },
  {
    id: "next_send_update",
    triggers: [
      { type: "projectStatus", value: "active" },
      { type: "hasTeam", value: "true" },
    ],
    matchAll: true,
    role: "contractor",
    titleKey: "nextSteps.sendUpdate.title",
    bodyKey: "nextSteps.sendUpdate.body",
    category: "nextStep",
    priority: 3,
    dismissible: true,
    actionKey: "nextSteps.sendUpdate.action",
    actionTarget: "chat",
    icon: "zap",
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
  showTaxDeduction?: boolean;
  // Extended context for smart next-step tips
  taskCount?: number;
  completionPct?: number;          // 0-100
  hasBudget?: boolean;
  hasDeadline?: boolean;
  hasTeam?: boolean;
}

function matchesNumericComparison(value: number | undefined, comparison: string): boolean {
  if (value === undefined) return false;
  if (comparison.startsWith("<")) return value < Number(comparison.slice(1));
  if (comparison.startsWith(">")) return value > Number(comparison.slice(1));
  return value === Number(comparison);
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
    case "taskCount":
      return matchesNumericComparison(ctx.taskCount, trigger.value);
    case "completionPct":
      return matchesNumericComparison(ctx.completionPct, trigger.value);
    case "hasBudget":
      return ctx.hasBudget !== undefined && String(ctx.hasBudget) === trigger.value;
    case "hasDeadline":
      return ctx.hasDeadline !== undefined && String(ctx.hasDeadline) === trigger.value;
    case "hasTeam":
      return ctx.hasTeam !== undefined && String(ctx.hasTeam) === trigger.value;
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
      // Hide tax/ROT tips for non-Swedish projects
      if (tip.category === "tax" && ctx.showTaxDeduction === false) return false;
      // matchAll: ALL triggers must match. Otherwise: ANY trigger match = show tip
      return tip.matchAll
        ? tip.triggers.every((trigger) => matchesTrigger(trigger, ctx))
        : tip.triggers.some((trigger) => matchesTrigger(trigger, ctx));
    })
    .sort((a, b) => b.priority - a.priority);
}
