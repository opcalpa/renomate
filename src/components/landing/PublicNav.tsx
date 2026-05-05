import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

interface PublicNavProps {
  onCta: () => void;
  onLogin: () => void;
  onScrollTo?: (id: string) => void;
}

export function PublicNav({ onCta, onLogin, onScrollTo }: PublicNavProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: t("landingV2.nav.features", "Funktioner"), id: "features" },
    { label: t("landingV2.nav.pricing", "Priser"), id: "pricing" },
    { label: t("landingV2.nav.homeowner", "F\u00f6r hem\u00e4gare"), id: "homeowner" },
  ];

  const handleLink = (id: string) => {
    setMobileOpen(false);
    onScrollTo?.(id);
  };

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        padding: "0 40px",
        borderBottom: "1px solid var(--lp-hairline)",
        background: "var(--lp-surface)",
      }}
    >
      {/* Desktop nav */}
      <div className="hidden md:flex items-center justify-between" style={{ height: 64 }}>
        <Logo />
        <nav className="flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLink(l.id)}
              className="bg-transparent border-none cursor-pointer"
              style={{ fontSize: 13, color: "var(--lp-fg-muted)", fontWeight: 450 }}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={onLogin}
            className="bg-transparent border-none cursor-pointer"
            style={{ fontSize: 13, color: "var(--lp-fg)", fontWeight: 500 }}
          >
            {t("landingV2.nav.login", "Logga in")}
          </button>
          <button
            onClick={onCta}
            className="border-none cursor-pointer"
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "var(--lp-accent-ink)",
              color: "var(--lp-bg)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {t("landingV2.nav.cta", "Prova fritt 14 dagar")}
          </button>
        </nav>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden items-center justify-between" style={{ height: 56, padding: "0 16px", margin: "0 -40px" }}>
        <Logo />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="grid place-items-center cursor-pointer"
          style={{
            width: 36,
            height: 36,
            border: "1px solid var(--lp-hairline)",
            background: "transparent",
            borderRadius: 6,
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <nav
          className="md:hidden flex flex-col absolute left-0 right-0"
          style={{
            top: 56,
            background: "var(--lp-surface)",
            borderBottom: "1px solid var(--lp-hairline)",
            padding: "12px 16px",
            zIndex: 9,
          }}
        >
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLink(l.id)}
              className="text-left bg-transparent border-none"
              style={{
                padding: "14px 4px",
                fontSize: 15,
                color: "var(--lp-fg)",
                borderBottom: "1px solid var(--lp-hairline)",
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => { setMobileOpen(false); onLogin(); }}
            className="text-left bg-transparent border-none"
            style={{
              padding: "14px 4px",
              fontSize: 15,
              color: "var(--lp-fg)",
              borderBottom: "1px solid var(--lp-hairline)",
              cursor: "pointer",
            }}
          >
            {t("landingV2.nav.login", "Logga in")}
          </button>
          <button
            onClick={() => { setMobileOpen(false); onCta(); }}
            className="border-none cursor-pointer"
            style={{
              marginTop: 14,
              padding: "13px 18px",
              borderRadius: 6,
              background: "var(--lp-accent-ink)",
              color: "var(--lp-bg)",
              fontSize: 14,
              fontWeight: 500,
              minHeight: 44,
            }}
          >
            {t("landingV2.nav.cta", "Prova fritt 14 dagar")}
          </button>
        </nav>
      )}
    </header>
  );
}
