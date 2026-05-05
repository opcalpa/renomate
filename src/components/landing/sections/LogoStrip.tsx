import { useTranslation } from "react-i18next";

const PERSONAS = [
  { name: "Lindqvist Bygg AB", type: "Byggfirma" },
  { name: "Kök & Bad i Syd", type: "Specialistnisch" },
  { name: "JM Fastighetstjänst", type: "Fastighetsbolag" },
  { name: "Erik, hemägare", type: "Privatperson" },
  { name: "Studio Reno", type: "Enmansföretag" },
];

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
          {t("landingV2.logos.label", "Byggt för alla som renoverar")}
        </span>
        <div className="flex items-center gap-10 flex-wrap justify-end flex-1">
          {PERSONAS.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-0.5">
              <span
                style={{
                  fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                  fontSize: 15,
                  color: "var(--lp-fg-muted)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 9,
                  color: "var(--lp-fg-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {p.type}
              </span>
            </div>
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
          {t("landingV2.logos.label", "Byggt för alla som renoverar")}
        </div>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide" style={{ marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
          {PERSONAS.map((p) => (
            <div key={p.name} className="flex flex-col shrink-0 gap-0.5">
              <span
                style={{
                  fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                  fontSize: 14,
                  color: "var(--lp-fg-muted)",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 8,
                  color: "var(--lp-fg-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {p.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
