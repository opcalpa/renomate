import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { DashboardProject } from "@/hooks/useDashboardData";

interface ProjectsPortfolioProps {
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
    completed: t("statuses.completed", "Klar"),
  };
  return map[status] || status;
}

export function ProjectsPortfolio({ projects }: ProjectsPortfolioProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <span className="kicker">{t("dashboard.portfolio.kicker", "Projekt")}</span>
        <h2 className="font-display" style={{
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          margin: "6px 0 0",
          lineHeight: 1.15,
        }}>
          {projects.filter(p => p.status !== "completed" && p.status !== "archived").length} {t("dashboard.portfolio.activeProjects", "aktiva projekt.")}
        </h2>
      </div>

      {/* Card grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {projects.map((p) => {
          const budgetTkr = Math.round(p.totalBudget / 1000);

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              style={{
                border: "1px solid var(--hairline)",
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--surface)",
                cursor: "pointer",
                transition: "box-shadow 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px -4px oklch(22% 0.01 260 / 0.1)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              {/* Image placeholder */}
              <div style={{
                aspectRatio: "4 / 3",
                background: "var(--bg-sunken)",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}>
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>

              {/* Content */}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}>
                      {p.name}
                    </div>
                    <div className="mono" style={{
                      fontSize: 10,
                      color: "var(--fg-subtle)",
                      marginTop: 3,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      {p.address || t("dashboard.portfolio.noAddress", "Ingen adress")}
                      {p.totalBudget > 0 && ` · ${budgetTkr}k kr`}
                    </div>
                  </div>
                  <span className={chipClass(p.status)} style={{ flexShrink: 0 }}>
                    {chipLabel(p.status, t)}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
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
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                    {p.progress}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
