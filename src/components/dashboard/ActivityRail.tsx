import type { DashboardActivity } from "@/hooks/useDashboardData";

interface ActivityRailProps {
  activities: DashboardActivity[];
}

const ACTION_LABELS: Record<string, string> = {
  created: "skapade",
  status_changed: "ändrade status på",
  assigned: "tilldelade",
  deleted: "tog bort",
  member_added: "lade till",
  member_removed: "tog bort",
};

const ENTITY_LABELS: Record<string, string> = {
  task: "arbete",
  room: "rum",
  material: "material",
  floor_plan: "planlösning",
  team_member: "teammedlem",
};

const ICON_PATHS: Record<string, string> = {
  created: "M12 5v14M5 12h14",
  status_changed: "m5 12 5 5 9-10",
  assigned: "M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM5 20a7 7 0 0 1 14 0",
  deleted: "M5 12h14",
  member_added: "M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM5 20a7 7 0 0 1 14 0",
  member_removed: "M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM5 20a7 7 0 0 1 14 0",
  comment: "M4 5h16v11H9l-5 4V5Z",
  photo: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm0 11l5-5 4 4 4-4 5 5M9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  alert: "M12 9v4M12 17h.01M4.93 19h14.14a2 2 0 0 0 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.2 16a2 2 0 0 0 1.73 3Z",
};

// Pick icon based on action + entity type for richer visual variation
function getActivityIcon(action: string, entityType: string): string {
  if (action === "comment" || entityType === "comment") return ICON_PATHS.comment;
  if (entityType === "photo" || entityType === "inspiration") return ICON_PATHS.photo;
  return ICON_PATHS[action] || ICON_PATHS.created;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "just nu";
  if (diffMin < 60) return `${diffMin}m sedan`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h sedan`;
  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return "igår";
  if (diffD < 7) return `${diffD}d sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function ActivityRail({ activities }: ActivityRailProps) {
  return (
    <aside>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <div className="mono" style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--fg-subtle)",
            marginBottom: 6,
          }}>
            I dag
          </div>
          <h2 className="font-display" style={{
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.15,
          }}>
            Aktivitet
          </h2>
        </div>
      </div>

      {/* Activity list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {activities.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
            Ingen aktivitet ännu
          </div>
        )}
        {activities.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 12 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: a.actorColor,
              color: "white",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={getActivityIcon(a.action, a.entityType)} />
              </svg>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
              <span style={{ fontWeight: 500 }}>{a.actorName || "System"}</span>{" "}
              <span style={{ color: "var(--fg-muted)" }}>
                {ACTION_LABELS[a.action] || a.action}
              </span>{" "}
              {a.entityName && (
                <span style={{ fontWeight: 500 }}>
                  {a.entityName}
                </span>
              )}
              <div className="mono" style={{
                fontSize: 10.5,
                color: "var(--fg-subtle)",
                marginTop: 3,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {relativeTime(a.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
