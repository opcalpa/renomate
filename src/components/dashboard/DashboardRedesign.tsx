import "./dashboard-tokens.css";
import { useDashboardData } from "@/hooks/useDashboardData";
import { GreetingBlock } from "./GreetingBlock";
import { StatStrip } from "./StatStrip";
import { ProjectsList } from "./ProjectsList";
import { ActivityRail } from "./ActivityRail";

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
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
            Laddar...
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

        <StatStrip stats={data.stats} />

        <div style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 32,
        }}>
          <ProjectsList projects={data.projects} />
          <ActivityRail activities={data.activities} />
        </div>
      </main>
    </div>
  );
}
