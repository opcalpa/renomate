import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DemoViewRole, DemoPhase } from "@/hooks/useDemoPreferences";

interface DemoBannerProps {
  role: DemoViewRole | null;
  phase: DemoPhase;
  onPhaseChange: (phase: DemoPhase) => void;
  onRoleChange: (role: DemoViewRole) => void;
}

const PHASES: { value: DemoPhase; labelKey: string }[] = [
  { value: "planning", labelKey: "demo.phases.planning" },
  { value: "quote_sent", labelKey: "demo.phases.quoteSent" },
  { value: "active", labelKey: "demo.phases.active" },
];

const ROLES: { value: DemoViewRole; labelKey: string }[] = [
  { value: "contractor", labelKey: "demo.roles.builder" },
  { value: "homeowner", labelKey: "demo.roles.homeowner" },
];

export function DemoBanner({ role, phase, onPhaseChange, onRoleChange }: DemoBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const currentPhase = PHASES.find((p) => p.value === phase) ?? PHASES[0];
  const currentRole = ROLES.find((r) => r.value === role) ?? ROLES[0];

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2">
      <div className="flex items-center justify-center gap-x-3 gap-y-1.5 text-sm">
        {/* "Demo" label + role dropdown */}
        <div className="flex items-center gap-1.5 font-medium">
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Demo</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 text-primary-foreground px-2.5 py-0.5 text-xs font-medium hover:bg-primary-foreground/30 transition-colors">
                {t(currentRole.labelKey)}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="center">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => onRoleChange(r.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    role === r.value
                      ? "bg-accent font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {role === r.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {role !== r.value && <span className="w-3.5 shrink-0" />}
                  {t(r.labelKey)}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Phase selector — contractor only */}
        {role === "contractor" && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-full bg-primary-foreground text-primary px-3 py-1 text-xs font-medium hover:bg-primary-foreground/90 transition-colors">
                {t(currentPhase.labelKey)}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="center">
              {PHASES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onPhaseChange(p.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    phase === p.value
                      ? "bg-accent font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {phase === p.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {phase !== p.value && <span className="w-3.5 shrink-0" />}
                  {t(p.labelKey)}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* Sign up CTA */}
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
  );
}
