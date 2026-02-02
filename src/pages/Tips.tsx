import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, ExternalLink, Lightbulb, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = [
  "permits",
  "notifications",
  "taxDeductions",
  "contracts",
  "insurance",
  "condo",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Article {
  id: string;
  category: Category;
  titleKey: string;
  contentKey: string;
  sourceUrl?: string;
  sourceLabelKey?: string;
}

const ARTICLES: Article[] = [
  {
    id: "1",
    category: "permits",
    titleKey: "tips.articles.whenBuildingPermit.title",
    contentKey: "tips.articles.whenBuildingPermit.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/bygglov/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "2",
    category: "permits",
    titleKey: "tips.articles.permitProcess.title",
    contentKey: "tips.articles.permitProcess.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/bygglov/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "3",
    category: "permits",
    titleKey: "tips.articles.permitCost.title",
    contentKey: "tips.articles.permitCost.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/bygglov/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "4",
    category: "notifications",
    titleKey: "tips.articles.whenNotification.title",
    contentKey: "tips.articles.whenNotification.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/anmalan/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "5",
    category: "notifications",
    titleKey: "tips.articles.notificationVsPermit.title",
    contentKey: "tips.articles.notificationVsPermit.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/anmalan/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "6",
    category: "notifications",
    titleKey: "tips.articles.technicalConsultation.title",
    contentKey: "tips.articles.technicalConsultation.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/anmalan/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "7",
    category: "taxDeductions",
    titleKey: "tips.articles.rotDeduction.title",
    contentKey: "tips.articles.rotDeduction.content",
    sourceUrl: "https://www.skatteverket.se/privat/fastigheterochbostad/rotochrutarbete.4.2e56d4ba1202f95012080002966.html",
    sourceLabelKey: "tips.sources.skatteverket",
  },
  {
    id: "8",
    category: "taxDeductions",
    titleKey: "tips.articles.rotRules.title",
    contentKey: "tips.articles.rotRules.content",
    sourceUrl: "https://www.skatteverket.se/privat/fastigheterochbostad/rotochrutarbete.4.2e56d4ba1202f95012080002966.html",
    sourceLabelKey: "tips.sources.skatteverket",
  },
  {
    id: "9",
    category: "taxDeductions",
    titleKey: "tips.articles.rotEligible.title",
    contentKey: "tips.articles.rotEligible.content",
    sourceUrl: "https://www.skatteverket.se/privat/fastigheterochbostad/rotochrutarbete.4.2e56d4ba1202f95012080002966.html",
    sourceLabelKey: "tips.sources.skatteverket",
  },
  {
    id: "10",
    category: "contracts",
    titleKey: "tips.articles.contractTypes.title",
    contentKey: "tips.articles.contractTypes.content",
    sourceUrl: "https://www.konsumentverket.se/for-foretag/regler-per-omrade/hantverkartjanster/",
    sourceLabelKey: "tips.sources.konsumentverket",
  },
  {
    id: "11",
    category: "contracts",
    titleKey: "tips.articles.quotesOffers.title",
    contentKey: "tips.articles.quotesOffers.content",
    sourceUrl: "https://www.konsumentverket.se/for-foretag/regler-per-omrade/hantverkartjanster/",
    sourceLabelKey: "tips.sources.konsumentverket",
  },
  {
    id: "12",
    category: "contracts",
    titleKey: "tips.articles.consumerRights.title",
    contentKey: "tips.articles.consumerRights.content",
    sourceUrl: "https://www.hallakonsument.se/",
    sourceLabelKey: "tips.sources.hallakonsument",
  },
  {
    id: "13",
    category: "insurance",
    titleKey: "tips.articles.contractorInsurance.title",
    contentKey: "tips.articles.contractorInsurance.content",
    sourceUrl: "https://www.konsumenternas.se/",
    sourceLabelKey: "tips.sources.konsumenternas",
  },
  {
    id: "14",
    category: "insurance",
    titleKey: "tips.articles.warrantyRules.title",
    contentKey: "tips.articles.warrantyRules.content",
    sourceUrl: "https://www.konsumentverket.se/for-foretag/regler-per-omrade/hantverkartjanster/",
    sourceLabelKey: "tips.sources.konsumentverket",
  },
  {
    id: "15",
    category: "insurance",
    titleKey: "tips.articles.homeInsurance.title",
    contentKey: "tips.articles.homeInsurance.content",
  },
  {
    id: "16",
    category: "condo",
    titleKey: "tips.articles.condoPermission.title",
    contentKey: "tips.articles.condoPermission.content",
    sourceUrl: "https://www.boverket.se/sv/byggande/bygga-nytt-om-eller-till/",
    sourceLabelKey: "tips.sources.boverket",
  },
  {
    id: "17",
    category: "condo",
    titleKey: "tips.articles.condoWetRooms.title",
    contentKey: "tips.articles.condoWetRooms.content",
  },
  {
    id: "18",
    category: "condo",
    titleKey: "tips.articles.condoLiability.title",
    contentKey: "tips.articles.condoLiability.content",
  },
];

const Tips = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile-for-header"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .single();
      return { ...data, email: user.email };
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ARTICLES.filter((a) => {
      if (activeCategory && a.category !== activeCategory) return false;
      if (!q) return true;
      const title = t(a.titleKey).toLowerCase();
      const content = t(a.contentKey).toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [search, activeCategory, t]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name ?? undefined}
        userEmail={profile?.email ?? undefined}
        avatarUrl={profile?.avatar_url ?? undefined}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            <h1 className="text-3xl font-bold">{t("tips.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("tips.subtitle")}</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("tips.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >
              {t(`tips.categories.${cat}`)}
            </Badge>
          ))}
        </div>

        {/* Articles */}
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("tips.noResults")}
          </p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filtered.map((article) => (
              <AccordionItem key={article.id} value={article.id} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {t(`tips.categories.${article.category}`)}
                    </Badge>
                    <span>{t(article.titleKey)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="whitespace-pre-line text-sm text-muted-foreground mb-3">
                    {t(article.contentKey)}
                  </p>
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {t(article.sourceLabelKey!)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Disclaimer */}
        <div className="mt-10 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t("tips.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tips;
