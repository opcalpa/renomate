import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGuestMode } from "@/hooks/useGuestMode";
import { analytics, AnalyticsEvents } from "@/lib/analytics";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight, ChevronLeft, Users, User, BookOpen, Trash2, Upload, FileText, X, Loader2, Sparkles, ChevronDown, ChevronUp, MessageSquare, Mail, LayoutGrid, List, Settings2, ShieldCheck, GanttChart } from "lucide-react";
import { PortfolioTimeline } from "@/components/project/PortfolioTimeline";
import { TaskEditDialog } from "@/components/project/TaskEditDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { WelcomeModal, QuickStartChoice } from "@/components/onboarding/WelcomeModal";
import { GuidedSetupWizard } from "@/components/onboarding/GuidedSetupWizard";
import { PageLoadingSkeleton } from "@/components/ui/skeleton-screens";
import { isDemoProject } from "@/services/demoProjectService";
import { normalizeStatus, STATUS_META } from "@/lib/projectStatus";
import { formatCurrency } from "@/lib/currency";
import { LeadsPipelineSection } from "@/components/pipeline";
import { FinancialAnalysisSection } from "@/components/project/FinancialAnalysisSection";
import { AIProjectImportModal } from "@/components/project/AIProjectImportModal";
import { HomeownerYearlyAnalysis } from "@/components/project/HomeownerYearlyAnalysis";
import { DashboardStrip } from "@/components/project/DashboardStrip";
import { ProjectGridCard } from "@/components/project/ProjectGridCard";
import { GuestBanner } from "@/components/guest";
import { CreateIntakeDialog } from "@/components/intake/CreateIntakeDialog";
import {
  getGuestProjects,
  saveGuestProject,
  saveGuestRoom,
  saveGuestTask,
  deleteGuestProject,
  canCreateGuestProject,
} from "@/services/guestStorageService";
import { GUEST_MAX_PROJECTS } from "@/types/guest.types";

const DashboardRedesign = lazy(() => import("@/components/dashboard/DashboardRedesign"));
const OwnerStart = lazy(() => import("@/pages/owner/OwnerStart"));
import { ResourcePlanningView } from "@/components/project/ResourcePlanningView";

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
  cover_image_url?: string | null;
}

const Projects = () => {
  const { user, signOut, loading: authLoading } = useAuthSession();
  const { isGuest, refreshStorageUsage } = useGuestMode();
  useProfileLanguage();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjectIds, setSharedProjectIds] = useState<Set<string>>(new Set());
  const [showAdminProjects, setShowAdminProjects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [guestRole, setGuestRole] = useState<string | null>(() =>
    isGuest ? localStorage.getItem("guest_user_type") : null
  );

  const handleGuestRoleChange = useCallback((role: string) => {
    localStorage.setItem("guest_user_type", role);
    setGuestRole(role);
  }, []);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectAddress, setNewProjectAddress] = useState("");
  const [newProjectPostalCode, setNewProjectPostalCode] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("");
  const [newProjectType, setNewProjectType] = useState("");
  const [newProjectStartDate, setNewProjectStartDate] = useState("");
  const [newProjectFinishDate, setNewProjectFinishDate] = useState("");
  const [newProjectBudget, setNewProjectBudget] = useState("");
  const [createStep, setCreateStep] = useState(1);
  const [createMethod, setCreateMethod] = useState<"choose" | "upload" | "manual">("choose");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingText, setExtractingText] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGuidedSetup, setShowGuidedSetup] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteCounts, setDeleteCounts] = useState<{
    quotes: number;
    invoices: number;
    teamMembers: number;
    hasNonDraftInvoices: boolean;
  } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list" | "resource">(() => {
    const saved = localStorage.getItem("projects_view_mode");
    if (saved === "grid") return "grid";
    if (saved === "resource") return "resource"; // will be clamped to "list" for homeowners below
    return "list";
  });
  const [editorialDashboard, setEditorialDashboard] = useState(() =>
    localStorage.getItem("rf_dashboard_v2") === "true"
  );
  const [timelineOpen, setTimelineOpen] = useState(() =>
    localStorage.getItem("projects_timeline_open") !== "false"
  );
  // Task drawer from timeline
  const [drawerTask, setDrawerTask] = useState<{ projectId: string; taskId: string } | null>(null);
  const ALL_LIST_COLS = ["status", "description", "budget", "date", "owner", "address"] as const;
  const DEFAULT_HIDDEN_COLS: ListColKey[] = ["address"];
  type ListColKey = typeof ALL_LIST_COLS[number];
  const [listColumnOrder, setListColumnOrder] = useState<ListColKey[]>(() => {
    try {
      const saved = localStorage.getItem("projects_list_cols_v2");
      if (saved) {
        const parsed = JSON.parse(saved) as { order: string[]; hidden: string[] };
        const order = (parsed.order || []).filter((k: string) => ALL_LIST_COLS.includes(k as ListColKey)) as ListColKey[];
        // Append any new keys not in saved order
        ALL_LIST_COLS.forEach((k) => { if (!order.includes(k)) order.push(k); });
        return order;
      }
    } catch { /* ignore */ }
    return [...ALL_LIST_COLS];
  });
  const [hiddenListCols, setHiddenListCols] = useState<Set<ListColKey>>(() => {
    try {
      const saved = localStorage.getItem("projects_list_cols_v2");
      if (saved) {
        const parsed = JSON.parse(saved) as { order: string[]; hidden: string[] };
        return new Set((parsed.hidden || []).filter((k: string) => ALL_LIST_COLS.includes(k as ListColKey)) as ListColKey[]);
      }
    } catch { /* ignore */ }
    return new Set<ListColKey>(DEFAULT_HIDDEN_COLS);
  });
  const [draggedCol, setDraggedCol] = useState<ListColKey | null>(null);

  const saveListColPrefs = (order: ListColKey[], hidden: Set<ListColKey>) => {
    localStorage.setItem("projects_list_cols_v2", JSON.stringify({ order, hidden: [...hidden] }));
  };

  const visibleListCols = listColumnOrder.filter((k) => !hiddenListCols.has(k));

  const colLabels: Record<ListColKey, string> = useMemo(() => ({
    address: t("projects.address"),
    description: t("projects.colDescription", "Beskrivning"),
    budget: t("projects.totalBudget"),
    status: t("projects.colStatus", "Status"),
    date: t("projects.colDate", "Skapad"),
    owner: t("projects.colOwner", "Ägare"),
  }), [t]);

  const isAdmin = !!(profile as Record<string, unknown> | null)?.is_system_admin;
  const profileId = (profile as Record<string, unknown> | null)?.id as string | undefined;

  const visibleProjects = useMemo(() => {
    if (!isAdmin || showAdminProjects) return projects;
    // Filter to only own + shared projects
    return projects.filter(
      (p) => p.owner_id === profileId || sharedProjectIds.has(p.id)
    );
  }, [projects, isAdmin, showAdminProjects, profileId, sharedProjectIds]);

  // Exclude demo projects from financial/tax aggregations
  const nonDemoProjects = useMemo(
    () => visibleProjects.filter((p) => !isDemoProject(p.project_type)),
    [visibleProjects]
  );

  const [createIntakeOpen, setCreateIntakeOpen] = useState(false);
  const [projectFinancials, setProjectFinancials] = useState<Record<string, { budget: number; profit: number }>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Auth redirect handled by RequireAuth wrapper in App.tsx
    if (authLoading) return;

    if (isGuest) {
      // Load guest projects from localStorage
      fetchGuestProjects();
      // Show welcome modal for new guests
      if (!localStorage.getItem("guest_onboarding_completed")) {
        setShowWelcomeModal(true);
      }
    } else if (user) {
      fetchProfile();
      fetchProjects();
    }
  }, [user, authLoading, isGuest]);

  // Show welcome toast after email confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "true") {
      toast({
        title: "✅ Email verified — welcome to Renofine!",
        description: "Your account is ready. Let's get started!",
      });
      // Clean URL
      window.history.replaceState({}, "", "/start");
    }
  }, []);

  const fetchGuestProjects = () => {
    try {
      const guestProjects = getGuestProjects();
      // Map guest projects to the Project interface
      setProjects(guestProjects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        created_at: p.created_at,
        address: p.address,
        postal_code: p.postal_code,
        city: p.city,
        project_type: p.project_type,
        owner_id: null,
      })));
      refreshStorageUsage();
    } catch (error) {
      console.error("Error loading guest projects:", error);
    } finally {
      setLoading(false);
    }
  };

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
        .select("id, default_labor_cost_percent")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(data || []);

      // Fetch shared project IDs to distinguish own+shared from admin-visible
      const { data: shares } = await supabase
        .from("project_shares")
        .select("project_id")
        .eq("shared_with_user_id", profile.id);
      if (shares) {
        setSharedProjectIds(new Set(shares.map((s: { project_id: string }) => s.project_id)));
      }

      // Fetch owner names
      const uniqueOwnerIds = [...new Set((data || []).map((p: Project) => p.owner_id).filter(Boolean))] as string[];
      if (uniqueOwnerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", uniqueOwnerIds);
        if (owners) {
          const map: Record<string, string> = {};
          for (const o of owners) {
            map[o.id] = o.name || "";
          }
          setOwnerNames(map);
        }
      }

      const laborCostPct = (profile as { default_labor_cost_percent?: number | null })?.default_labor_cost_percent ?? 50;
      const ids = (data || []).map((p: Project) => p.id);
      fetchProjectFinancials(ids, laborCostPct);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectFinancials = async (projectIds: string[], laborCostPercent: number) => {
    if (projectIds.length === 0) return;
    const { data: tasks } = await supabase
      .from("tasks")
      .select("project_id, budget, estimated_hours, hourly_rate, labor_cost_percent, subcontractor_cost, markup_percent, material_estimate, material_markup_percent")
      .in("project_id", projectIds);

    if (!tasks) return;

    const financials: Record<string, { budget: number; profit: number }> = {};
    for (const task of tasks) {
      if (!financials[task.project_id]) {
        financials[task.project_id] = { budget: 0, profit: 0 };
      }
      financials[task.project_id].budget += task.budget || 0;

      const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
      const costPct = task.labor_cost_percent ?? laborCostPercent;
      const laborProfit = laborTotal * (1 - costPct / 100);
      const ueProfit = (task.subcontractor_cost || 0) * (task.markup_percent || 0) / 100;
      const matProfit = (task.material_estimate || 0) * (task.material_markup_percent || 0) / 100;
      financials[task.project_id].profit += laborProfit + ueProfit + matProfit;
    }
    setProjectFinancials(financials);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Guest mode: save to localStorage
      if (isGuest) {
        if (!canCreateGuestProject()) {
          toast({
            title: t('common.error'),
            description: t('guest.projectLimit', 'Guest mode is limited to {{max}} projects.', { max: GUEST_MAX_PROJECTS }),
            variant: "destructive",
          });
          setCreating(false);
          return;
        }

        const guestProject = saveGuestProject({
          name: newProjectName,
          description: newProjectDescription || null,
          status: "planning",
          address: newProjectAddress || null,
          postal_code: newProjectPostalCode || null,
          city: newProjectCity || null,
          project_type: newProjectType || null,
          start_date: newProjectStartDate || null,
          finish_goal_date: newProjectFinishDate || null,
          total_budget: newProjectBudget ? Number(newProjectBudget) : null,
        });

        if (!guestProject) {
          throw new Error("Failed to save guest project");
        }

        toast({
          title: t('projects.projectCreated'),
          description: t('projects.projectCreatedDescription'),
        });

        setDialogOpen(false);
        setCreateStep(1);
        setNewProjectName("");
        setNewProjectDescription("");
        setNewProjectAddress("");
        setNewProjectPostalCode("");
        setNewProjectCity("");
        setNewProjectType("");
        setNewProjectStartDate("");
        setNewProjectFinishDate("");
        setNewProjectBudget("");
        refreshStorageUsage();
        navigate(`/projects/${guestProject.id}`);
        return;
      }

      // Authenticated mode: save to Supabase
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

      setDialogOpen(false);
      setCreateStep(1);
      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectAddress("");
      setNewProjectPostalCode("");
      setNewProjectCity("");
      setNewProjectType("");
      setNewProjectStartDate("");
      setNewProjectFinishDate("");
      setNewProjectBudget("");
      navigate(`/projects/${data.id}`);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleGuestAIUpload = async (file: File) => {
    setExtractingText(true);
    try {
      if (!canCreateGuestProject()) {
        toast({
          title: t('common.error'),
          description: t('guest.projectLimit', 'Guest mode is limited to {{max}} projects.', { max: GUEST_MAX_PROJECTS }),
          variant: "destructive",
        });
        return;
      }

      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      // Call edge function directly (no auth session for guests)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Edge function error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Filter by confidence >= 0.7
      const rooms = (result.rooms || []).filter((r: { confidence: number }) => r.confidence >= 0.7);
      const tasks = (result.tasks || []).filter((t: { confidence: number }) => t.confidence >= 0.7);

      // Create guest project
      const suggestedName = result.documentSummary
        ? result.documentSummary.substring(0, 60)
        : file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const guestProject = saveGuestProject({
        name: suggestedName || t('projects.defaultGuestProjectName', 'My renovation'),
        description: result.documentSummary || null,
        status: "planning",
        address: null,
        postal_code: null,
        city: null,
        project_type: null,
        start_date: null,
        finish_goal_date: null,
        total_budget: null,
      });

      if (!guestProject) {
        throw new Error("Failed to save guest project");
      }

      // Create rooms and build name→id map
      const roomNameToId: Record<string, string> = {};
      for (const room of rooms) {
        const savedRoom = saveGuestRoom(guestProject.id, {
          name: room.name,
          room_type: null,
          status: "existing",
          area_sqm: room.estimatedAreaSqm || null,
          floor_number: null,
          notes: room.description || null,
          width_mm: null,
          height_mm: null,
          ceiling_height_mm: null,
        });
        if (savedRoom) {
          roomNameToId[room.name.toLowerCase()] = savedRoom.id;
        }
      }

      // Create tasks with room linking
      for (const task of tasks) {
        const roomId = task.roomName
          ? roomNameToId[task.roomName.toLowerCase()] || null
          : null;
        saveGuestTask(guestProject.id, {
          room_id: roomId,
          title: task.title,
          description: task.description || null,
          status: "to_do",
          priority: null,
          due_date: null,
        });
      }

      setDialogOpen(false);
      refreshStorageUsage();
      navigate(`/projects/${guestProject.id}`);

      toast({
        title: t('projects.aiImportSuccess', 'Document analyzed'),
        description: t('projects.aiImportSuccessDesc', '{{tasks}} tasks and {{rooms}} rooms extracted', {
          tasks: tasks.length,
          rooms: rooms.length,
        }),
      });
    } catch (err) {
      console.error("Guest AI upload error:", err);
      toast({
        title: t("common.error"),
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setExtractingText(false);
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

    // Guest mode: use AI extraction flow directly
    if (isGuest) {
      return handleGuestAIUpload(file);
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

    if (isGuest) {
      // Guest mode: refresh guest projects
      fetchGuestProjects();
    } else {
      // Refresh projects - fetchProjects() already handles demo seeding
      await fetchProjects();
    }

    // Handle quick start choice
    if (quickStart === "guided") {
      // Open the guided setup wizard
      setShowGuidedSetup(true);
    } else if (quickStart === "blank") {
      // Open the create project dialog
      setDialogOpen(true);
    } else if (quickStart === "import") {
      // Open AI project import modal directly
      setShowAIImport(true);
    } else {
      // "explore" - just show toast about demo project
      toast({
        title: t("demoProject.badge"),
        description: t("demoProject.description"),
      });
    }
  };

  // Fetch entity counts when delete target is set
  useEffect(() => {
    if (!deleteTarget || isGuest) {
      setDeleteCounts(null);
      return;
    }
    setLoadingCounts(true);
    setDeleteCounts(null);

    Promise.all([
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("project_id", deleteTarget.id),
      supabase.from("invoices").select("id, status").eq("project_id", deleteTarget.id),
      supabase.from("project_shares").select("id", { count: "exact", head: true }).eq("project_id", deleteTarget.id),
    ]).then(([quotesRes, invoicesRes, sharesRes]) => {
      const invoices = invoicesRes.data || [];
      const hasNonDraft = invoices.some((inv) => inv.status !== "draft");
      setDeleteCounts({
        quotes: quotesRes.count ?? 0,
        invoices: invoices.length,
        teamMembers: sharesRes.count ?? 0,
        hasNonDraftInvoices: hasNonDraft,
      });
      setLoadingCounts(false);
    });
  }, [deleteTarget, isGuest]);

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    // Block deletion if non-draft invoices exist
    if (deleteCounts?.hasNonDraftInvoices) return;
    setDeleting(true);
    try {
      // Guest mode: delete from localStorage
      if (isGuest) {
        const success = deleteGuestProject(deleteTarget.id);
        if (!success) throw new Error("Failed to delete project");

        toast({
          title: t("projects.deleteSuccess"),
          description: t("projects.deleteSuccessDescription", { name: deleteTarget.name }),
        });
        setDeleteTarget(null);
        fetchGuestProjects();
        return;
      }

      // Authenticated mode: soft delete (set deleted_at)
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
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

  const isContractor = (profile?.onboarding_user_type as string) === "contractor";

  // Homeowners should never see resource planning — clamp to list
  const effectiveViewMode = (!isContractor && viewMode === "resource") ? "list" : viewMode;

  // Show loading while auth or data is loading
  if (authLoading || loading) {
    return <PageLoadingSkeleton />;
  }

  // Dispatch: homeowners (non-admin, non-guest) get their own start page
  if (!isGuest && !isContractor && !isAdmin && profile) {
    return (
      <Suspense fallback={<PageLoadingSkeleton />}>
        <OwnerStart />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={isGuest ? t('guest.guestUser', 'Guest') : profile?.name}
        userEmail={isGuest ? t('guest.localMode', 'Local mode') : (profile?.email || user?.email)}
        avatarUrl={isGuest ? undefined : profile?.avatar_url}
        onSignOut={isGuest ? undefined : handleSignOut}
        isGuest={isGuest}
        guestUserType={isGuest ? guestRole : null}
        onGuestRoleChange={isGuest ? handleGuestRoleChange : undefined}
      />

      {/* Guest mode banner - sticky below header */}
      {isGuest && <GuestBanner compact />}

      {/* A/B: Editorial dashboard */}
      {editorialDashboard && !isGuest && user?.id && (
        <Suspense fallback={<div className="container py-8 text-center text-muted-foreground">Laddar ny design...</div>}>
          <DashboardRedesign
            userId={user.id}
            userName={profile?.name as string | undefined}
            onNewProject={() => setDialogOpen(true)}
            onToggleBack={() => {
              setEditorialDashboard(false);
              localStorage.setItem("rf_dashboard_v2", "false");
            }}
          />
        </Suspense>
      )}

      <main className={`container py-4 sm:py-8 ${editorialDashboard && !isGuest ? "hidden" : ""}`}>

        {/* Pipeline Section - Leads & Quotes (hidden in guest mode and for homeowners) */}
        {!isGuest && (
          <section id="pipeline">
            <LeadsPipelineSection
              onRefetch={fetchProjects}
              userType={profile?.onboarding_user_type as string | null}
            />
          </section>
        )}

        <section id="projekt" className="scroll-mt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('projects.title')}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
              {visibleProjects.length > 0 && !editorialDashboard && (
                <div className="flex items-center border rounded-md">
                  <button
                    type="button"
                    onClick={() => { setViewMode("grid"); localStorage.setItem("projects_view_mode", "grid"); }}
                    className={`p-1.5 rounded-l-md transition-colors ${effectiveViewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title={t("projects.gridView", "Card view")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode("list"); localStorage.setItem("projects_view_mode", "list"); }}
                    className={`p-1.5 transition-colors ${!isContractor ? "rounded-r-md" : ""} ${effectiveViewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title={t("projects.listView", "List view")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  {isContractor && (
                    <button
                      type="button"
                      onClick={() => { setViewMode("resource"); localStorage.setItem("projects_view_mode", "resource"); }}
                      className={`p-1.5 rounded-r-md transition-colors ${viewMode === "resource" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title={t("resourcePlanning.title", "Resource planning")}
                    >
                      <Users className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !editorialDashboard;
                    setEditorialDashboard(next);
                    localStorage.setItem("rf_dashboard_v2", String(next));
                  }}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    editorialDashboard
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="Testa ny dashboard (A/B)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ny design</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAdminProjects((v) => !v)}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    showAdminProjects
                      ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title={t("projects.adminToggle", "Show all projects (admin)")}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{showAdminProjects ? t("projects.adminOn", "Admin") : t("projects.adminOff", "Admin")}</span>
                </button>
              )}
              {effectiveViewMode === "list" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                      <Settings2 className="h-3 w-3" />
                      {t("declaration.columns", "Kolumner")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {t("declaration.toggleColumns", "Visa/dölj kolumner")}
                    </p>
                    <div className="space-y-1">
                      {listColumnOrder.map((key) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={!hiddenListCols.has(key)}
                            onChange={() => {
                              setHiddenListCols((prev) => {
                                const next = new Set(prev);
                                next.has(key) ? next.delete(key) : next.add(key);
                                saveListColPrefs(listColumnOrder, next);
                                return next;
                              });
                            }}
                            className="h-3.5 w-3.5 rounded border-gray-300"
                          />
                          {colLabels[key]}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {t('projects.newProject')}
                </span>
                <span className="sm:hidden">{t('common.create', 'Skapa')}</span>
              </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setCreateStep(1); setCreateMethod("choose"); setNewProjectName(""); setNewProjectDescription(""); setNewProjectAddress(""); setNewProjectPostalCode(""); setNewProjectCity(""); setNewProjectType(""); setNewProjectStartDate(""); setNewProjectFinishDate(""); setNewProjectBudget(""); setUploadedFile(null); setUseAI(true); if (fileInputRef.current) fileInputRef.current.value = ""; } }}>
            <DialogContent className={createMethod === "choose" ? "sm:max-w-lg" : undefined}>
              <DialogHeader>
                <DialogTitle>
                  {t('projects.newProject')}
                </DialogTitle>
                <DialogDescription>
                  {createMethod === "choose"
                    ? t('projects.chooseMethodDescription', 'Choose how you want to create your project')
                    : t('projects.createProjectDescription')}
                </DialogDescription>
              </DialogHeader>

              {/* Step 0: Choose creation method */}
              {createMethod === "choose" && (
                <div className="flex flex-col gap-3 py-2">
                  {/* Upload document option */}
                  <button
                    type="button"
                    onClick={() => { setDialogOpen(false); setTimeout(() => setShowAIImport(true), 150); }}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98] border-border"
                  >
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base">{t('projects.methodUpload', 'Upload description')}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t('projects.methodUploadDesc', 'Let AI extract project details from a document')}
                      </p>
                    </div>
                  </button>

                  {/* Start planning — creates project instantly, wizard handles the rest */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (isGuest) {
                        if (!canCreateGuestProject()) {
                          toast({ title: t('common.error'), description: t('guest.projectLimit', 'Guest mode is limited to {{max}} projects.', { max: GUEST_MAX_PROJECTS }), variant: "destructive" });
                          return;
                        }
                        const guestProject = saveGuestProject({
                          name: t('projects.defaultProjectName', 'My renovation'),
                          description: null, status: "planning", address: null, postal_code: null, city: null, project_type: null, start_date: null, finish_goal_date: null, total_budget: null,
                        });
                        if (guestProject) {
                          setDialogOpen(false);
                          refreshStorageUsage();
                          navigate(`/projects/${guestProject.id}`);
                        }
                      } else {
                        setCreating(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");
                          const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
                          if (!profile) throw new Error("Profile not found");
                          const { data, error } = await supabase.from("projects").insert({
                            name: t('projects.defaultProjectName', 'My renovation'),
                            owner_id: profile.id,
                            status: "planning",
                          }).select("id").single();
                          if (error) throw error;
                          setDialogOpen(false);
                          navigate(`/projects/${data.id}`);
                        } catch (err) {
                          toast({ title: t('common.error'), description: (err as Error).message, variant: "destructive" });
                        } finally {
                          setCreating(false);
                        }
                      }
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98] border-primary/20 bg-primary/5"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base">{t('projects.methodPlanRenovation', 'Plan your renovation')}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t('projects.methodPlanRenovationDesc', 'Describe what you want to do — we help you structure it')}
                      </p>
                    </div>
                  </button>

                  {/* Send to client — contractor only */}
                  {isContractor && !isGuest && (
                    <button
                      type="button"
                      onClick={() => { setDialogOpen(false); setTimeout(() => setCreateIntakeOpen(true), 150); }}
                      className="flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left hover:border-primary/50 hover:bg-accent/50 active:scale-[0.98] border-border"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Mail className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-base">{t('projects.methodSendToClient', 'Send to client')}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {t('projects.methodSendToClientDesc', 'Send a form to your client to fill in project details')}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Form for upload or manual method */}
              {createMethod !== "choose" && (
              <form onSubmit={handleCreateProject} className="space-y-4">
                {createStep === 1 ? (
                  <>
                    {/* AI File Upload Section - only show for upload method */}
                    {createMethod === "upload" && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.pdf,image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {!uploadedFile && !extractingText ? (
                          /* Upload prompt — clean, focused on one action */
                          <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-4">
                              <Sparkles className="h-8 w-8 text-purple-500" />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="font-medium">{t('projects.aiImportTitle', 'Upload document')}</p>
                              <p className="text-sm text-muted-foreground max-w-sm">
                                {t('projects.aiImportHint', 'Upload a quote request, description, or other document to auto-fill the form.')}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-[44px]"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t('projects.selectFile', 'Select file')}
                            </Button>
                            <div className="flex gap-2 pt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => setCreateMethod("choose")}
                              >
                                <ChevronLeft className="h-3 w-3 mr-1" />
                                {t('projects.back')}
                              </Button>
                            </div>
                          </div>
                        ) : extractingText ? (
                          /* Extracting spinner */
                          <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
                            <p className="font-medium">{t('aiDocumentImport.analyzing', 'Analyzing document...')}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('aiDocumentImport.analyzingTime', 'This takes 10-30 seconds')}</p>
                          </div>
                        ) : (
                          /* Post-extraction: show file + form fields pre-filled */
                          <>
                            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate flex-1">{uploadedFile?.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={handleRemoveFile}
                              >
                                <X className="h-3 w-3" />
                              </Button>
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
                                variant="outline"
                                onClick={() => setCreateMethod("choose")}
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                {t('projects.back')}
                              </Button>
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
                                variant="ghost"
                                disabled={creating || !newProjectName.trim()}
                              >
                                {creating ? t('projects.creating') : t('projects.skipAndCreate')}
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Manual method — form fields shown immediately */}
                    {createMethod === "manual" && (
                    <>
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
                        variant="outline"
                        onClick={() => setCreateMethod("choose")}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        {t('projects.back')}
                      </Button>
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
                        variant="ghost"
                        disabled={creating || !newProjectName.trim()}
                      >
                        {creating ? t('projects.creating') : t('projects.skipAndCreate')}
                      </Button>
                    </div>
                    </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Project type dropdown removed — type is inferred from tasks/rooms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{t('projects.startDate')}</Label>
                        <Input
                          type="date"
                          value={newProjectStartDate}
                          onChange={(e) => setNewProjectStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('projects.goalDate', 'Goal date')}</Label>
                        <Input
                          type="date"
                          value={newProjectFinishDate}
                          onChange={(e) => setNewProjectFinishDate(e.target.value)}
                        />
                      </div>
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
              )}
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Dashboard strip — reminders, right below header */}
        {visibleProjects.length > 0 && (
          <DashboardStrip
            projectIds={visibleProjects.map((p) => p.id)}
            currency={visibleProjects[0]?.currency || "SEK"}
          />
        )}

        {/* Timeline section — collapsible, always visible when projects exist */}
        {nonDemoProjects.length > 0 && (
          <section className="mb-6">
            <button
              type="button"
              className="flex items-center gap-2 w-full text-left py-2 group"
              onClick={() => {
                const next = !timelineOpen;
                setTimelineOpen(next);
                localStorage.setItem("projects_timeline_open", String(next));
              }}
            >
              <GanttChart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t("projects.timelineView", "Timeline")}</span>
              {timelineOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {timelineOpen && (
              <div className="rounded-lg border bg-card overflow-hidden">
                <PortfolioTimeline
                  projectIds={nonDemoProjects.map((p) => p.id)}
                  onProjectClick={(id) => navigate(`/projects/${id}`)}
                  onTaskClick={(projectId, taskId) => setDrawerTask({ projectId, taskId })}
                />
              </div>
            )}
          </section>
        )}

        {visibleProjects.length === 0 && !showAdminProjects ? (
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
        ) : effectiveViewMode === "resource" ? (
          /* ---- Resource planning view ---- */
          <ResourcePlanningView projectIds={visibleProjects.map(p => p.id)} />
        ) : effectiveViewMode === "list" ? (
          /* ---- List view ---- */
          (() => {
            const colAlign: Partial<Record<ListColKey, "right">> = { budget: "right" };

            const renderListCell = (col: ListColKey, project: Project) => {
              const fin = projectFinancials[project.id];
              const projectStatus = normalizeStatus(project.status);
              const statusMeta = STATUS_META[projectStatus];
              switch (col) {
                case "address":
                  return <span className="truncate block max-w-[180px]">{[project.address, project.city].filter(Boolean).join(", ") || "—"}</span>;
                case "description":
                  return (
                    <span className="truncate block max-w-[200px] text-muted-foreground">
                      {project.description ? (project.description.length > 60 ? project.description.slice(0, 60).trim() + "..." : project.description) : "—"}
                    </span>
                  );
                case "budget":
                  return fin && fin.budget > 0
                    ? <span className="font-medium tabular-nums">{formatCurrency(fin.budget)}</span>
                    : <span className="text-muted-foreground">—</span>;
                case "status":
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.color}`}>
                      {t(statusMeta.labelKey)}
                    </span>
                  );
                case "date":
                  return <span className="tabular-nums text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</span>;
                case "owner":
                  return (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {project.owner_id === profileId ? t("projects.ownerYou", "You") : project.owner_id ? ownerNames[project.owner_id] || "..." : "—"}
                    </span>
                  );
                default: return null;
              }
            };

            const handleColDragStart = (col: ListColKey) => { setDraggedCol(col); };
            const handleColDragOver = (e: React.DragEvent) => { e.preventDefault(); };
            const handleColDrop = (targetCol: ListColKey) => {
              if (!draggedCol || draggedCol === targetCol) { setDraggedCol(null); return; }
              const newOrder = listColumnOrder.filter((k) => k !== draggedCol);
              const targetIdx = newOrder.indexOf(targetCol);
              newOrder.splice(targetIdx, 0, draggedCol);
              setListColumnOrder(newOrder);
              saveListColPrefs(newOrder, hiddenListCols);
              setDraggedCol(null);
            };

            return (
              <div className="rounded-lg border bg-card">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("projects.colName", "Namn")}</th>
                        {visibleListCols.map((col) => {
                          // Hide less important columns on smaller viewports
                          const responsiveHide =
                            col === "owner" ? "hidden xl:table-cell" :
                            col === "date" ? "hidden lg:table-cell" :
                            col === "description" ? "hidden md:table-cell" :
                            col === "address" ? "hidden lg:table-cell" : "";
                          return (
                            <th
                              key={col}
                              draggable
                              onDragStart={() => handleColDragStart(col)}
                              onDragOver={handleColDragOver}
                              onDrop={() => handleColDrop(col)}
                              onDragEnd={() => setDraggedCol(null)}
                              className={`px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap select-none ${
                                colAlign[col] === "right" ? "text-right" : "text-left"
                              } ${draggedCol === col ? "opacity-40" : ""} ${responsiveHide}`}
                            >
                              {colLabels[col]}
                            </th>
                          );
                        })}
                        <th className="px-2 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProjects.map((project) => {
                        const isDemo = isDemoProject(project.project_type);
                        return (
                          <tr
                            key={project.id}
                            className={`border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer ${isDemo ? "bg-primary/5" : ""}`}
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {isDemo && <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />}
                                <span className="font-medium truncate">{project.name}</span>
                              </div>
                            </td>
                            {visibleListCols.map((col) => {
                              const responsiveHide =
                                col === "owner" ? "hidden xl:table-cell" :
                                col === "date" ? "hidden lg:table-cell" :
                                col === "description" ? "hidden md:table-cell" :
                                col === "address" ? "hidden lg:table-cell" : "";
                              return (
                                <td
                                  key={col}
                                  className={`px-3 py-2.5 truncate ${colAlign[col] === "right" ? "text-right" : "text-left"} ${responsiveHide}`}
                                >
                                  {renderListCell(col, project)}
                                </td>
                              );
                            })}
                            <td className="px-2 py-2.5">
                              {(isGuest || (profileId && project.owner_id === profileId)) && !isDemo && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(project);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            );
          })()
        ) : (
          /* ---- Grid / card view ---- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {visibleProjects.map((project) => {
              const isDemo = isDemoProject(project.project_type);
              const projectStatus = normalizeStatus(project.status);
              const statusMeta = STATUS_META[projectStatus];
              const fin = projectFinancials[project.id];
              return (
                <ProjectGridCard
                  key={project.id}
                  project={project}
                  isDemo={isDemo}
                  statusLabel={t(statusMeta.labelKey)}
                  statusColor={statusMeta.color}
                  budget={fin?.budget ?? 0}
                  profit={fin?.profit ?? 0}
                  ownerName={
                    project.owner_id === profileId
                      ? t("projects.ownerYou", "You")
                      : ownerNames[project.owner_id ?? ""] || t("common.loading")
                  }
                  isOwnProject={!!(isGuest || (profileId && project.owner_id === profileId))}
                  isContractor={isContractor}
                  currency={project.currency || "SEK"}
                  onDelete={() => setDeleteTarget(project)}
                />
              );
            })}
          </div>
        )}
        </section>

        {/* Financial Analysis - contractors only, at the bottom */}
        {isContractor && !isGuest && nonDemoProjects.length > 0 && (
          <section className="mt-6 sm:mt-8">
            <FinancialAnalysisSection
              projects={nonDemoProjects}
              financials={projectFinancials}
              currency={(profile?.currency as string) ?? null}
            />
          </section>
        )}

        {!isGuest && !isContractor && nonDemoProjects.length > 0 && (
          <section id="deklaration" className="mt-10 sm:mt-14 scroll-mt-20">
            <HomeownerYearlyAnalysis
              projects={nonDemoProjects}
              currency={(profile?.currency as string) ?? null}
            />
          </section>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span className="block">
                  {t("projects.deleteWarning", { name: deleteTarget?.name })}
                </span>
                {loadingCounts && (
                  <span className="block text-muted-foreground text-sm">
                    {t("projects.deleteCountsLoading", "Checking project contents...")}
                  </span>
                )}
                {deleteCounts && (deleteCounts.quotes > 0 || deleteCounts.invoices > 0 || deleteCounts.teamMembers > 0) && (
                  <span className="block text-sm">
                    {t("projects.deleteCounts", {
                      quotes: deleteCounts.quotes,
                      invoices: deleteCounts.invoices,
                      members: deleteCounts.teamMembers,
                    })}
                  </span>
                )}
                {deleteCounts?.hasNonDraftInvoices ? (
                  <span className="block font-medium text-destructive">
                    {t("projects.deleteBlockedByInvoices", "Cannot delete: this project has sent or paid invoices. Cancel or revert them to draft first.")}
                  </span>
                ) : (
                  <span className="block text-sm text-muted-foreground">
                    {t("projects.deleteConfirmSoftDelete", "The project will be archived and hidden from all views.")}
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleting || loadingCounts || !!deleteCounts?.hasNonDraftInvoices}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome modal for new users (authenticated & guests) */}
      <WelcomeModal
        open={showWelcomeModal}
        profileId={profile?.id as string | undefined}
        onComplete={handleWelcomeComplete}
      />

      {/* Create Intake Dialog (send customer form) */}
      <CreateIntakeDialog open={createIntakeOpen} onOpenChange={setCreateIntakeOpen} onCreated={() => { /* intake created from dialog */ }} />

      {/* Guided Setup Wizard */}
      <Dialog open={showGuidedSetup} onOpenChange={setShowGuidedSetup}>
        <DialogContent className="md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("guidedSetup.title")}</DialogTitle>
            <DialogDescription>
              {t("guidedSetup.titleDesc")}
            </DialogDescription>
          </DialogHeader>
          {profile?.id && (
            <GuidedSetupWizard
              userType={(profile?.onboarding_user_type as "homeowner" | "contractor") || "homeowner"}
              profileId={profile.id as string}
              onComplete={(projectId) => {
                setShowGuidedSetup(false);
                navigate(`/projects/${projectId}`);
              }}
              onCancel={() => setShowGuidedSetup(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* AI Project Import Modal */}
      <AIProjectImportModal
        open={showAIImport}
        onOpenChange={setShowAIImport}
        onProjectCreated={(projectId) => {
          setShowAIImport(false);
          navigate(`/projects/${projectId}`);
        }}
      />
      {/* Task drawer from timeline */}
      <TaskEditDialog
        taskId={drawerTask?.taskId ?? null}
        projectId={drawerTask?.projectId ?? ""}
        open={drawerTask !== null}
        onOpenChange={(open) => { if (!open) setDrawerTask(null); }}
        variant="sheet"
      />
    </div>
  );
};

export default Projects;