import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { DashboardProject, DashboardStats } from "@/hooks/useDashboardData";
import { CashForecastChart } from "./CashForecastChart";

interface DaySummaryProps {
  stats: DashboardStats;
  projects: DashboardProject[];
}

export function DaySummary({ stats, projects }: DaySummaryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const activeProjects = projects.filter(p => p.status !== "completed" && p.status !== "archived");
  const overdueProjects = activeProjects.filter(p => p.progress < 100 && p.status === "delayed");
  const hasApprovals = stats.pendingPurchases > 0;

  // No summary needed if everything is calm
  if (activeProjects.length === 0) return null;

  return (
    <section className="mb-6 md:mb-8">
      <span className="kicker">{t("dashboard.daySummary.kicker", "Idag")}</span>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {/* Active jobs */}
        <div
          className="rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:shadow-sm transition-all"
          style={{ borderLeftWidth: 3, borderLeftColor: "var(--primary, oklch(52% 0.09 155))" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {t("dashboard.daySummary.activeJobs", "Aktiva projekt")}
          </div>
          <div className="font-display text-2xl font-normal tnum">
            {activeProjects.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.tasksThisWeek} {t("dashboard.daySummary.tasksThisWeek", "arbeten denna vecka")}
          </div>
        </div>

        {/* Approvals needed */}
        {hasApprovals && (
          <div
            className="rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:shadow-sm transition-all"
            style={{ borderLeftWidth: 3, borderLeftColor: "var(--warn, oklch(72% 0.12 75))" }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {t("dashboard.daySummary.approvals", "Att godkänna")}
            </div>
            <div className="font-display text-2xl font-normal tnum">
              {stats.pendingPurchases}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("dashboard.daySummary.purchaseApprovals", "inköp väntar")}
            </div>
          </div>
        )}

        {/* Overdue/delayed */}
        {overdueProjects.length > 0 && (
          <div
            className="rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:shadow-sm transition-all"
            style={{ borderLeftWidth: 3, borderLeftColor: "var(--danger, oklch(58% 0.14 25))" }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {t("dashboard.daySummary.overdue", "Försenade")}
            </div>
            <div className="font-display text-2xl font-normal tnum" style={{ color: "var(--danger, oklch(58% 0.14 25))" }}>
              {overdueProjects.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {overdueProjects.map(p => p.name).join(", ")}
            </div>
          </div>
        )}

        {/* Budget overview */}
        {stats.totalBudget > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {t("dashboard.daySummary.budget", "Budget")}
            </div>
            <div className="font-display text-2xl font-normal tnum">
              {Math.round(stats.budgetRemaining / 1000)}k kr
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("dashboard.daySummary.budgetOf", "av {{total}}k kr", { total: Math.round(stats.totalBudget / 1000) })}
            </div>
          </div>
        )}
      </div>

      {/* Cash forecast chart */}
      <div className="mt-3">
        <CashForecastChart projectIds={projects.map(p => p.id)} />
      </div>
    </section>
  );
}
