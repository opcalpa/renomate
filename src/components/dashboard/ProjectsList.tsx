import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardProject } from "@/hooks/useDashboardData";

interface ProjectsListProps {
  projects: DashboardProject[];
}

type Filter = "all" | "active" | "completed";

function chipClass(status: string | null): string {
  if (!status) return "rf-chip";
  if (status === "completed") return "rf-chip chip-muted";
  if (status === "on_hold" || status === "delayed") return "rf-chip chip-warn";
  return "rf-chip chip-primary";
}

function chipLabel(status: string | null): string {
  if (!status) return "Okänd";
  const map: Record<string, string> = {
    planning: "Planering",
    quote_created: "Offert skapad",
    quote_sent: "Offert skickad",
    active: "Pågående",
    in_progress: "Pågående",
    on_hold: "Pausad",
    delayed: "Försenad",
    completed: "Klar",
    archived: "Arkiverad",
  };
  return map[status] || status;
}

function progressColor(status: string | null, progress: number): string {
  if (status === "on_hold" || status === "delayed") return "var(--warn)";
  if (progress === 100) return "var(--fg-muted)";
  return "var(--primary)";
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();

  const filtered = projects.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return p.status !== "completed" && p.status !== "archived";
    return p.status === "completed";
  });

  const filterBtn = (f: Filter, label: string) => (
    <button
      className="rf-btn rf-btn-ghost"
      style={{
        padding: "5px 9px",
        fontSize: 12,
        color: filter === f ? "var(--fg)" : "var(--fg-muted)",
        borderColor: filter === f ? "var(--hairline)" : "transparent",
      }}
      onClick={() => setFilter(f)}
    >
      {label}
    </button>
  );

  return (
    <section>
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <span className="kicker">Projekt</span>
          <h2 className="font-display text-xl sm:text-2xl md:text-[28px]" style={{
            fontWeight: 400,
            letterSpacing: "-0.02em",
            margin: "6px 0 0",
            lineHeight: 1.15,
          }}>
            Dina renoveringar
          </h2>
        </div>
        <div className="flex gap-1.5 mt-2 sm:mt-0">
          {filterBtn("all", "Alla")}
          {filterBtn("active", "Pågående")}
          {filterBtn("completed", "Avslutade")}
        </div>
      </div>

      {/* Project rows */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        background: "var(--hairline)",
        border: "1px solid var(--hairline)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {filtered.length === 0 && (
          <div style={{
            background: "var(--surface)",
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--fg-muted)",
            fontSize: 14,
          }}>
            Inga projekt att visa
          </div>
        )}
        {filtered.map((p) => {
          const budgetTkr = Math.round(p.spentAmount / 1000);
          const totalTkr = Math.round(p.totalBudget / 1000);

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="grid items-center cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
              style={{
                background: "var(--surface)",
                padding: "14px 16px",
                gridTemplateColumns: "1fr auto",
                gap: 12,
              }}
            >
              {/* Mobile: name + progress + chip */}
              <div className="md:hidden min-w-0">
                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}>{p.name}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div style={{ flex: 1, height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${p.progress}%`, height: "100%", background: progressColor(p.status, p.progress), borderRadius: 2 }} />
                  </div>
                  <span className={chipClass(p.status)} style={{ flexShrink: 0 }}>{chipLabel(p.status)}</span>
                </div>
              </div>

              {/* Desktop: full grid */}
              <div className="hidden md:grid items-center col-span-2" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1.2fr auto", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}>{p.name}</div>
                  {p.address && <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>{p.address}</div>}
                </div>
                <div style={{ fontSize: 12 }}>
                  <div className="kicker">Arbeten</div>
                  <div className="tnum" style={{ marginTop: 2 }}>{p.tasksDone} / {p.tasksTotal}</div>
                </div>
                <div style={{ fontSize: 12 }}>
                  <div className="kicker">Budget</div>
                  <div className="tnum" style={{ marginTop: 2 }}>{p.totalBudget > 0 ? `${budgetTkr} / ${totalTkr} tkr` : "–"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${p.progress}%`, height: "100%", background: progressColor(p.status, p.progress) }} />
                  </div>
                  <span className={chipClass(p.status)}>{chipLabel(p.status)}</span>
                </div>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-subtle)" }}>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </div>

              {/* Mobile chevron */}
              <svg className="md:hidden" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-subtle)" }}>
                <path d="m9 6 6 6-6 6" />
              </svg>
            </div>
          );
        })}
      </div>
    </section>
  );
}
