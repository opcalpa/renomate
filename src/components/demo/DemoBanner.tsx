import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DemoViewRole, DemoPhase } from "@/hooks/useDemoPreferences";

interface DemoBannerProps {
  role: DemoViewRole | null;
  phase: DemoPhase;
  onPhaseChange: (phase: DemoPhase) => void;
  onChangeRole: () => void;
}

const PHASES: { value: DemoPhase; labelKey: string }[] = [
  { value: "planning", labelKey: "demo.phases.planning" },
  { value: "quote_sent", labelKey: "demo.phases.quoteSent" },
  { value: "active", labelKey: "demo.phases.active" },
];

export function DemoBanner({ role, phase, onPhaseChange, onChangeRole }: DemoBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const roleLabel = role === "homeowner"
    ? t("demo.banner.homeowner", "Demo - Homeowner")
    : t("demo.banner.builder", "Demo - Builder");

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        {/* Role label */}
        <div className="flex items-center gap-2 font-medium">
          <BookOpen className="h-4 w-4" />
          <span>{roleLabel}</span>
        </div>

        {/* Phase stepper — contractor only */}
        {role === "contractor" && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {PHASES.map((p, i) => (
              <div key={p.value} className="flex items-center">
                {i > 0 && <ArrowRight className="h-3 w-3 mx-1 opacity-50 shrink-0" />}
                <button
                  onClick={() => onPhaseChange(p.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    phase === p.value
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                  )}
                >
                  {t(p.labelKey)}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            onClick={onChangeRole}
          >
            {t("demo.banner.changeRole", "Change role")}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={() => navigate("/auth")}
          >
            {t("demo.banner.signUp", "Create account")}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
