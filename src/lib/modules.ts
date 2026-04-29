/**
 * Feature Module Registry
 *
 * Adding a new module:
 *   1. Add an entry to MODULE_REGISTRY below
 *   2. Add i18n keys: modules.<id>.name + modules.<id>.description
 *   3. Reference the module id in tab/section rendering guards
 *
 * Module ids are stable strings stored in user preferences — never rename them.
 */

export interface ModuleDefinition {
  /** Stable key persisted in user preferences */
  id: string;
  /** i18n key for display name */
  labelKey: string;
  /** i18n key for short description */
  descriptionKey: string;
  /** Lucide icon name (rendered by consumer) */
  icon: string;
  /** Which audiences can see this module in settings */
  audience: "contractor" | "homeowner" | "both";
  /** Project-detail tab ids this module controls (tab hidden when module off) */
  tabs: string[];
  /** Start-page section ids this module controls */
  sections: string[];
  /** Nav-level route paths this module controls */
  routes: string[];
  /** Default on/off per profile type */
  defaults: {
    solo: boolean;       // enskild hantverkare
    small: boolean;      // liten firma (2-10)
    company: boolean;    // byggföretag (10+)
    homeowner: boolean;
  };
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ── Lager 2: Onboarding-moduler ──────────────────────────────
  {
    id: "purchases",
    labelKey: "modules.purchases.name",
    descriptionKey: "modules.purchases.description",
    icon: "ShoppingCart",
    audience: "contractor",
    tabs: ["purchases"],
    sections: [],
    routes: [],
    defaults: { solo: true, small: true, company: true, homeowner: false },
  },
  {
    id: "time_tracking",
    labelKey: "modules.timeTracking.name",
    descriptionKey: "modules.timeTracking.description",
    icon: "Clock",
    audience: "contractor",
    tabs: ["timetracking"],
    sections: [],
    routes: [],
    defaults: { solo: false, small: true, company: true, homeowner: false },
  },
  {
    id: "quotes",
    labelKey: "modules.quotes.name",
    descriptionKey: "modules.quotes.description",
    icon: "FileText",
    audience: "contractor",
    tabs: [],
    sections: ["pipeline"],
    routes: ["/quotes/new", "/invoices/new"],
    defaults: { solo: true, small: true, company: true, homeowner: false },
  },
  {
    id: "customer_portal",
    labelKey: "modules.customerPortal.name",
    descriptionKey: "modules.customerPortal.description",
    icon: "Users",
    audience: "contractor",
    tabs: ["customer"],
    sections: [],
    routes: [],
    defaults: { solo: false, small: true, company: true, homeowner: false },
  },
  {
    id: "floor_plan",
    labelKey: "modules.floorPlan.name",
    descriptionKey: "modules.floorPlan.description",
    icon: "PencilRuler",
    audience: "both",
    tabs: [],
    sections: [],
    routes: [],
    defaults: { solo: false, small: false, company: false, homeowner: false },
  },

  // ── Lager 3: Avancerade moduler ──────────────────────────────
  {
    id: "quality_control",
    labelKey: "modules.qualityControl.name",
    descriptionKey: "modules.qualityControl.description",
    icon: "ClipboardCheck",
    audience: "contractor",
    tabs: ["inspections"],
    sections: [],
    routes: [],
    defaults: { solo: false, small: false, company: true, homeowner: false },
  },
  {
    id: "attendance",
    labelKey: "modules.attendance.name",
    descriptionKey: "modules.attendance.description",
    icon: "QrCode",
    audience: "contractor",
    tabs: [],
    sections: ["attendance"],
    routes: [],
    defaults: { solo: false, small: false, company: true, homeowner: false },
  },
  {
    id: "resource_planning",
    labelKey: "modules.resourcePlanning.name",
    descriptionKey: "modules.resourcePlanning.description",
    icon: "CalendarRange",
    audience: "contractor",
    tabs: [],
    sections: ["resource_planning"],
    routes: [],
    defaults: { solo: false, small: false, company: true, homeowner: false },
  },
  {
    id: "client_registry",
    labelKey: "modules.clientRegistry.name",
    descriptionKey: "modules.clientRegistry.description",
    icon: "Contact",
    audience: "contractor",
    tabs: [],
    sections: [],
    routes: ["/clients"],
    defaults: { solo: false, small: true, company: true, homeowner: false },
  },
  {
    id: "financial_analysis",
    labelKey: "modules.financialAnalysis.name",
    descriptionKey: "modules.financialAnalysis.description",
    icon: "TrendingUp",
    audience: "contractor",
    tabs: [],
    sections: ["financial_analysis"],
    routes: [],
    defaults: { solo: false, small: true, company: true, homeowner: false },
  },
];

/** Lookup helpers */
export const MODULE_MAP = new Map(MODULE_REGISTRY.map((m) => [m.id, m]));

/** Get all module ids that control a given project tab */
export function modulesForTab(tabId: string): string[] {
  return MODULE_REGISTRY.filter((m) => m.tabs.includes(tabId)).map((m) => m.id);
}

/** Get all module ids that control a given start-page section */
export function modulesForSection(sectionId: string): string[] {
  return MODULE_REGISTRY.filter((m) => m.sections.includes(sectionId)).map((m) => m.id);
}

/** Get all module ids that control a given route */
export function modulesForRoute(route: string): string[] {
  return MODULE_REGISTRY.filter((m) => m.routes.includes(route)).map((m) => m.id);
}

export type ProfileSize = "solo" | "small" | "company" | "homeowner";

/** Return default enabled module ids for a profile type */
export function defaultModulesForProfile(size: ProfileSize): string[] {
  return MODULE_REGISTRY.filter((m) => m.defaults[size]).map((m) => m.id);
}
