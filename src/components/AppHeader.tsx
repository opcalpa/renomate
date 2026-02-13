import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Settings, Globe, Lightbulb, MessageSquare, Search, FolderOpen, ChevronDown, MoreHorizontal, Users, FileText } from "lucide-react";
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

interface SimpleQuote {
  id: string;
  title: string;
  project_name: string | null;
}

interface AppHeaderProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  onSignOut?: () => void;
  children?: React.ReactNode;
  isGuest?: boolean;
}

export const AppHeader = ({ userName, userEmail, avatarUrl, onSignOut, children, isGuest = false }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { user } = useAuthSession();
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [quotes, setQuotes] = useState<SimpleQuote[]>([]);
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
    // Skip data fetching for guest users
    if (!user || isGuest) return;

    // Fetch projects
    supabase
      .from("projects")
      .select("id, name")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
      });

    // Fetch quotes with project names
    supabase
      .from("quotes")
      .select("id, title, project:projects(name)")
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) {
          setQuotes(data.map(q => ({
            id: q.id,
            title: q.title,
            project_name: (q.project as { name: string } | null)?.name || null,
          })));
        }
      });
  }, [user, isGuest]);

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

  const projectsDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium">
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">{t('nav.start')}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover z-[100]">
        {/* Min startsida */}
        <DropdownMenuItem onClick={() => navigate("/start")} className="cursor-pointer font-medium">
          {t('nav.myStart')}
        </DropdownMenuItem>

        {/* Mina Projekt */}
        {projects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/start#projekt")}
              className="cursor-pointer text-xs text-muted-foreground uppercase tracking-wide"
            >
              {t('nav.myProjects')}
            </DropdownMenuItem>
            {projects.map((proj) => (
              <DropdownMenuItem
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="cursor-pointer pl-4"
              >
                <span className="truncate">{proj.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Mina Offerter */}
        <DropdownMenuSeparator />
        {quotes.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              <span>{t('nav.myQuotes')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              {quotes.map((quote) => (
                <DropdownMenuItem
                  key={quote.id}
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                  className="cursor-pointer flex flex-col items-start"
                >
                  <span className="truncate font-medium">{quote.title}</span>
                  {quote.project_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {quote.project_name}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem
            onClick={() => navigate("/start#pipeline")}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>{t('nav.myQuotes')}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center gap-2 md:gap-4">
        <div
          className="flex items-center cursor-pointer shrink-0"
          onClick={() => navigate("/start")}
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
                <DropdownMenuItem onClick={() => navigate("/start")} className="cursor-pointer">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>{t('nav.myStart')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isProfessional && (
                  <DropdownMenuItem onClick={() => navigate("/clients")} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{t('clients.title')}</span>
                  </DropdownMenuItem>
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
                    <DropdownMenuItem onClick={() => navigate("/clients")} className="cursor-pointer">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{t('clients.title')}</span>
                    </DropdownMenuItem>
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
              {!isGuest && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
              {isGuest ? (
                <DropdownMenuItem onClick={() => navigate("/auth")} className="cursor-pointer text-primary">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('common.signIn')}</span>
                </DropdownMenuItem>
              ) : onSignOut ? (
                <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('common.signOut')}</span>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
