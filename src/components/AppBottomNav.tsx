import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Lightbulb, Sparkles, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppBottomNavProps {
  onProfileClick?: () => void;
}

export function AppBottomNav({ onProfileClick }: AppBottomNavProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/start", icon: Home, label: t("nav.start", "Start") },
    { path: "/tips", icon: Lightbulb, label: t("nav.tips", "Tips") },
    { path: "/changelog", icon: Sparkles, label: t("nav.changelog", "Nyheter") },
    { path: "/feedback", icon: MessageSquare, label: t("nav.feedback", "Kontakt") },
    { path: "/profile", icon: User, label: t("nav.profile", "Profil") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => {
                if (path === "/profile" && onProfileClick) {
                  onProfileClick();
                } else {
                  navigate(path);
                }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {active && <div className="w-4 h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
