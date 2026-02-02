import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, MapPin, List, Map, BadgeCheck } from "lucide-react";
import { PROFESSIONAL_CATEGORIES } from "@/lib/professionalCategories";
import { PublicProfileSheet } from "@/components/shared/PublicProfileSheet";
import { ProfessionalsMap } from "@/components/marketplace/ProfessionalsMap";

interface Professional {
  id: string;
  name: string;
  avatar_url: string | null;
  company_name: string | null;
  contractor_category: string | null;
  company_city: string | null;
  company_description: string | null;
  latitude: number | null;
  longitude: number | null;
}

const FindProfessionals = () => {
  const { user, loading: authLoading } = useAuthSession();
  useProfileLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchProfessionals();
  }, [debouncedSearch, categoryFilter]);

  const fetchProfessionals = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, name, avatar_url, company_name, contractor_category, company_city, company_description, latitude, longitude")
      .eq("is_professional", true);

    if (categoryFilter !== "all") {
      query = query.eq("contractor_category", categoryFilter);
    }

    if (debouncedSearch.trim()) {
      const s = `%${debouncedSearch.trim()}%`;
      query = query.or(`company_name.ilike.${s},contractor_category.ilike.${s},company_description.ilike.${s},company_city.ilike.${s}`);
    }

    const { data, error } = await query.order("company_name", { ascending: true });

    if (error) {
      console.error("Error fetching professionals:", error);
    }
    setProfessionals(data || []);
    setLoading(false);
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    setSheetOpen(true);
  };

  const [profile, setProfile] = useState<{ name?: string; email?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, email, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name}
        userEmail={profile?.email || user?.email}
        avatarUrl={profile?.avatar_url || undefined}
        onSignOut={async () => {
          await supabase.auth.signOut();
          navigate("/auth");
        }}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">{t("marketplace.findProfessionals")}</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("marketplace.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("marketplace.allCategories")}</SelectItem>
              {PROFESSIONAL_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {t(cat.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : professionals.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{t("marketplace.noResults")}</p>
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {professionals.map(pro => {
              const catLabel = PROFESSIONAL_CATEGORIES.find(c => c.value === pro.contractor_category)?.labelKey;
              const initials = pro.name
                ? pro.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                : "?";
              return (
                <Card
                  key={pro.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectProfile(pro.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={pro.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate flex items-center gap-1">
                          {pro.company_name || pro.name}
                          <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        </p>
                        {catLabel && <Badge variant="secondary" className="text-xs">{t(catLabel)}</Badge>}
                      </div>
                    </div>
                    {pro.company_city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {pro.company_city}
                      </div>
                    )}
                    {pro.company_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{pro.company_description}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <ProfessionalsMap professionals={professionals} onSelectProfile={handleSelectProfile} />
        )}
      </main>

      <PublicProfileSheet
        profileId={selectedProfileId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        showContact
      />
    </div>
  );
};

export default FindProfessionals;
