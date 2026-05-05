import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Pill } from "../Pill";

interface PricingSectionProps {
  onCta: () => void;
}

export function PricingSection({ onCta }: PricingSectionProps) {
  const { t } = useTranslation();

  const features = [
    t("landingV2.pricing.f1", "Obegränsat antal kunder"),
    t("landingV2.pricing.f2", "Offert + faktura + ROT"),
    t("landingV2.pricing.f3", "Tidsplan & inköp"),
    t("landingV2.pricing.f4", "Mobilapp"),
    t("landingV2.pricing.f5", "Obegränsat antal projekt"),
    t("landingV2.pricing.f6", "Alla framtida funktioner"),
  ];

  return (
    <section id="pricing" style={{ borderTop: "1px solid var(--lp-hairline)" }}>
      {/* Desktop */}
      <div className="hidden md:block" style={{ padding: "80px 40px", maxWidth: 720, margin: "0 auto" }}>
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
            {t("landingV2.pricing.h2", "Gratis under beta.")}
          </h2>
          <p style={{ fontSize: 14, color: "var(--lp-fg-muted)", margin: 0, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            {t("landingV2.pricing.sub", "Vi bygger fortfarande. Du får tillgång till allt — utan kostnad, utan tidsgräns, utan kort. När vi lanserar betalplaner får du som tidig användare ett förmånligt pris.")}
          </p>
        </div>

        <div
          style={{
            border: "1px solid var(--lp-hairline)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--lp-surface)",
            maxWidth: 440,
            margin: "0 auto",
          }}
        >
          <div style={{ padding: 32, background: "var(--lp-bg-sunken)", textAlign: "center" }}>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "var(--lp-fg-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              {t("landingV2.pricing.betaLabel", "Publik beta")}
            </div>
            <div className="flex items-baseline gap-1.5 justify-center" style={{ marginTop: 10 }}>
              <span
                style={{
                  fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                  fontSize: 56,
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                0 kr
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--lp-fg-muted)", marginTop: 10 }}>
              {t("landingV2.pricing.betaDesc", "Allt inkluderat. Inga begränsningar.")}
            </div>
          </div>
          <div style={{ padding: 32 }}>
            <ul className="flex flex-col gap-2.5" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13 }}>
              {features.map((f) => (
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
              {t("landingV2.pricing.betaCta", "Skapa konto — gratis")}
            </button>
          </div>
        </div>

        <div className="text-center" style={{ marginTop: 24, fontSize: 12, color: "var(--lp-fg-subtle)" }}>
          {t("landingV2.pricing.footnote", "Inget kreditkort · Avsluta när du vill · Early adopters får förmånligt pris vid lansering")}
        </div>
      </div>

      {/* Mobile */}
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
            {t("landingV2.pricing.h2", "Gratis under beta.")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--lp-fg-muted)", margin: 0 }}>
            {t("landingV2.pricing.subMobile", "Allt ingår. Inga kort, ingen tidsgräns.")}
          </p>
        </div>

        <div style={{ border: "1px solid var(--lp-hairline)", borderRadius: 12, overflow: "hidden", background: "var(--lp-surface)" }}>
          <div
            className="text-center"
            style={{ padding: 24, borderBottom: "1px solid var(--lp-hairline)", background: "var(--lp-bg-sunken)" }}
          >
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                color: "var(--lp-fg-subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {t("landingV2.pricing.betaLabel", "Publik beta")}
            </div>
            <div className="flex items-baseline gap-1.5 justify-center" style={{ marginTop: 10 }}>
              <span
                style={{
                  fontFamily: '"Fraunces", ui-serif, Georgia, serif',
                  fontSize: 42,
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                0 kr
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--lp-fg-muted)", marginTop: 8 }}>
              {t("landingV2.pricing.betaDesc", "Allt inkluderat. Inga begränsningar.")}
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <ul className="flex flex-col gap-2.5" style={{ listStyle: "none", padding: 0, margin: "0 0 20px", fontSize: 13 }}>
              {features.map((f) => (
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
              {t("landingV2.pricing.betaCta", "Skapa konto — gratis")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
