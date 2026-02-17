import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  ClipboardList,
  Users,
  Wallet,
  FileText,
  LayoutDashboard,
  HardHat,
  Home,
  Building2
} from "lucide-react";
import Footer from "@/components/Footer";
import { PUBLIC_DEMO_PROJECT_ID } from "@/constants/publicDemo";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/start");
    }
  };

  const handleDemoProject = () => {
    // Navigate directly to the public demo project (accessible without login)
    navigate(`/projects/${PUBLIC_DEMO_PROJECT_ID}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <header className="container mx-auto px-4 pt-4 md:pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="Renomate" className="h-14 w-auto" />
          </div>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            {t('common.signIn')}
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Content */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text content */}
            <div className="text-center lg:text-left order-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                {t('landing.heroTitle')}
                <br />
                <span className="text-primary">{t('landing.heroSubtitle')}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                {t('landing.heroDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
                  {t('landing.getStarted')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleDemoProject}>
                  <Play className="mr-2 h-5 w-5" />
                  {t('landing.demoProject')}
                </Button>
              </div>
            </div>

            {/* Hero screenshot */}
            <div className="order-2 relative">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
                <img
                  src="/screenshots/Timeline.png"
                  alt="Renomate project timeline"
                  className="w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              {/* Decorative gradient blur */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* Contractor Features Section - FIRST (primary target audience) */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">{t('landing.contractorTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card p-6 rounded-xl border border-border hover:border-blue-500/30 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.co1Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.co1Desc')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-blue-500/30 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.co2Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.co2Desc')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-blue-500/30 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <HardHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.co3Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.co3Desc')}
              </p>
            </div>
          </div>

          {/* Contractor screenshot */}
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-blue-200 dark:border-blue-800/50 bg-card">
            <img
              src="/screenshots/Kanban.png"
              alt="Task management kanban board"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </section>

        {/* Features Showcase Section */}
        <section className="container mx-auto px-4 py-12 md:py-16 bg-muted/30">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('landing.featuresTitle', 'Powerful tools for your renovation')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('landing.featuresDesc', 'From floor planning to timeline tracking, everything you need in one place')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Floor Planner */}
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-border bg-card">
              <img
                src="/screenshots/Floorplan.png"
                alt="Floor planner"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white font-semibold">{t('landing.floorPlannerTitle', 'Interactive Floor Planner')}</h3>
                <p className="text-white/80 text-sm">{t('landing.floorPlannerDesc', 'Draw rooms and plan your renovation visually')}</p>
              </div>
            </div>
            {/* Overview */}
            <div className="relative rounded-xl overflow-hidden shadow-lg border border-border bg-card">
              <img
                src="/screenshots/Overview.png"
                alt="Project overview"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white font-semibold">{t('landing.overviewTitle', 'Project Overview')}</h3>
                <p className="text-white/80 text-sm">{t('landing.overviewDesc', 'See everything at a glance')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Homeowner Features Section - SECOND */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-full flex items-center justify-center">
              <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold">{t('landing.homeownerTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card p-6 rounded-xl border border-border hover:border-emerald-500/30 transition-colors">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.ho1Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.ho1Desc')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-emerald-500/30 transition-colors">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.ho2Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.ho2Desc')}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:border-emerald-500/30 transition-colors">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{t('landing.ho3Title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('landing.ho3Desc')}
              </p>
            </div>
          </div>

          {/* Homeowner screenshot - Budget tracking */}
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-emerald-200 dark:border-emerald-800/50 bg-card">
            <img
              src="/screenshots/Budget.png"
              alt="Budget tracking overview"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-12 md:py-20 text-center">
          <div className="bg-primary/5 rounded-3xl p-6 md:p-12 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
              {t('landing.ctaDescription')}
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              {t('landing.createAccount')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
