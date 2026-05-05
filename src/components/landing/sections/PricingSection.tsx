import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Pill } from "../Pill";

interface PricingSectionProps {
  onCta: () => void;
}

export function PricingSection({ onCta }: PricingSectionProps) {
  const { t } = useTranslation();

  const sharedFeatures = [
    t("landingV2.pricing.f1", "Obegr\u00e4nsat antal kunder"),
    t("landingV2.pricing.f2", "Offert + faktura + ROT"),
    t("landingV2.pricing.f3", "Tidsplan & ink\u00f6p"),
    t("landingV2.pricing.f4", "Mobilapp"),
  ];

  const plans = [
    {
      name: "Solo",
      price: "299",
      per: t("landingV2.pricing.perMonth", "per m\u00e5nad"),
      desc: t("landingV2.pricing.soloDesc", "F\u00f6r enskilda byggare"),
      limit: t("landingV2.pricing.soloLimit", "3 aktiva projekt"),
      cta: t("landingV2.pricing.tryFree", "Prova fritt"),
      primary: false,
      badge: null as string | null,
    },
    {
      name: "Team",
      price: "549",
      per: t("landingV2.pricing.perMonth", "per m\u00e5nad"),
      desc: t("landingV2.pricing.teamDesc", "F\u00f6r mindre firmor (1\u20135 personer)"),
      limit: t("landingV2.pricing.teamLimit", "Obegr\u00e4nsat antal projekt"),
      cta: t("landingV2.pricing.tryFree", "Prova fritt"),
      primary: true,
      badge: t("landingV2.pricing.popular", "Mest popul\u00e4r"),
    },
    {
      name: t("landingV2.pricing.enterprise", "St\u00f6rre firma"),
      price: t("landingV2.pricing.contact", "Kontakt"),
      per: "",
      desc: t("landingV2.pricing.enterpriseDesc", "F\u00f6r 6+ personer, anpassad onboarding"),
      limit: t("landingV2.pricing.enterpriseLimit", "Skr\u00e4ddarsydd l\u00f6sning"),
      cta: t("landingV2.pricing.bookDemo", "Boka demo"),
      primary: false,
      badge: null,
    },
  ];

  return (
    <section id="pricing" style={{ borderTop: "1px solid var(--lp-hairline)" }}>
      {/* Desktop */}
      <div className="hidden md:block" style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="text-center" style={{ marginBottom: 48 }}>
          <Pill tone="ink">{t("landingV2.pricing.pill", "Pris")}</Pill>
          <h2
            style={{
              fontFamily: '"Fraunces", ui-serif, Georgia, serif',
              fontSize: 42,
              fontWeight: 300,
              letterSpacing: "-0.025em",
              margin: "16px 0 8px",
            }}
          >
            {t("landingV2.pricing.h2", "Ett pris. Allt inkluderat.")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--lp-fg-muted)", margin: 0 }}>
            {t("landingV2.pricing.sub", "Bjud in obegr\u00e4nsat antal kunder kostnadsfritt. De \u00e4r din distribution.")}
          </p>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1.15fr 1fr",
            border: "1px solid var(--lp-hairline)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--lp-surface)",
          }}
        >
          {plans.map((p, i) => (
            <div
              key={i}
              className="relative"
              style={{
                padding: 32,
                borderRight: i < 2 ? "1px solid var(--lp-hairline)" : "none",
                background: p.primary ? "var(--lp-bg-sunken)" : "transparent",
              }}
            >
              {p.badge && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: "3px 10px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    background: "var(--lp-accent-ink)",
                    color: "var(--lp-bg)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  {p.badge}
                </div>
              )}
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  color: "var(--lp-fg-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {p.name}
              </div>
              <div className="flex items-baseline gap-1.5" style={{ marginTop: 14 }}>
                <span
                  style={{
                    fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                    fontSize: 48,
                    fontWeight: 300,
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.price}
                </span>
                {p.per && <span style={{ fontSize: 14, color: "var(--lp-fg-muted)" }}>kr</span>}
              </div>
              {p.per && <div style={{ fontSize: 12, color: "var(--lp-fg-subtle)", marginTop: 4 }}>{p.per}</div>}
              <div style={{ fontSize: 13, color: "var(--lp-fg-muted)", marginTop: 12 }}>{p.desc}</div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11,
                  color: "var(--lp-fg-subtle)",
                  marginTop: 8,
                }}
              >
                {p.limit}
              </div>
              <ul className="flex flex-col gap-2" style={{ listStyle: "none", padding: 0, margin: "24px 0", fontSize: 13 }}>
                {sharedFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2" style={{ color: "var(--lp-fg-muted)" }}>
                    <Check size={13} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onCta}
                className="w-full cursor-pointer"
                style={{
                  padding: "11px 18px",
                  borderRadius: 6,
                  background: p.primary ? "var(--lp-accent-ink)" : "transparent",
                  color: p.primary ? "var(--lp-bg)" : "var(--lp-fg)",
                  fontSize: 13,
                  fontWeight: 500,
                  border: p.primary ? "none" : "1px solid var(--lp-hairline)",
                }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center" style={{ marginTop: 24, fontSize: 12, color: "var(--lp-fg-subtle)" }}>
          {t("landingV2.pricing.footnote", "Alla priser exkl. moms \u00b7 Avsluta n\u00e4r du vill \u00b7 30 dagars pengarna-tillbaka-garanti")}
        </div>
      </div>

      {/* Mobile: single Team card */}
      <div className="md:hidden" style={{ padding: "40px 20px" }}>
        <div className="text-center" style={{ marginBottom: 24 }}>
          <Pill tone="ink">{t("landingV2.pricing.pill", "Pris")}</Pill>
          <h2
            style={{
              fontFamily: '"Fraunces", ui-serif, Georgia, serif',
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: "-0.022em",
              margin: "12px 0 6px",
            }}
          >
            {t("landingV2.pricing.h2", "Ett pris. Allt inkluderat.")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--lp-fg-muted)", margin: 0 }}>
            {t("landingV2.pricing.subMobile", "Bjud in obegr\u00e4nsat antal kunder gratis.")}
          </p>
        </div>

        <div style={{ border: "1px solid var(--lp-hairline)", borderRadius: 12, overflow: "hidden", background: "var(--lp-surface)" }}>
          <div
            className="relative text-center"
            style={{ padding: 24, borderBottom: "1px solid var(--lp-hairline)", background: "var(--lp-bg-sunken)" }}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: -10,
                padding: "3px 10px",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 9,
                background: "var(--lp-accent-ink)",
                color: "var(--lp-bg)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderRadius: 4,
              }}
            >
              {t("landingV2.pricing.popular", "Mest popul\u00e4r")}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "var(--lp-fg-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Team
            </div>
            <div className="flex items-baseline gap-1.5 justify-center" style={{ marginTop: 10 }}>
              <span
                style={{
                  fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                  fontSize: 42,
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                549
              </span>
              <span style={{ fontSize: 14, color: "var(--lp-fg-muted)" }}>kr/m\u00e5n</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--lp-fg-muted)", marginTop: 8 }}>
              {t("landingV2.pricing.teamDesc", "F\u00f6r mindre firmor (1\u20135 personer)")}
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <ul className="flex flex-col gap-2.5" style={{ listStyle: "none", padding: 0, margin: "0 0 20px", fontSize: 13 }}>
              {[
                t("landingV2.pricing.teamLimit", "Obegr\u00e4nsat antal projekt"),
                ...sharedFeatures,
                t("landingV2.pricing.mobileExtra", "Mobilapp + offline-l\u00e4ge"),
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5" style={{ color: "var(--lp-fg-muted)" }}>
                  <Check size={14} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onCta}
              className="w-full border-none cursor-pointer"
              style={{
                padding: "14px 18px",
                borderRadius: 6,
                background: "var(--lp-accent-ink)",
                color: "var(--lp-bg)",
                fontSize: 14,
                fontWeight: 500,
                minHeight: 48,
              }}
            >
              {t("landingV2.hero.cta", "Prova fritt 14 dagar")}
            </button>
          </div>
        </div>
        <div className="text-center" style={{ marginTop: 14 }}>
          <button
            onClick={onCta}
            className="bg-transparent border-none cursor-pointer"
            style={{ fontSize: 13, color: "var(--lp-fg-muted)", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            {t("landingV2.pricing.seeAll", "Se alla planer")}
          </button>
        </div>
      </div>
    </section>
  );
}
