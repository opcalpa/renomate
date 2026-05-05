import "./dashboard-tokens.css";
import { useDashboardData } from "@/hooks/useDashboardData";
import { GreetingBlock } from "./GreetingBlock";
import { StatStrip } from "./StatStrip";
import { ProjectsList } from "./ProjectsList";
import { ActivityRail } from "./ActivityRail";
import { EmptyState } from "./EmptyState";

interface DashboardRedesignProps {
  userId: string;
  userName?: string;
  onNewProject: () => void;
  onToggleBack: () => void;
}

export default function DashboardRedesign({ userId, userName, onNewProject, onToggleBack }: DashboardRedesignProps) {
  const data = useDashboardData(userId);
  const displayName = userName || data.userName;

  if (data.isLoading) {
    return (
      <div className="rf-dashboard" data-theme="paper">
        <main style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
          {/* Greeting skeleton */}
          <div style={{ marginBottom: 24 }}>
            <div className="animate-pulse rounded bg-muted/60 h-3 w-32 mb-2" />
            <div className="animate-pulse rounded bg-muted/40 h-9 w-72 mb-2" />
            <div className="animate-pulse rounded bg-muted/30 h-4 w-56" />
          </div>
          {/* Stats strip skeleton */}
          <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--hairline, oklch(88% 0.005 85))" }}>
            <div className="grid grid-cols-4 divide-x" style={{ divideColor: "var(--hairline)" }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="p-5">
                  <div className="animate-pulse rounded bg-muted/60 h-2.5 w-16 mb-3" />
                  <div className="animate-pulse rounded bg-muted/40 h-7 w-20 mb-2" />
                  <div className="animate-pulse rounded-full bg-muted/30 h-1.5 w-full" />
                </div>
              ))}
            </div>
          </div>
          {/* Content skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32 }}>
            <div>
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 py-4 border-b" style={{ borderColor: "var(--hairline)" }}>
                  <div className="animate-pulse rounded bg-muted/40 h-5 w-5" />
                  <div className="flex-1">
                    <div className="animate-pulse rounded bg-muted/50 h-4 w-48 mb-1.5" />
                    <div className="animate-pulse rounded bg-muted/30 h-3 w-32" />
                  </div>
                  <div className="animate-pulse rounded-full bg-muted/40 h-5 w-16" />
                </div>
              ))}
            </div>
            <div>
              <div className="animate-pulse rounded bg-muted/60 h-2.5 w-12 mb-2" />
              <div className="animate-pulse rounded bg-muted/40 h-7 w-24 mb-5" />
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 mb-5">
                  <div className="animate-pulse rounded-full bg-muted/40 h-7 w-7 shrink-0" />
                  <div className="flex-1">
                    <div className="animate-pulse rounded bg-muted/40 h-3.5 w-full mb-1.5" />
                    <div className="animate-pulse rounded bg-muted/30 h-2.5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="rf-dashboard" data-theme="paper">
      <main style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
        {/* A/B toggle — switch back to old design */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            className="rf-btn rf-btn-ghost"
            onClick={onToggleBack}
            style={{ fontSize: 12, padding: "4px 10px", color: "var(--fg-subtle)" }}
          >
            ← Tillbaka till klassisk vy
          </button>
        </div>

        <GreetingBlock
          userName={displayName}
          stats={data.stats}
          onNewProject={onNewProject}
        />

        {data.projects.length === 0 ? (
          <EmptyState onNewProject={onNewProject} />
        ) : (
          <>
            <StatStrip stats={data.stats} />
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr",
              gap: 32,
            }}>
              <ProjectsList projects={data.projects} />
              <ActivityRail activities={data.activities} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
