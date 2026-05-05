import type { ReactNode } from "react";

type PillTone = "ink" | "primary" | "paper";

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
}

const toneStyles: Record<PillTone, { bg: string; fg: string }> = {
  ink: { bg: "oklch(22% 0.01 260)", fg: "oklch(98% 0.002 85)" },
  primary: { bg: "color-mix(in oklab, var(--lp-primary) 15%, transparent)", fg: "var(--lp-primary)" },
  paper: { bg: "var(--lp-surface-2)", fg: "var(--lp-fg)" },
};

export function Pill({ children, tone = "ink" }: PillProps) {
  const c = toneStyles[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
