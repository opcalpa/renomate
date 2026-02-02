import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Settings, Globe, Lightbulb, MessageSquare, Search, FolderOpen, ChevronDown, MoreHorizontal, Briefcase, FileText, Plus, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsProfessional } from "@/hooks/useIsProfessional";

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'sv', name: 'Swedish', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'de', name: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'pl', name: 'Polish', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'uk', name: 'Ukrainian', flag: '\u{1F1FA}\u{1F1E6}' },
  { code: 'ro', name: 'Romanian', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'lt', name: 'Lithuanian', flag: '\u{1F1F1}\u{1F1F9}' },
  { code: 'et', name: 'Estonian', flag: '\u{1F1EA}\u{1F1EA}' },
];

interface SimpleProject {
  id: string;
  name: string;
}

interface SavedQuote {
  id: string;
  title: string;
  status: string;
}

interface AppHeaderProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onSignOut: () => void;
  children?: React.ReactNode;
}

export const AppHeader = ({ userName, userEmail, avatarUrl, onSignOut, children }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { user } = useAuthSession();
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const { isProfessional } = useIsProfessional();

  const isProjectMode = !!children;

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("id, name")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
      });
    supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()
      .then(({ data: profile }) => {
        if (!profile) return;
        supabase
          .from("quotes")
          .select("id, title, status")
          .eq("creator_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20)
          .then(({ data }) => {
            if (data) setSavedQuotes(data);
          });
      });
  }, [user]);

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ language_preference: langCode })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Error updating language preference:", error);
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const siteNavLinks = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 text-sm ${isActive("/find-pros") ? "bg-accent" : ""}`}
        onClick={() => navigate("/find-pros")}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('marketplace.findProfessionals')}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 text-sm ${isActive("/tips") ? "bg-accent" : ""}`}
        onClick={() => navigate("/tips")}
      >
        <Lightbulb className="h-4 w-4" />
        <span className="hidden sm:inline">{t('nav.tips')}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1.5 text-sm ${isActive("/feedback") ? "bg-accent" : ""}`}
        onClick={() => navigate("/feedback")}
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">{t('nav.feedback')}</span>
      </Button>
    </>
  );

  const quoteStatusLabel = (status: string) => {
    if (status === "sent") return t("quotes.shared", "Shared");
    return t(`quotes.${status}`);
  };

  const proDropdown = isProfessional ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Pro</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover z-[100]">
        <DropdownMenuLabel>{t('pro.title', 'Pro')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="mr-2 h-4 w-4" />
            {t('quotes.title')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <DropdownMenuItem onClick={() => navigate("/quotes/new")} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              {t('quotes.newQuote')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">{t('quotes.saved', 'Saved')}</DropdownMenuLabel>
            {savedQuotes.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                {t('quotes.noSavedQuotes', 'No saved quotes')}
              </DropdownMenuItem>
            ) : (
              savedQuotes.map((q) => (
                <DropdownMenuItem
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate mr-2">{q.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    q.status === "draft" ? "bg-gray-100 text-gray-600" :
                    q.status === "sent" ? "bg-blue-100 text-blue-600" :
                    q.status === "accepted" ? "bg-green-100 text-green-600" :
                    q.status === "rejected" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {quoteStatusLabel(q.status)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/clients")} className="cursor-pointer">
          <Users className="mr-2 h-4 w-4" />
          {t('clients.title')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const projectsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium">
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">{t('nav.projects')}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover z-[100]">
        <DropdownMenuLabel>{t('nav.projects')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer font-medium">
          {t('projects.title')}
        </DropdownMenuItem>
        {projects.length > 0 && <DropdownMenuSeparator />}
        {projects.map((proj) => (
          <DropdownMenuItem
            key={proj.id}
            onClick={() => navigate(`/projects/${proj.id}`)}
            className="cursor-pointer"
          >
            <span className="truncate">{proj.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center gap-2 md:gap-4">
        <div
          className="flex items-center cursor-pointer shrink-0"
          onClick={() => navigate("/projects")}
        >
          <img
            src="/logo.png"
            alt="Renomate"
            className="h-9 w-auto"
          />
        </div>

        {isProjectMode ? (
          /* Project mode: children contain project tabs */
          <div className="flex-1 min-w-0">
            {children}
          </div>
        ) : (
          /* Default mode: show projects dropdown + site nav links */
          <div className="flex-1 flex items-center gap-1">
            {projectsDropdown}
            {proDropdown}
            <div className="hidden md:flex items-center gap-1">
              {siteNavLinks}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />

          {/* In project mode, show a "more" menu with site nav links */}
          {isProjectMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>{t('projects.title')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isProfessional && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FileText className="mr-2 h-4 w-4" />
                      {t('quotes.title')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64">
                      <DropdownMenuItem onClick={() => navigate("/quotes/new")} className="cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('quotes.newQuote')}
                      </DropdownMenuItem>
                      {savedQuotes.length > 0 && <DropdownMenuSeparator />}
                      {savedQuotes.map((q) => (
                        <DropdownMenuItem
                          key={q.id}
                          onClick={() => navigate(`/quotes/${q.id}`)}
                          className="cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate mr-2">{q.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            q.status === "draft" ? "bg-gray-100 text-gray-600" :
                            q.status === "sent" ? "bg-blue-100 text-blue-600" :
                            q.status === "accepted" ? "bg-green-100 text-green-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {quoteStatusLabel(q.status)}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={() => navigate("/find-pros")} className="cursor-pointer">
                  <Search className="mr-2 h-4 w-4" />
                  <span>{t('marketplace.findProfessionals')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/tips")} className="cursor-pointer">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  <span>{t('nav.tips')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/feedback")} className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{t('nav.feedback')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile "more" menu for default mode (site links hidden on small screens) */}
          {!isProjectMode && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isProfessional && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="mr-2 h-4 w-4" />
                        {t('quotes.title')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-64">
                        <DropdownMenuItem onClick={() => navigate("/quotes/new")} className="cursor-pointer">
                          <Plus className="mr-2 h-4 w-4" />
                          {t('quotes.newQuote')}
                        </DropdownMenuItem>
                        {savedQuotes.length > 0 && <DropdownMenuSeparator />}
                        {savedQuotes.map((q) => (
                          <DropdownMenuItem
                            key={q.id}
                            onClick={() => navigate(`/quotes/${q.id}`)}
                            className="cursor-pointer flex items-center justify-between"
                          >
                            <span className="truncate mr-2">{q.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              q.status === "draft" ? "bg-gray-100 text-gray-600" :
                              q.status === "sent" ? "bg-blue-100 text-blue-600" :
                              q.status === "accepted" ? "bg-green-100 text-green-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {quoteStatusLabel(q.status)}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/find-pros")} className="cursor-pointer">
                    <Search className="mr-2 h-4 w-4" />
                    <span>{t('marketplace.findProfessionals')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/tips")} className="cursor-pointer">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    <span>{t('nav.tips')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/feedback")} className="cursor-pointer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>{t('nav.feedback')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 md:h-9 md:w-9 rounded-full">
                <Avatar className="h-10 w-10 md:h-9 md:w-9">
                  <AvatarImage src={avatarUrl} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail || ''}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>{t('nav.profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>{currentLanguage.flag} {t('nav.language', 'Language')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={i18n.language} onValueChange={handleLanguageChange}>
                    {LANGUAGES.map((lang) => (
                      <DropdownMenuRadioItem key={lang.code} value={lang.code} className="cursor-pointer">
                        <span className="mr-2">{lang.flag}</span>
                        {t(`languages.${lang.code}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('common.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
