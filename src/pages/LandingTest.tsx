import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGuestMode } from "@/hooks/useGuestMode";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  ClipboardList,
  Users,
  Wallet,
  LayoutDashboard,
  HardHat,
  Home,
  Building2,
  CheckCircle2,
  Star,
  Sparkles,
} from "lucide-react";
import Footer from "@/components/Footer";
import { PUBLIC_DEMO_PROJECT_ID } from "@/constants/publicDemo";

// ---------------------------------------------------------------------------
// Shared data / helpers
// ---------------------------------------------------------------------------

type Variant = "A" | "B" | "C";

function VariantSwitcher({ current, onChange }: { current: Variant; onChange: (v: Variant) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/90 text-white px-2 py-1.5 rounded-full shadow-2xl backdrop-blur">
      <span className="text-xs font-medium px-2 opacity-60">Design:</span>
      {(["A", "B", "C"] as Variant[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            current === v ? "bg-white text-black" : "hover:bg-white/20"
          }`}
        >
          {v === "A" ? "Editorial" : v === "B" ? "Bold SaaS" : "Hybrid"}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VARIANT A — Editorial Clean (Legora-inspired)
// ---------------------------------------------------------------------------

function VariantA({ nav }: { nav: ReturnType<typeof useSharedNav> }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <img src="/logo.png" alt="Renomate" className="h-10" />
          <div className="flex items-center gap-4">
            <button onClick={nav.toAuth} className="text-sm hover:underline">
              {t("common.signIn")}
            </button>
            <Button size="sm" onClick={nav.startProject} className="rounded-full px-5">
              {t("landing.startProject", "Start your project")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
        <p className="text-sm uppercase tracking-widest text-primary mb-6 font-medium">
          {t("landing.heroSubtitle", "Renovate smarter")}
        </p>
        <h1 className="text-5xl md:text-7xl font-serif font-normal leading-[1.1] mb-8">
          {t("landing.heroTitle", "Plan, manage and deliver renovation projects")}
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("landing.heroDescription")}
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={nav.startProject} className="rounded-full px-8 text-base">
            {t("landing.startProject", "Start your project")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="ghost" onClick={nav.demo} className="rounded-full px-8 text-base">
            <Play className="mr-2 h-4 w-4" />
            {t("landing.demoProject")}
          </Button>
        </div>
      </section>

      {/* Hero image */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div
          className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => nav.demoTab("contractor", "tasks")}
        >
          <img src="/screenshots/Timeline.png" alt="Renomate" className="w-full" loading="eager" />
        </div>
      </section>

      {/* Features — minimal cards */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-serif text-center mb-16">
            {t("landing.featuresTitle", "Everything you need")}
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: <LayoutDashboard className="h-5 w-5" />, title: t("landing.co2Title"), desc: t("landing.co2Desc") },
              { icon: <ClipboardList className="h-5 w-5" />, title: t("landing.ho1Title"), desc: t("landing.ho1Desc") },
              { icon: <Wallet className="h-5 w-5" />, title: t("landing.ho3Title"), desc: t("landing.ho3Desc") },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-primary mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => nav.demoTab("contractor", "spaceplanner")}>
            <img src="/screenshots/Floorplan.png" alt="Floor planner" className="w-full" loading="lazy" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => nav.demoTab("contractor", "overview")}>
            <img src="/screenshots/Overview.png" alt="Overview" className="w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-6">{t("landing.ctaTitle")}</h2>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">{t("landing.ctaDescription")}</p>
        <Button size="lg" onClick={nav.toAuth} className="rounded-full px-10 text-base">
          {t("landing.createAccount")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VARIANT B — Bold SaaS (Moved-inspired)
// ---------------------------------------------------------------------------

function VariantB({ nav }: { nav: ReturnType<typeof useSharedNav> }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <img src="/logo.png" alt="Renomate" className="h-9" />
          <div className="flex items-center gap-6">
            <button onClick={nav.toAuth} className="text-sm font-medium hover:text-primary transition-colors">
              {t("common.signIn")}
            </button>
            <Button onClick={nav.startProject} className="bg-black hover:bg-gray-800 text-white rounded-lg px-5">
              {t("landing.startProject", "Get started")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — dark section */}
      <section className="bg-gradient-to-b from-gray-950 to-gray-900 text-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-8 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>{t("landing.heroSubtitle", "AI-powered renovation management")}</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-8 tracking-tight">
            {t("landing.heroTitle", "Plan, manage and deliver renovation projects")}
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            {t("landing.heroDescription")}
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <Button size="lg" onClick={nav.startProject} className="bg-primary hover:bg-primary/90 rounded-lg px-8 text-base h-12">
              {t("landing.startProject", "Start free")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={nav.demo} className="border-gray-600 text-white hover:bg-white/10 rounded-lg px-8 text-base h-12">
              <Play className="mr-2 h-4 w-4" />
              {t("landing.demoProject")}
            </Button>
          </div>

          {/* Hero screenshot with glow */}
          <div className="relative max-w-5xl mx-auto">
            <div
              className="rounded-xl overflow-hidden border border-gray-700 shadow-2xl cursor-pointer"
              onClick={() => nav.demoTab("contractor", "tasks")}
            >
              <img src="/screenshots/Timeline.png" alt="Renomate" className="w-full" loading="eager" />
            </div>
            <div className="absolute -inset-8 bg-primary/20 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { n: "500+", label: t("landing.stat1", "Projects managed") },
            { n: "50+", label: t("landing.stat2", "Active companies") },
            { n: "98%", label: t("landing.stat3", "Satisfaction rate") },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-gray-900">{s.n}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — two columns alternating */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6 space-y-20">
          {/* Builder */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold mb-4">
                <Building2 className="h-3.5 w-3.5" /> {t("landing.contractorTitle")}
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("landing.co2Title")}</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">{t("landing.co2Desc")}</p>
              <ul className="space-y-3">
                {[t("landing.co1Title"), t("landing.co2Title"), t("landing.co3Title")].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => nav.demoTab("contractor", "tasks")}>
              <img src="/screenshots/Kanban.png" alt="Kanban" className="w-full" loading="lazy" />
            </div>
          </div>

          {/* Homeowner — reversed */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 rounded-xl overflow-hidden border border-gray-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => nav.demoTab("homeowner", "budget")}>
              <img src="/screenshots/Budget.png" alt="Budget" className="w-full" loading="lazy" />
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold mb-4">
                <Home className="h-3.5 w-3.5" /> {t("landing.homeownerTitle")}
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("landing.ho1Title")}</h2>
              <p className="text-gray-500 mb-6 leading-relaxed">{t("landing.ho1Desc")}</p>
              <ul className="space-y-3">
                {[t("landing.ho1Title"), t("landing.ho2Title"), t("landing.ho3Title")].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Star className="h-8 w-8 text-yellow-400 mx-auto mb-6" />
          <blockquote className="text-2xl md:text-3xl font-medium leading-snug mb-6">
            "Renomate har förändrat hur vi hanterar våra renoveringsprojekt. Allt på ett ställe."
          </blockquote>
          <p className="text-gray-500">— Renoveringsföretagare, Stockholm</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.ctaTitle")}</h2>
          <p className="text-lg text-gray-500 mb-10">{t("landing.ctaDescription")}</p>
          <Button size="lg" onClick={nav.toAuth} className="bg-black hover:bg-gray-800 text-white rounded-lg px-10 text-base h-12">
            {t("landing.createAccount")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// VARIANT C — Hybrid (Best of both)
// ---------------------------------------------------------------------------

function VariantC({ nav }: { nav: ReturnType<typeof useSharedNav> }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#fafaf8] text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#fafaf8]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/logo.png" alt="Renomate" className="h-10" />
          <div className="flex items-center gap-4">
            <button onClick={nav.toAuth} className="text-sm font-medium hover:text-primary">
              {t("common.signIn")}
            </button>
            <Button onClick={nav.startProject} className="rounded-full px-6 bg-gray-900 hover:bg-gray-800 text-white">
              {t("landing.startProject", "Get started")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.heroSubtitle", "AI-powered")}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] mb-6 tracking-tight">
              {t("landing.heroTitle", "Plan, manage and deliver renovation projects")}
            </h1>
            <p className="text-lg text-gray-500 mb-8 max-w-lg leading-relaxed">
              {t("landing.heroDescription")}
            </p>
            <div className="flex gap-3">
              <Button size="lg" onClick={nav.startProject} className="rounded-full px-8 h-12">
                {t("landing.startProject", "Start free")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={nav.demo} className="rounded-full px-8 h-12">
                <Play className="mr-2 h-4 w-4" />
                {t("landing.demoProject")}
              </Button>
            </div>

            {/* Mini social proof */}
            <div className="flex items-center gap-6 mt-10 pt-8 border-t border-gray-200">
              {[
                { n: "500+", l: t("landing.stat1", "Projects") },
                { n: "98%", l: t("landing.stat3", "Happy users") },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-xl font-bold">{s.n}</p>
                  <p className="text-xs text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image — tilted with shadow */}
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 cursor-pointer hover:scale-[1.01] transition-transform"
              style={{ transform: "perspective(1200px) rotateY(-4deg)" }}
              onClick={() => nav.demoTab("contractor", "tasks")}
            >
              <img src="/screenshots/Timeline.png" alt="Renomate" className="w-full" loading="eager" />
            </div>
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 to-emerald-500/10 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Feature cards with elevation */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t("landing.featuresTitle", "Everything you need")}
          </h2>
          <p className="text-gray-500 text-center mb-14 max-w-xl mx-auto">
            {t("landing.featuresDesc", "From floor planning to budget tracking")}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <LayoutDashboard className="h-5 w-5" />, color: "bg-blue-50 text-blue-600", title: t("landing.co2Title"), desc: t("landing.co2Desc"), tab: "tasks" },
              { icon: <ClipboardList className="h-5 w-5" />, color: "bg-emerald-50 text-emerald-600", title: t("landing.ho1Title"), desc: t("landing.ho1Desc"), tab: "overview" },
              { icon: <Wallet className="h-5 w-5" />, color: "bg-amber-50 text-amber-600", title: t("landing.ho3Title"), desc: t("landing.ho3Desc"), tab: "budget" },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => nav.demoTab("contractor", f.tab)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots bento grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="md:col-span-3 rounded-2xl overflow-hidden border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => nav.demoTab("contractor", "spaceplanner")}>
            <img src="/screenshots/Floorplan.png" alt="Floor planner" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => nav.demoTab("contractor", "overview")}>
              <img src="/screenshots/Overview.png" alt="Overview" className="w-full" loading="lazy" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => nav.demoTab("homeowner", "budget")}>
              <img src="/screenshots/Budget.png" alt="Budget" className="w-full" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-white py-20 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl leading-relaxed mb-6">
            "Renomate har förändrat hur vi hanterar våra renoveringsprojekt. Allt på ett ställe — planritning, budget, team och tidslinje."
          </blockquote>
          <p className="text-sm text-gray-400">— Renoveringsföretagare, Stockholm</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{t("landing.ctaTitle")}</h2>
          <p className="text-lg text-gray-500 mb-10">{t("landing.ctaDescription")}</p>
          <Button size="lg" onClick={nav.toAuth} className="rounded-full px-10 h-12 text-base">
            {t("landing.createAccount")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared navigation hook
// ---------------------------------------------------------------------------

function useSharedNav() {
  const navigate = useNavigate();
  const { enterGuestMode } = useGuestMode();
  return {
    toAuth: () => navigate("/auth"),
    startProject: () => { enterGuestMode(); navigate("/start"); },
    demo: () => navigate(`/projects/${PUBLIC_DEMO_PROJECT_ID}`),
    demoTab: (role: "homeowner" | "contractor", tab?: string) => {
      localStorage.setItem("demo_view_role", role);
      if (role === "contractor") localStorage.removeItem("demo_view_phase");
      navigate(`/projects/${PUBLIC_DEMO_PROJECT_ID}${tab ? `?tab=${tab}` : ""}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LandingTest() {
  const [variant, setVariant] = useState<Variant>("C");
  const nav = useSharedNav();

  return (
    <>
      {variant === "A" && <VariantA nav={nav} />}
      {variant === "B" && <VariantB nav={nav} />}
      {variant === "C" && <VariantC nav={nav} />}
      <VariantSwitcher current={variant} onChange={setVariant} />
    </>
  );
}
