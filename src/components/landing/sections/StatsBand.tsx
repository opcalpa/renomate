import { useTranslation } from "react-i18next";

export function StatsBand() {
  const { t } = useTranslation();

  const stats = [
    { v: "8 h", l: t("landingV2.stats.adminLabel", "Mindre admin per projekt"), s: t("landingV2.stats.adminSource", "Genomsnitt \u00f6ver 612 avslutade projekt") },
    { v: "3.2 d", l: t("landingV2.stats.quoteLabel", "Snabbare till skickad offert"), s: t("landingV2.stats.quoteSource", "Fr\u00e5n f\u00f6rsta kundm\u00f6te") },
    { v: "94 %", l: t("landingV2.stats.renewLabel", "F\u00f6rnyar abonnemanget \u00e5r 2"), s: t("landingV2.stats.renewSource", "Av betalande firmor") },
    { v: "4.7/5", l: t("landingV2.stats.ratingLabel", "Hur byggare bety\u0067s\u00e4tter Renofine"), s: t("landingV2.stats.ratingSource", "Trustpilot \u00b7 47 omd\u00f6men") },
  ];

  return (
    <section style={{ borderBottom: "1px solid var(--lp-hairline)" }}>
      {/* Desktop */}
      <div
        className="hidden md:grid"
        style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 40px", gridTemplateColumns: "repeat(4, 1fr)", gap: 60 }}
      >
        {stats.map((s, i) => (
          <div key={i}>
            <div
              style={{
                fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                fontSize: 42,
                fontWeight: 300,
                letterSpacing: "-0.025em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.v}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 10, letterSpacing: "-0.005em" }}>{s.l}</div>
            <div style={{ fontSize: 12, color: "var(--lp-fg-subtle)", marginTop: 4 }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Mobile: 2x2 */}
      <div className="md:hidden grid grid-cols-2 gap-6" style={{ padding: "32px 20px" }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div
              style={{
                fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                fontSize: 30,
                fontWeight: 300,
                letterSpacing: "-0.025em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.v}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "var(--lp-fg-muted)" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
