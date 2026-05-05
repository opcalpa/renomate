interface LogoProps {
  inverted?: boolean;
}

export function Logo({ inverted = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid place-items-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          background: inverted ? "var(--lp-bg)" : "var(--lp-accent-ink)",
          color: inverted ? "var(--lp-accent-ink)" : "var(--lp-bg)",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        R
      </div>
      <span
        style={{
          fontFamily: '"Fraunces", ui-serif, Georgia, serif',
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: inverted ? "var(--lp-bg)" : "var(--lp-fg)",
        }}
      >
        Renofine
      </span>
    </div>
  );
}
