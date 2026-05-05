import type { ReactNode, CSSProperties } from "react";

interface AnnoProps {
  pos?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  kicker?: string;
  children: ReactNode;
  dx?: number;
  dy?: number;
}

export function Anno({ pos = "top-right", kicker, children, dx = -20, dy = 20 }: AnnoProps) {
  const [v, h] = pos.split("-") as ["top" | "bottom", "left" | "right"];
  const style: CSSProperties = {
    position: "absolute",
    background: "var(--lp-surface)",
    border: "1px solid var(--lp-hairline)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 500,
    boxShadow: "var(--lp-shadow-md)",
    whiteSpace: "nowrap",
    color: "var(--lp-fg)",
  };

  if (v === "top") style.top = dy;
  if (v === "bottom") style.bottom = dy;
  if (h === "left") style.left = dx;
  if (h === "right") style.right = dx;

  return (
    <div style={style}>
      {kicker && (
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: "var(--lp-fg-subtle)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 2,
            fontWeight: 500,
          }}
        >
          {kicker}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
