import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Save, BadgeCheck, Eye, ShieldCheck, Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CERTIFICATION_PRESETS } from "@/lib/professionalCertifications";
import { PublicProfileSheet } from "@/components/shared/PublicProfileSheet";
import { PROFESSIONAL_CATEGORIES } from "@/lib/professionalCategories";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  language_preference: string | null;
  avatar_url: string | null;
  is_professional: boolean;
  contractor_category: string | null;
  company_name: string | null;
  company_address: string | null;
  company_city: string | null;
  company_postal_code: string | null;
  company_country: string | null;
  company_description: string | null;
  company_website: string | null;
  org_number: string | null;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

const Profile = () => {
  const { user, session, loading: authLoading, signOut } = useAuthSession();
  useProfileLanguage();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [languagePreference, setLanguagePreference] = useState("en");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Professional profile fields
  const [isProfessional, setIsProfessional] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contractorCategory, setContractorCategory] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyPostalCode, setCompanyPostalCode] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [certifications, setCertifications] = useState<Array<{ id: string; name: string; issuer: string; year: string; custom: boolean }>>([]);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setLanguagePreference(data.language_preference || "en");
      setIsProfessional(data.is_professional || false);
      setCompanyName(data.company_name || "");
      setContractorCategory(data.contractor_category || "");
      setCompanyAddress(data.company_address || "");
      setCompanyCity(data.company_city || "");
      setCompanyPostalCode(data.company_postal_code || "");
      setCompanyDescription(data.company_description || "");
      setCompanyWebsite(data.company_website || "");
      setOrgNumber(data.org_number || "");
      setCertifications(data.certifications || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate pro fields if enabling professional mode
      if (isProfessional && (!companyName.trim() || !contractorCategory)) {
        toast({
          title: t('errors.generic'),
          description: t('profile.proFieldsRequired'),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Geocode address if professional and address fields present
      let lat: number | null = null;
      let lng: number | null = null;
      if (isProfessional && (companyAddress || companyCity)) {
        try {
          const parts = [companyAddress, companyPostalCode, companyCity, "Sweden"].filter(Boolean).join(", ");
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1`,
            { headers: { "User-Agent": "Renomate/1.0" } }
          );
          const geo = await res.json();
          if (geo.length > 0) {
            lat = parseFloat(geo[0].lat);
            lng = parseFloat(geo[0].lon);
          }
        } catch {
          // Geocoding failure is non-critical
        }
      }

      const updateData: Record<string, unknown> = {
        name,
        phone,
        language_preference: languagePreference,
        is_professional: isProfessional,
        company_name: isProfessional ? companyName : null,
        contractor_category: isProfessional ? contractorCategory : null,
        company_address: isProfessional ? companyAddress : null,
        company_city: isProfessional ? companyCity : null,
        company_postal_code: isProfessional ? companyPostalCode : null,
        company_description: isProfessional ? companyDescription : null,
        company_website: isProfessional ? companyWebsite : null,
        org_number: isProfessional ? orgNumber : null,
        certifications: isProfessional ? certifications : [],
      };

      if (lat !== null && lng !== null) {
        updateData.latitude = lat;
        updateData.longitude = lng;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Update i18n language if changed
      if (languagePreference !== i18n.language) {
        await i18n.changeLanguage(languagePreference);
      }

      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDescription'),
      });
      
      fetchProfile();
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t('errors.generic'),
        description: t('profile.passwordsDoNotMatch'),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('errors.generic'),
        description: t('profile.passwordTooShort'),
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: t('profile.passwordChanged'),
        description: t('profile.passwordChangedDescription'),
      });
      
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name}
        userEmail={profile?.email || user?.email}
        avatarUrl={profile?.avatar_url || undefined}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">{t('profile.title')}</h2>
          <p className="text-muted-foreground">{t('profile.description')}</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.profileInfo')}</CardTitle>
              <CardDescription>{t('profile.profileInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('common.name')}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('common.name')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('common.email')}</Label>
                  <Input
                    id="email"
                    value={profile?.email || user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('profile.emailNotChangeable')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('common.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{t('common.role')}</Label>
                  <Input
                    id="role"
                    value={profile?.role || "homeowner"}
                    disabled
                    className="bg-muted capitalize"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t('profile.defaultLanguage')}</Label>
                  <Select value={languagePreference} onValueChange={setLanguagePreference}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{t(`languages.${lang.code}`)}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
          </Card>

          {/* Professional Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    {t('profile.professionalProfile')}
                    {isProfessional && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                        {t('profile.proBadge')}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t('profile.professionalProfileDescription')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('profile.enableProfessional')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.enableProfessionalDescription')}
                  </p>
                </div>
                <Switch
                  checked={isProfessional}
                  onCheckedChange={setIsProfessional}
                />
              </div>

              {isProfessional && (
                <>
                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">{t('profile.companyName')} *</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={t('profile.companyNamePlaceholder')}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgNumber">{t('profile.orgNumber')}</Label>
                      <Input
                        id="orgNumber"
                        value={orgNumber}
                        onChange={(e) => setOrgNumber(e.target.value)}
                        placeholder={t('profile.orgNumberPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contractorCategory">{t('profile.professionalCategory')} *</Label>
                      <Select value={contractorCategory} onValueChange={setContractorCategory}>
                        <SelectTrigger id="contractorCategory">
                          <SelectValue placeholder={t('profile.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          {PROFESSIONAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {t(cat.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="companyAddress">{t('profile.companyAddress')}</Label>
                      <Input
                        id="companyAddress"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder={t('profile.companyAddressPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyCity">{t('profile.companyCity')}</Label>
                      <Input
                        id="companyCity"
                        value={companyCity}
                        onChange={(e) => setCompanyCity(e.target.value)}
                        placeholder={t('profile.companyCityPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyPostalCode">{t('profile.companyPostalCode')}</Label>
                      <Input
                        id="companyPostalCode"
                        value={companyPostalCode}
                        onChange={(e) => setCompanyPostalCode(e.target.value)}
                        placeholder={t('profile.companyPostalCodePlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyDescription">{t('profile.companyDescription')}</Label>
                    <Textarea
                      id="companyDescription"
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder={t('profile.companyDescriptionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">{t('profile.companyWebsite')}</Label>
                    <Input
                      id="companyWebsite"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder={t('profile.companyWebsitePlaceholder')}
                    />
                  </div>

                  <Separator />

                  {/* Certifications */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {t('certifications.title')}
                    </h3>

                    {/* Preset certifications */}
                    {contractorCategory && CERTIFICATION_PRESETS[contractorCategory] && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('certifications.preset')}</Label>
                        <div className="space-y-2">
                          {CERTIFICATION_PRESETS[contractorCategory].map((preset) => {
                            const isChecked = certifications.some(c => !c.custom && c.name === preset.name);
                            return (
                              <div key={preset.name} className="flex items-center gap-2">
                                <Checkbox
                                  id={`cert-${preset.name}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setCertifications(prev => [...prev, {
                                        id: crypto.randomUUID(),
                                        name: preset.name,
                                        issuer: preset.issuer,
                                        year: "",
                                        custom: false,
                                      }]);
                                    } else {
                                      setCertifications(prev => prev.filter(c => !(c.name === preset.name && !c.custom)));
                                    }
                                  }}
                                />
                                <label htmlFor={`cert-${preset.name}`} className="text-sm cursor-pointer">
                                  {t(preset.labelKey)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom certifications */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t('certifications.custom')}</Label>
                      {certifications.filter(c => c.custom).map((cert) => (
                        <div key={cert.id} className="flex items-center gap-2">
                          <Input
                            value={cert.name}
                            onChange={(e) => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, name: e.target.value } : c))}
                            placeholder={t('certifications.name')}
                            className="flex-1"
                          />
                          <Input
                            value={cert.issuer}
                            onChange={(e) => setCertifications(prev => prev.map(c => c.id === cert.id ? { ...c, issuer: e.target.value } : c))}
                            placeholder={t('certifications.issuer')}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setCertifications(prev => prev.filter(c => c.id !== cert.id))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCertifications(prev => [...prev, {
                          id: crypto.randomUUID(),
                          name: "",
                          issuer: "",
                          year: "",
                          custom: true,
                        }])}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t('certifications.addCustom')}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {t('marketplace.publicProfile')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Save button for all profile fields */}
          <Button type="submit" disabled={saving} className="w-full" size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('profile.saveChanges')}
              </>
            )}
          </Button>
        </form>

        {/* Change Password */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('profile.changePassword')}</CardTitle>
            <CardDescription>{t('profile.changePasswordDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('profile.newPasswordPlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('profile.confirmPasswordPlaceholder')}
                  required
                />
              </div>

              <Button type="submit" disabled={changingPassword} className="w-full">
                {changingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('profile.changingPassword')}
                  </>
                ) : (
                  t('profile.changePassword')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <PublicProfileSheet
        profileId={profile?.id || null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        showContact={false}
      />
    </div>
  );
};

export default Profile;
