import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, PenTool, CheckSquare, ShoppingCart, MoreHorizontal, FolderOpen, PiggyBank, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isTabBlocked: (tab: string) => boolean;
}

const PRIMARY_TABS = [
  { tab: "overview", icon: LayoutDashboard, labelKey: "nav.mobileNav.overview" },
  { tab: "spaceplanner", icon: PenTool, labelKey: "nav.mobileNav.plans" },
  { tab: "tasks", icon: CheckSquare, labelKey: "nav.mobileNav.tasks" },
  { tab: "purchases", icon: ShoppingCart, labelKey: "nav.mobileNav.purchases" },
] as const;

const MORE_TABS = [
  { tab: "files", icon: FolderOpen, labelKey: "nav.mobileNav.files" },
  { tab: "budget", icon: PiggyBank, labelKey: "nav.mobileNav.budget" },
  { tab: "team", icon: Users, labelKey: "nav.mobileNav.team" },
  { tab: "feed", icon: MessageSquare, labelKey: "nav.mobileNav.feed" },
] as const;

export function MobileBottomNav({ activeTab, onTabChange, isTabBlocked }: MobileBottomNavProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_TABS.some((m) => m.tab === activeTab || (m.tab === "feed" && activeTab === "overview"));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around h-16">
          {PRIMARY_TABS.map(({ tab, icon: Icon, labelKey }) => {
            if (isTabBlocked(tab)) return null;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
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
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="pb-2">
            <SheetTitle>{t("nav.mobileNav.more")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            {MORE_TABS.map(({ tab, icon: Icon, labelKey }) => {
              if (isTabBlocked(tab)) return null;
              const handleClick = () => {
                setMoreOpen(false);
                if (tab === "feed") {
                  onTabChange("overview");
                } else {
                  onTabChange(tab);
                }
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
