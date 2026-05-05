import { useTranslation } from "react-i18next";

const LOGOS = ["Holmberg Bygg", "Skanlund AB", "Wallin & S\u00f6ner", "BoBygg Stockholm", "Andersson Renoverar", "M\u00e4lar Bygg"];

export function LogoStrip() {
  const { t } = useTranslation();

  return (
    <section
      style={{
        borderTop: "1px solid var(--lp-hairline)",
        borderBottom: "1px solid var(--lp-hairline)",
        background: "var(--lp-bg-sunken)",
      }}
    >
      {/* Desktop */}
      <div
        className="hidden md:flex items-center justify-between"
        style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 40px", gap: 40 }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            color: "var(--lp-fg-subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            flexShrink: 0,
          }}
        >
          {t("landingV2.logos.label", "142 firmor anv\u00e4nder Renofine dagligen")}
        </span>
        <div className="flex items-center gap-12 flex-wrap justify-end flex-1">
          {LOGOS.map((n) => (
            <span
              key={n}
              style={{
                fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                fontSize: 15,
                color: "var(--lp-fg-muted)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden" style={{ padding: "24px 20px" }}>
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: "var(--lp-fg-subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          {t("landingV2.logos.label", "142 firmor anv\u00e4nder Renofine dagligen")}
        </div>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide" style={{ marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
          {LOGOS.slice(0, 5).map((n) => (
            <span
              key={n}
              className="shrink-0"
              style={{
                fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                fontSize: 14,
                color: "var(--lp-fg-muted)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
