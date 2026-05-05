import type { DashboardStats } from "@/hooks/useDashboardData";

interface StatStripProps {
  stats: DashboardStats;
}

interface StatProps {
  label: string;
  value: string | number;
  unit?: string;
  sub: string;
  last?: boolean;
}

function Stat({ label, value, unit, sub, last }: StatProps) {
  return (
    <div style={{
      padding: "18px 20px",
      borderRight: last ? "none" : "1px solid var(--hairline)",
    }}>
      <div className="mono" style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--fg-subtle)",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="font-display tnum" style={{
          fontSize: 30,
          fontWeight: 400,
          letterSpacing: "-0.022em",
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span className="mono" style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
}

export function StatStrip({ stats }: StatStripProps) {
  const budgetTkr = Math.round(stats.budgetRemaining / 1000);
  const totalTkr = Math.round(stats.totalBudget / 1000);

  return (
    <div className="rf-card grid grid-cols-2 md:grid-cols-4 mb-6 md:mb-8 overflow-hidden">
      <Stat
        label="Aktiva projekt"
        value={stats.activeProjects}
        sub={`${stats.activeProjects} pågår`}
      />
      <Stat
        label="Arbeten denna vecka"
        value={stats.tasksThisWeek}
        sub="att slutföra"
      />
      <Stat
        label="Budget kvar"
        value={budgetTkr}
        unit="tkr"
        sub={`av ${totalTkr} tkr total`}
      />
      <Stat
        label="Inköp att godkänna"
        value={stats.pendingPurchases}
        unit="st"
        sub=""
        last
      />
    </div>
  );
}
