import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { DashboardProject } from "@/hooks/useDashboardData";

interface ProjectsOpsTableProps {
  projects: DashboardProject[];
}

function chipClass(status: string | null): string {
  if (!status) return "rf-chip";
  if (status === "completed") return "rf-chip chip-muted";
  if (status === "on_hold" || status === "delayed") return "rf-chip chip-warn";
  return "rf-chip chip-primary";
}

function chipLabel(status: string | null, t: (k: string, fb?: string) => string): string {
  if (!status) return t("statuses.unknown", "Okänd");
  const map: Record<string, string> = {
    planning: t("statuses.planning", "Planering"),
    active: t("statuses.active", "Pågående"),
    in_progress: t("statuses.inProgress", "Pågående"),
    on_hold: t("statuses.onHold", "Pausad"),
    delayed: t("statuses.delayed", "Försenad"),
    completed: t("statuses.completed", "Klar"),
  };
  return map[status] || status;
}

export function ProjectsOpsTable({ projects }: ProjectsOpsTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cols = "30px 2fr 110px 1fr 100px 28px";

  return (
    <section>
      {/* Dense table */}
      <div style={{
        border: "1px solid var(--hairline)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div
          className="mono"
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: 12,
            padding: "10px 16px",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--fg-subtle)",
            background: "var(--bg-sunken)",
            borderBottom: "1px solid var(--hairline)",
            fontWeight: 500,
          }}
        >
          <span />
          <span>{t("common.project", "Projekt")}</span>
          <span>{t("common.status", "Status")}</span>
          <span>{t("dashboard.ops.progress", "Framsteg")}</span>
          <span style={{ textAlign: "right" }}>{t("common.budget", "Budget")}</span>
          <span />
        </div>

        {/* Rows */}
        {projects.length === 0 ? (
          <div style={{
            background: "var(--surface)",
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--fg-muted)",
            fontSize: 13,
          }}>
            {t("dashboard.noProjects", "Inga projekt")}
          </div>
        ) : projects.map((p) => {
          const budgetTkr = Math.round(p.totalBudget / 1000);

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: cols,
                gap: 12,
                padding: "11px 16px",
                fontSize: 13,
                alignItems: "center",
                background: "var(--surface)",
                borderBottom: "1px solid var(--hairline)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
            >
              {/* Status dot */}
              <div style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: p.status === "completed" ? "var(--fg-muted)"
                  : p.status === "on_hold" || p.status === "delayed" ? "var(--warn)"
                  : "var(--primary)",
              }} />

              {/* Name + address */}
              <div>
                <span style={{ fontWeight: 500, letterSpacing: "-0.003em" }}>{p.name}</span>
                {p.address && (
                  <span style={{ color: "var(--fg-muted)", marginLeft: 8, fontSize: 12 }}>{p.address}</span>
                )}
              </div>

              {/* Status chip */}
              <span className={chipClass(p.status)} style={{ width: "fit-content" }}>
                {chipLabel(p.status, t)}
              </span>

              {/* Progress bar + % */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  flex: 1,
                  height: 3,
                  background: "var(--surface-2)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${p.progress}%`,
                    height: "100%",
                    background: p.progress === 100 ? "var(--fg-muted)" : "var(--primary)",
                    borderRadius: 2,
                  }} />
                </div>
                <span className="mono tnum" style={{ fontSize: 11, color: "var(--fg-muted)", minWidth: 32, textAlign: "right" }}>
                  {p.progress}%
                </span>
              </div>

              {/* Budget */}
              <div className="tnum" style={{ textAlign: "right", fontSize: 12, fontWeight: 500 }}>
                {p.totalBudget > 0 ? `${budgetTkr}k kr` : "–"}
              </div>

              {/* Chevron */}
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-subtle)" }}>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </div>
          );
        })}
      </div>
    </section>
  );
}
