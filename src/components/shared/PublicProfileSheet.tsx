import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, MapPin, Globe, BadgeCheck, ShieldCheck, MessageCircle } from "lucide-react";
import { PROFESSIONAL_CATEGORIES } from "@/lib/professionalCategories";
import { CommentsSection } from "@/components/comments/CommentsSection";

interface ProfileInfo {
  id: string;
  name: string;
  avatar_url: string | null;
  company_name: string | null;
  contractor_category: string | null;
  company_description: string | null;
  company_city: string | null;
  company_address: string | null;
  company_postal_code: string | null;
  company_website: string | null;
  certifications: Array<{ id: string; name: string; issuer: string; year: string; custom: boolean }> | null;
}

interface PublicProfileSheetProps {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showContact?: boolean;
}

export function PublicProfileSheet({ profileId, open, onOpenChange, showContact = false }: PublicProfileSheetProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllCerts, setShowAllCerts] = useState(false);

  useEffect(() => {
    if (!profileId || !open) return;
    setLoading(true);

    supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setProfile(null);
        } else {
          setProfile(data);
        }
        setLoading(false);
      });
  }, [profileId, open]);

  const categoryLabel = profile?.contractor_category
    ? PROFESSIONAL_CATEGORIES.find(c => c.value === profile.contractor_category)?.labelKey
    : null;

  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("marketplace.publicProfile")}</SheetTitle>
          <SheetDescription>
            {showContact ? t("marketplace.contact") : t("marketplace.previewDescription")}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profile ? (
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {profile.company_name || profile.name}
                  <BadgeCheck className="h-4 w-4 text-primary" />
                </h3>
                {categoryLabel && (
                  <Badge variant="secondary">{t(categoryLabel)}</Badge>
                )}
              </div>
            </div>

            {profile.company_description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.company_description}</p>
            )}

            {profile.certifications && profile.certifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t("certifications.title")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllCerts ? profile.certifications : profile.certifications.slice(0, 6)).map((cert) => (
                    <Badge key={cert.id} variant="outline" className="text-xs">
                      {cert.name}
                    </Badge>
                  ))}
                </div>
                {profile.certifications.length > 6 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowAllCerts(prev => !prev)}
                  >
                    {showAllCerts
                      ? t("certifications.showLess")
                      : t("certifications.showAll", { count: profile.certifications.length })}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm">
              {profile.company_city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    {[profile.company_address, profile.company_postal_code, profile.company_city]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
              {profile.company_website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4 shrink-0" />
                  <a
                    href={profile.company_website.startsWith("http") ? profile.company_website : `https://${profile.company_website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {t("marketplace.visitWebsite")}
                  </a>
                </div>
              )}
            </div>

            {showContact && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {t("marketplace.sendMessage")}
                  </h4>
                  <CommentsSection
                    entityId={profile.id}
                    entityType="professional_message"
                    projectId=""
                    chatMode
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{t("errors.profileNotFound")}</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
