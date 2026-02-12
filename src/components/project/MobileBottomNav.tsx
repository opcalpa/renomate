import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, PenTool, CheckSquare, ShoppingCart, MoreHorizontal, FolderOpen, PiggyBank, Users, MessageSquare, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TabConfig {
  tab: string;
  icon: React.ElementType;
  labelKey: string;
  /** For tabs that should navigate to a different activeTab value */
  navigateTo?: string;
  /** Sub-tab to activate when navigating */
  subTab?: string;
}

interface MobileBottomNavProps {
  activeTab: string;
  activeSubTab?: string | null;
  onTabChange: (tab: string, subTab?: string | null) => void;
  isTabBlocked: (tab: string) => boolean;
  userRole?: "owner" | "editor" | "viewer" | "client";
}

const STORAGE_KEY = "renomate_show_all_tabs";

const DEFAULT_PRIMARY: TabConfig[] = [
  { tab: "overview", icon: LayoutDashboard, labelKey: "nav.mobileNav.overview" },
  { tab: "spaceplanner", icon: PenTool, labelKey: "nav.mobileNav.plans" },
  { tab: "tasks", icon: CheckSquare, labelKey: "nav.mobileNav.tasks" },
  { tab: "purchases", icon: ShoppingCart, labelKey: "nav.mobileNav.purchases" },
];

const CLIENT_PRIMARY: TabConfig[] = [
  { tab: "overview", icon: LayoutDashboard, labelKey: "nav.mobileNav.overview" },
  { tab: "files", icon: ImageIcon, labelKey: "nav.mobileNav.photos" },
  { tab: "feed", icon: MessageSquare, labelKey: "nav.mobileNav.chat", navigateTo: "overview", subTab: "feed" },
  { tab: "budget", icon: PiggyBank, labelKey: "nav.mobileNav.budget" },
];

const ALL_TABS: TabConfig[] = [
  { tab: "overview", icon: LayoutDashboard, labelKey: "nav.mobileNav.overview" },
  { tab: "spaceplanner", icon: PenTool, labelKey: "nav.mobileNav.plans" },
  { tab: "tasks", icon: CheckSquare, labelKey: "nav.mobileNav.tasks" },
  { tab: "purchases", icon: ShoppingCart, labelKey: "nav.mobileNav.purchases" },
  { tab: "files", icon: FolderOpen, labelKey: "nav.mobileNav.files" },
  { tab: "budget", icon: PiggyBank, labelKey: "nav.mobileNav.budget" },
  { tab: "team", icon: Users, labelKey: "nav.mobileNav.team" },
  { tab: "feed", icon: MessageSquare, labelKey: "nav.mobileNav.feed" },
];

/** Max tabs shown in the bottom bar before overflow goes to "More" */
const MAX_PRIMARY_TABS = 4;

export function MobileBottomNav({ activeTab, activeSubTab, onTabChange, isTabBlocked, userRole }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showAllTabs, setShowAllTabs] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  const isClientRole = userRole === "client" || userRole === "viewer";

  const toggleShowAll = useCallback((checked: boolean) => {
    setShowAllTabs(checked);
    localStorage.setItem(STORAGE_KEY, String(checked));
  }, []);

  const allPermittedTabs = useMemo(
    () => ALL_TABS.filter((item) => !isTabBlocked(item.tab)),
    [isTabBlocked],
  );

  const primaryTabs = useMemo(() => {
    if (isClientRole && showAllTabs) {
      return allPermittedTabs.slice(0, MAX_PRIMARY_TABS);
    }
    const tabs = isClientRole ? CLIENT_PRIMARY : DEFAULT_PRIMARY;
    return tabs.filter((item) => !isTabBlocked(item.tab));
  }, [isClientRole, showAllTabs, allPermittedTabs, isTabBlocked]);

  const moreTabs = useMemo(() => {
    const primaryTabIds = new Set(primaryTabs.map((p) => p.tab));
    return allPermittedTabs.filter((item) => !primaryTabIds.has(item.tab));
  }, [primaryTabs, allPermittedTabs]);

  const isMoreActive = moreTabs.some(
    (m) => m.tab === activeTab || (m.tab === "feed" && activeTab === "overview" && activeSubTab === "feed"),
  );

  const getActiveForTab = (tab: string, configSubTab?: string) => {
    if (tab === "feed" || configSubTab === "feed") {
      return activeTab === "overview" && activeSubTab === "feed";
    }
    return activeTab === tab;
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around h-16">
          {primaryTabs.map(({ tab, icon: Icon, labelKey, navigateTo, subTab }) => {
            const active = getActiveForTab(tab, subTab);
            return (
              <button
                key={tab}
                onClick={() => onTabChange(navigateTo || tab, subTab || null)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] flex-1",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t(labelKey)}</span>
              </button>
            );
          })}
          {moreTabs.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[48px] flex-1",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t("nav.mobileNav.more")}</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="pb-2">
            <SheetTitle>{t("nav.mobileNav.more")}</SheetTitle>
          </SheetHeader>

          {isClientRole && (
            <label className="flex items-center justify-between px-4 py-3 border-b cursor-pointer">
              <span className="text-sm text-muted-foreground">
                {t("nav.mobileNav.showAllTabs")}
              </span>
              <Switch checked={showAllTabs} onCheckedChange={toggleShowAll} />
            </label>
          )}

          <div className="flex flex-col">
            {moreTabs.map(({ tab, icon: Icon, labelKey, navigateTo, subTab }) => {
              const handleClick = () => {
                setMoreOpen(false);
                onTabChange(navigateTo || tab, subTab || null);
              };
              return (
                <button
                  key={tab}
                  onClick={handleClick}
                  className="flex items-center gap-3 py-3 px-4 min-h-[48px] rounded-md hover:bg-accent transition-colors text-left"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
