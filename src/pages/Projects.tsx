import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { useOnboarding } from "@/hooks/useOnboarding";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight, ChevronLeft, Users, BookOpen, Trash2, Zap, Upload, FileText, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { WelcomeModal, QuickStartChoice } from "@/components/onboarding/WelcomeModal";
import { WithHotspot } from "@/components/onboarding/Hotspot";
import { PageLoadingSkeleton } from "@/components/ui/skeleton-screens";
import { seedDemoProject, isDemoProject, hasDemoProject } from "@/services/demoProjectService";
import { LeadsPipelineSection } from "@/components/pipeline";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  project_type?: string | null;
  owner_id?: string | null;
}

const Projects = () => {
  const { user, signOut, loading: authLoading } = useAuthSession();
  useProfileLanguage();
  const { t } = useTranslation();
  const onboarding = useOnboarding();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [newProjectPostalCode, setNewProjectPostalCode] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("");
  const [newProjectType, setNewProjectType] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [createStep, setCreateStep] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingText, setExtractingText] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
    } else {
      fetchProfile();
      fetchProjects();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      setProfile(data);

      // Check if we need to show the welcome modal
      if (data && !data.onboarding_welcome_completed) {
        setShowWelcomeModal(true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Auto-seed demo project for users who don't have one
      const hasDemo = await hasDemoProject(profile.id);
      if (!hasDemo) {
        await seedDemoProject(profile.id);
      }

      // Fetch both owned projects and shared projects
      // RLS will handle access control, so we don't need to filter by owner_id
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out demo projects that don't belong to current user
      // (system_admins can see all projects via RLS, but shouldn't see other users' demos)
      const filteredProjects = (data || []).filter(
        (p) => p.project_type !== "demo_project" || p.owner_id === profile.id
      );
      setProjects(filteredProjects);
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newProjectName,
          description: newProjectDescription || null,
          owner_id: profile.id,
          address: newProjectAddress || null,
          postal_code: newProjectPostalCode || null,
          city: newProjectCity || null,
          project_type: newProjectType || null,
          start_date: newProjectStartDate || null,
          total_budget: newProjectBudget ? Number(newProjectBudget) : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Track project creation
      analytics.capture(AnalyticsEvents.PROJECT_CREATED, {
        has_description: Boolean(newProjectDescription),
        has_address: Boolean(newProjectAddress),
        has_budget: Boolean(newProjectBudget),
        has_start_date: Boolean(newProjectStartDate),
        project_type: newProjectType || 'none',
      });

      toast({
        title: t('projects.projectCreated'),
        description: t('projects.projectCreatedDescription'),
      });

      // Mark onboarding step as complete
      onboarding.markStepComplete("project");

      setDialogOpen(false);
      setCreateStep(1);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectAddress("");
      setNewProjectPostalCode("");
      setNewProjectCity("");
      setNewProjectType("");
      setNewProjectStartDate("");
      setNewProjectBudget("");
      navigate(`/projects/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("common.error"),
        description: t("pipeline.quickQuote.fileTooLarge"),
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setExtractingText(true);

    try {
      // For text files, read directly
      if (file.type === "text/plain") {
        const text = await file.text();
        setNewProjectDescription((prev) => prev ? `${prev}\n\n${text}` : text);
        toast({
          title: t("pipeline.quickQuote.textExtracted"),
        });
      }
      // For PDFs and images, use edge function
      else if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke("extract-document-text", {
          body: {
            fileBase64: base64,
            mimeType: file.type,
            fileName: file.name,
          },
        });

        if (error) {
          console.error("Text extraction error:", error);
          toast({
            title: t("pipeline.quickQuote.extractionFailed"),
            variant: "destructive",
          });
        } else if (data?.text) {
          setNewProjectDescription((prev) => prev ? `${prev}\n\n${data.text}` : data.text);

          // Try to suggest a project name from the filename
          if (!newProjectName.trim()) {
            const suggestedName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            setNewProjectName(suggestedName);
          }

          toast({
            title: t("pipeline.quickQuote.textExtracted"),
          });
        } else {
          toast({
            title: t("pipeline.quickQuote.noTextFound"),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t("pipeline.quickQuote.unsupportedFileType"),
          variant: "destructive",
        });
        setUploadedFile(null);
      }
    } catch (err) {
      console.error("File processing error:", err);
      toast({
        title: t("pipeline.quickQuote.extractionFailed"),
        variant: "destructive",
      });
    } finally {
      setExtractingText(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleWelcomeComplete = async (userType: "homeowner" | "contractor", quickStart?: QuickStartChoice) => {
    setShowWelcomeModal(false);

    // Refresh projects - fetchProjects() already handles demo seeding
    await fetchProjects();

    // Refresh onboarding state
    onboarding.refresh();

    // Handle quick start choice
    if (quickStart === "blank") {
      // Open the create project dialog
      setDialogOpen(true);
    } else if (quickStart === "import") {
      // Open the create project dialog (now includes AI import option)
      setDialogOpen(true);
    } else {
      // "explore" - just show toast about demo project
      toast({
        title: t("demoProject.badge"),
        description: t("demoProject.description"),
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast({
        title: t("projects.deleteSuccess"),
        description: t("projects.deleteSuccessDescription", { name: deleteTarget.name }),
      });
      setDeleteTarget(null);
      fetchProjects();
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const profileId = profile?.id as string | undefined;

  // Show loading while auth or data is loading
  if (authLoading || loading) {
    return <PageLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name}
        userEmail={profile?.email || user?.email}
        avatarUrl={profile?.avatar_url}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8">
        {!onboarding.loading && !onboarding.isDismissed && !onboarding.isComplete && onboarding.steps.length > 0 && (
          <OnboardingChecklist
            steps={onboarding.steps}
            completedCount={onboarding.completedCount}
            totalSteps={onboarding.totalSteps}
            isComplete={onboarding.isComplete}
            onDismiss={onboarding.dismiss}
            onCreateProject={() => setDialogOpen(true)}
            firstProjectId={projects[0]?.id}
            currentStepKey={onboarding.currentStepKey}
          />
        )}

        {/* Pipeline Section - Leads & Quotes */}
        <section id="pipeline">
          <LeadsPipelineSection onRefetch={fetchProjects} />
        </section>

        <section id="projekt" className="scroll-mt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold mb-2">{t('projects.title')}</h2>
            <p className="text-muted-foreground">{t('projects.description')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <WithHotspot
              hotspotId="create-project"
              hotspotContent="hotspots.createProject"
              hotspotPosition="top-right"
              showOnce={true}
            >
              <Button onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('projects.newProject')}</span>
                <span className="sm:hidden">{t('common.create', 'Skapa')}</span>
              </Button>
            </WithHotspot>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setCreateStep(1); setNewProjectName(""); setNewProjectDescription(""); setNewProjectAddress(""); setNewProjectPostalCode(""); setNewProjectCity(""); setNewProjectType(""); setNewProjectStartDate(""); setNewProjectBudget(""); setUploadedFile(null); setUseAI(true); if (fileInputRef.current) fileInputRef.current.value = ""; } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('projects.createProjectTitle')}</DialogTitle>
                <DialogDescription>
                  {t('projects.createProjectDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                {createStep === 1 ? (
                  <>
                    {/* AI File Upload Section */}
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        {t('projects.aiImportTitle', 'Ladda upp dokument (valfritt)')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('projects.aiImportHint', 'Ladda upp en offertförfrågan, beskrivning eller annat dokument för att fylla i formuläret automatiskt.')}
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.pdf,image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {uploadedFile ? (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-background text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{uploadedFile.name}</span>
                          {extractingText ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={handleRemoveFile}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={extractingText}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {t('projects.selectFile', 'Välj fil')}
                        </Button>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {t('projects.orFillManually', 'eller fyll i manuellt')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">{t('projects.projectName')} *</Label>
                      <Input
                        id="name"
                        placeholder={t('projects.projectNamePlaceholder')}
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">{t('projects.address')}</Label>
                      <Input
                        id="address"
                        placeholder={t('projects.addressPlaceholder')}
                        value={newProjectAddress}
                        onChange={(e) => setNewProjectAddress(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">{t('projects.postalCode')}</Label>
                        <Input
                          id="postalCode"
                          placeholder="123 45"
                          value={newProjectPostalCode}
                          onChange={(e) => setNewProjectPostalCode(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">{t('projects.city')}</Label>
                        <Input
                          id="city"
                          placeholder={t('projects.cityPlaceholder')}
                          value={newProjectCity}
                          onChange={(e) => setNewProjectCity(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t('projects.projectDescription')}</Label>
                      <Textarea
                        id="description"
                        placeholder={t('projects.projectDescriptionPlaceholder')}
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={() => setCreateStep(2)}
                        disabled={!newProjectName.trim()}
                      >
                        {t('projects.next')}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        type="submit"
                        variant="outline"
                        className="flex-1"
                        disabled={creating || !newProjectName.trim()}
                      >
                        {creating ? t('projects.creating') : t('projects.skipAndCreate')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t('projects.projectType')}</Label>
                      <Select value={newProjectType} onValueChange={setNewProjectType}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('projects.selectProjectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen_renovation">{t('projects.types.kitchenRenovation')}</SelectItem>
                          <SelectItem value="bathroom_renovation">{t('projects.types.bathroomRenovation')}</SelectItem>
                          <SelectItem value="full_renovation">{t('projects.types.fullRenovation')}</SelectItem>
                          <SelectItem value="extension">{t('projects.types.extension')}</SelectItem>
                          <SelectItem value="new_construction">{t('projects.types.newConstruction')}</SelectItem>
                          <SelectItem value="facade">{t('projects.types.facade')}</SelectItem>
                          <SelectItem value="roof">{t('projects.types.roof')}</SelectItem>
                          <SelectItem value="plumbing">{t('projects.types.plumbing')}</SelectItem>
                          <SelectItem value="electrical">{t('projects.types.electrical')}</SelectItem>
                          <SelectItem value="other">{t('projects.types.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{t('projects.startDate')}</Label>
                        <Input
                          type="date"
                          value={newProjectStartDate}
                          onChange={(e) => setNewProjectStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('projects.totalBudget')}</Label>
                        <Input
                          type="number"
                          placeholder="0 kr"
                          value={newProjectBudget}
                          onChange={(e) => setNewProjectBudget(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setCreateStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('projects.back')}
                      </Button>
                      <Button type="submit" className="flex-1" disabled={creating}>
                        {creating ? t('projects.creating') : t('projects.createProject')}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="max-w-lg mx-auto text-center py-12 space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-2">{t('onboarding.welcome')}</h3>
              <p className="text-muted-foreground">{t('onboarding.welcomeDescription')}</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full h-14 text-left justify-start px-6"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-5 w-5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium">{t('onboarding.createProject')}</div>
                  <div className="text-xs text-primary-foreground/70">{t('onboarding.createProjectDesc')}</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 text-left justify-start px-6"
                disabled
              >
                <Users className="h-5 w-5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium">{t('onboarding.hasInvitation')}</div>
                  <div className="text-xs text-muted-foreground">{t('onboarding.hasInvitationDesc')}</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const isDemo = isDemoProject(project.project_type);
              const isLead = project.project_type === "lead";
              return (
                <Card
                  key={project.id}
                  className={`cursor-pointer card-elevated overflow-hidden ${isDemo ? 'ring-2 ring-primary/30' : ''} ${isLead ? 'ring-2 ring-amber-400/50' : ''}`}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {isDemo && (
                    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      <span>Demo</span>
                      <span className="text-primary-foreground/70 font-normal">– {t("demoProject.description")}</span>
                    </div>
                  )}
                  {isLead && !isDemo && (
                    <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
                      <Zap className="h-4 w-4" />
                      <span>Lead</span>
                      <span className="text-white/70 font-normal">– {t("projects.leadDescription")}</span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="space-y-1">
                      {project.address && (
                        <span className="block">
                          {[project.address, project.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {project.description ? (
                        <span className="block">
                          {project.description.length > 150 && !expandedDescriptions.has(project.id) ? (
                            <>
                              {project.description.slice(0, 150).trim()}...
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDescriptions(prev => new Set([...prev, project.id]));
                                }}
                                className="inline-flex items-center gap-0.5 ml-1 text-primary hover:underline"
                              >
                                {t('projects.showMore')}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </>
                          ) : project.description.length > 150 ? (
                            <>
                              {project.description}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDescriptions(prev => {
                                    const next = new Set(prev);
                                    next.delete(project.id);
                                    return next;
                                  });
                                }}
                                className="inline-flex items-center gap-0.5 ml-1 text-primary hover:underline"
                              >
                                {t('projects.showLess')}
                                <ChevronUp className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            project.description
                          )}
                        </span>
                      ) : !project.address && (
                        <span className="block text-muted-foreground">{t('projects.noDescription')}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span className="capitalize">{project.status}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {profileId && project.owner_id === profileId && !isDemo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(project);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </section>
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("projects.deleteWarning", { name: deleteTarget?.name })}
              </span>
              <span className="block font-medium text-destructive">
                {t("projects.deleteIrreversible")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome modal for new users */}
      {profile?.id && (
        <WelcomeModal
          open={showWelcomeModal}
          profileId={profile.id as string}
          onComplete={handleWelcomeComplete}
        />
      )}
    </div>
  );
};

export default Projects;