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
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8 pb-5 md:pb-6 border-b" style={{ borderColor: "var(--hairline)" }}>
      <div>
        <div className="kicker mb-3">
          Min start · {formatDate()}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl" style={{
          fontWeight: 400,
          letterSpacing: "-0.025em",
          margin: 0,
          lineHeight: 1.05,
        }}>
          {getGreeting()}, {firstName}.
        </h1>
        <p className="text-sm md:text-[15px] mt-2.5 max-w-[540px] leading-relaxed" style={{ color: "var(--fg-muted)" }}>
          Du har{" "}
          <strong style={{ color: "var(--fg)" }}>{stats.activeProjects} aktiva projekt</strong>
          {" "}och{" "}
          <strong style={{ color: "var(--fg)" }}>{stats.tasksThisWeek} uppgifter</strong>
          {" "}denna vecka.
        </p>
      </div>
      <div className="flex gap-2 mt-4 sm:mt-0">
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
