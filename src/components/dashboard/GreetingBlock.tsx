import type { DashboardStats } from "@/hooks/useDashboardData";

interface GreetingBlockProps {
  userName: string;
  stats: DashboardStats;
  onNewProject: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "God natt";
  if (hour < 12) return "God morgon";
  if (hour < 17) return "God eftermiddag";
  return "God kväll";
}

function formatDate(): string {
  return new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GreetingBlock({ userName, stats, onNewProject }: GreetingBlockProps) {
  const firstName = userName.split(" ")[0] || "";

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 32,
      paddingBottom: 24,
      borderBottom: "1px solid var(--hairline)",
    }}>
      <div>
        <div className="mono" style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--fg-subtle)",
          marginBottom: 12,
        }}>
          Min start · {formatDate()}
        </div>
        <h1 className="font-display" style={{
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: "-0.025em",
          margin: 0,
          lineHeight: 1.05,
        }}>
          {getGreeting()}, {firstName}.
        </h1>
        <p style={{
          fontSize: 15,
          color: "var(--fg-muted)",
          marginTop: 10,
          maxWidth: 540,
          lineHeight: 1.5,
        }}>
          Du har{" "}
          <strong style={{ color: "var(--fg)" }}>{stats.activeProjects} aktiva projekt</strong>
          {" "}och{" "}
          <strong style={{ color: "var(--fg)" }}>{stats.tasksThisWeek} uppgifter</strong>
          {" "}denna vecka.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="rf-btn rf-btn-primary" onClick={onNewProject}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nytt projekt
        </button>
      </div>
    </div>
  );
}
