import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Save, DollarSign, Info } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Default values state
  const [currency, setCurrency] = useState<string>("SEK");

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setProfile(profileData);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const loadSettings = () => {
    // Load from localStorage
    const savedCurrency = localStorage.getItem("admin_currency");
    if (savedCurrency) setCurrency(savedCurrency);
  };

  const handleSave = () => {
    try {
      // Save to localStorage
      localStorage.setItem("admin_currency", currency);

      toast({
        title: t('admin.settingsSaved'),
        description: t('admin.settingsSavedDescription'),
      });
    } catch (error) {
      toast({
        title: t('admin.saveError'),
        description: t('admin.saveErrorDescription'),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold">Renomate</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => navigate("/start")}
          >
            <Settings className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-semibold">{t('admin.title')}</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/start")}>
            {t('admin.backToProjects')}
          </Button>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
            <p className="text-muted-foreground">{t('admin.manageDefaults')}</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {t('admin.canvasSettingsMoved', 'Canvas-inställningar har flyttats')}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('admin.canvasSettingsMovedDescription', 'Väggtjocklek, vägghöjd och skala finns nu i Canvas Settings-menyn direkt i ritverktyget.')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('admin.economy')}
            </CardTitle>
            <CardDescription>
              {t('admin.configureDefaults')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currency">
                {t('admin.defaultCurrency')}
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEK">SEK (kr)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="NOK">NOK (kr)</SelectItem>
                  <SelectItem value="DKK">DKK (kr)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('admin.currencyDescription')}
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button onClick={handleSave} className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {t('admin.saveDefaults')}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Admin;
