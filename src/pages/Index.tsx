import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, Calendar, ArrowRight, Play } from "lucide-react";
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
        <section className="container mx-auto px-4 py-12 md:py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            {t('landing.heroTitle')}
            <br />
            <span className="text-primary">{t('landing.heroSubtitle')}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('landing.heroDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              {t('landing.getStarted')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={handleDemoProject}>
              <Play className="mr-2 h-5 w-5" />
              {t('landing.demoProject', 'Demo project')}
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-2xl border border-border card-elevated">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing.feature1Title')}</h3>
              <p className="text-muted-foreground">
                {t('landing.feature1Description')}
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border card-elevated">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing.feature2Title')}</h3>
              <p className="text-muted-foreground">
                {t('landing.feature2Description')}
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border card-elevated">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('landing.feature3Title')}</h3>
              <p className="text-muted-foreground">
                {t('landing.feature3Description')}
              </p>
            </div>
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
