import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  onNewProject: () => void;
}

export function EmptyState({ onNewProject }: EmptyStateProps) {
  const { t } = useTranslation();

  const steps = [
    {
      num: "01",
      title: t("dashboard.empty.step1Title", "Skapa ditt första projekt"),
      desc: t("dashboard.empty.step1Desc", "Ange adress, typ av renovering och ungefärlig budget. Klart på 2 minuter."),
    },
    {
      num: "02",
      title: t("dashboard.empty.step2Title", "Lägg till arbeten"),
      desc: t("dashboard.empty.step2Desc", "Definiera vad som ska göras — rivning, målning, plattsättning. Koppla till rum."),
    },
    {
      num: "03",
      title: t("dashboard.empty.step3Title", "Bjud in teamet"),
      desc: t("dashboard.empty.step3Desc", "Dela med kund, underentreprenörer eller projektledare. Alla ser sin del."),
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      {/* Hero */}
      <div style={{ marginBottom: 48, paddingTop: 32 }}>
        {/* Icon */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: "var(--bg-sunken, oklch(95.5% 0.006 85))",
          border: "1px solid var(--hairline, oklch(88% 0.005 85))",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 24px",
        }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-muted)" }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 className="font-display" style={{
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          margin: "0 0 12px",
        }}>
          {t("dashboard.empty.title", "Välkommen till Renofine")}
        </h2>
        <p style={{
          fontSize: 15,
          color: "var(--fg-muted, oklch(48% 0.01 260))",
          lineHeight: 1.55,
          maxWidth: 440,
          margin: "0 auto 32px",
        }}>
          {t("dashboard.empty.desc", "Skapa ditt första projekt för att komma igång. Du kan importera från befintliga filer eller börja från scratch.")}
        </p>

        {/* CTA button */}
        <button
          onClick={onNewProject}
          className="rf-btn rf-btn-primary"
          style={{ padding: "10px 20px", fontSize: 14 }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("dashboard.empty.cta", "Nytt projekt")}
        </button>
      </div>

      {/* Onboarding steps */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        background: "var(--hairline, oklch(88% 0.005 85))",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--hairline, oklch(88% 0.005 85))",
      }}>
        {steps.map((step) => (
          <div key={step.num} style={{
            background: "var(--surface, oklch(99.5% 0.002 85))",
            padding: "24px 20px",
            textAlign: "left",
          }}>
            <div className="kicker" style={{ marginBottom: 8 }}>
              {step.num}
            </div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.003em",
              margin: "0 0 6px",
            }}>
              {step.title}
            </h4>
            <p style={{
              fontSize: 12,
              color: "var(--fg-muted, oklch(48% 0.01 260))",
              lineHeight: 1.5,
              margin: 0,
            }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
