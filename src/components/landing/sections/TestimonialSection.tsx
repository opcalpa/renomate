import { useTranslation } from "react-i18next";

export function TestimonialSection() {
  const { t } = useTranslation();

  return (
    <section>
      {/* Desktop */}
      <div className="hidden md:block" style={{ padding: "100px 40px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: "var(--lp-fg-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 24,
            }}
          >
            {t("landingV2.testimonial.kicker", "Kunder \u00b7 Holmberg Bygg AB")}
          </div>
          <blockquote
            style={{
              fontFamily: '"Fraunces", ui-serif, Georgia, serif',
              fontSize: 32,
              fontWeight: 300,
              lineHeight: 1.25,
              letterSpacing: "-0.018em",
              margin: "0 0 32px",
              fontStyle: "italic",
              textWrap: "pretty",
            }}
          >
            {t(
              "landingV2.testimonial.quote",
              "\u201cVi gick fr\u00e5n 14 timmars administration per projekt till under 2. Det \u00e4r en l\u00f6ne\u00f6kning f\u00f6r mina arbetsledare \u2014 utan att det kostar mig n\u00e5got.\u201d"
            )}
          </blockquote>
          <div className="flex items-center justify-center gap-3.5">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                background: `repeating-linear-gradient(45deg, var(--lp-surface-2) 0 8px, var(--lp-bg-sunken) 8px 16px)`,
                color: "var(--lp-fg-subtle)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
              }}
            >
              foto
            </div>
            <div className="text-left">
              <div style={{ fontSize: 14, fontWeight: 500 }}>Marcus Holmberg</div>
              <div style={{ fontSize: 12, color: "var(--lp-fg-muted)" }}>VD · Holmberg Bygg AB · Stockholm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div
        className="md:hidden"
        style={{ padding: "40px 20px", borderTop: "1px solid var(--lp-hairline)", background: "var(--lp-bg-sunken)" }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: "var(--lp-fg-subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 14,
          }}
        >
          {t("landingV2.testimonial.kickerShort", "Kunder")}
        </div>
        <blockquote
          style={{
            fontFamily: '"Fraunces", ui-serif, Georgia, serif',
            fontSize: 22,
            fontWeight: 300,
            lineHeight: 1.3,
            letterSpacing: "-0.012em",
            margin: "0 0 20px",
            fontStyle: "italic",
          }}
        >
          {t("landingV2.testimonial.quoteMobile", "\u201cVi gick fr\u00e5n 14 timmars admin till under 2 per projekt.\u201d")}
        </blockquote>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 40,
              height: 40,
              background: `repeating-linear-gradient(45deg, var(--lp-surface-2) 0 8px, var(--lp-bg-sunken) 8px 16px)`,
              color: "var(--lp-fg-subtle)",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 9,
            }}
          >
            foto
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Marcus Holmberg</div>
            <div style={{ fontSize: 11, color: "var(--lp-fg-muted)" }}>VD · Holmberg Bygg AB</div>
          </div>
        </div>
      </div>
    </section>
  );
}
