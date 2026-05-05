import { useTranslation } from "react-i18next";
import { Logo } from "../Logo";

export function LandingFooter() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t("landingV2.footer.product", "Produkt"),
      links: [
        t("landingV2.footer.features", "Funktioner"),
        t("landingV2.footer.pricing", "Priser"),
        t("landingV2.footer.whatsNew", "Vad \u00e4r nytt"),
        "Demo",
      ],
    },
    {
      title: t("landingV2.footer.company", "F\u00f6retag"),
      links: [
        t("landingV2.footer.about", "Om oss"),
        t("landingV2.footer.customers", "Kunder"),
        t("landingV2.footer.careers", "Karri\u00e4r"),
        "Press",
      ],
    },
    {
      title: t("landingV2.footer.resources", "Resurser"),
      links: [
        t("landingV2.footer.helpCenter", "Hj\u00e4lpcenter"),
        t("landingV2.footer.blog", "Blogg"),
        t("landingV2.footer.rotGuide", "ROT-guide"),
        "API",
      ],
    },
    {
      title: t("landingV2.footer.legal", "Juridik"),
      links: [
        t("landingV2.footer.terms", "Villkor"),
        t("landingV2.footer.privacy", "Integritet"),
        "GDPR",
        t("landingV2.footer.security", "S\u00e4kerhet"),
      ],
    },
  ];

  return (
    <footer style={{ borderTop: "1px solid var(--lp-hairline)" }}>
      <div
        className="hidden md:grid"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "40px 40px 32px",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
        <div>
          <Logo />
          <p style={{ fontSize: 13, color: "var(--lp-fg-muted)", margin: "16px 0 0", maxWidth: 280, lineHeight: 1.5 }}>
            {t("landingV2.footer.tagline", "Projektkontoret som byggare faktiskt vill anv\u00e4nda. Gjort i Stockholm.")}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
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
              {col.title}
            </div>
            <div className="flex flex-col gap-2">
              {col.links.map((l) => (
                <span key={l} className="cursor-pointer" style={{ fontSize: 13, color: "var(--lp-fg-muted)" }}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile footer */}
      <div className="md:hidden" style={{ padding: "32px 20px" }}>
        <Logo />
        <p style={{ fontSize: 12, color: "var(--lp-fg-muted)", margin: "12px 0 0", lineHeight: 1.5 }}>
          {t("landingV2.footer.tagline", "Projektkontoret som byggare faktiskt vill anv\u00e4nda. Gjort i Stockholm.")}
        </p>
      </div>

      {/* Bottom bar */}
      <div
        className="flex justify-between items-center"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "24px 40px",
          borderTop: "1px solid var(--lp-hairline)",
          fontSize: 11,
          color: "var(--lp-fg-subtle)",
        }}
      >
        <span>&copy; 2026 Renofine AB</span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: "0.08em",
          }}
        >
          RENOFINE.COM
        </span>
      </div>
    </footer>
  );
}
