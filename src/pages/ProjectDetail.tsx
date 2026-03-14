import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { PUBLIC_DEMO_PROJECT_ID, PUBLIC_DEMO_PROJECT_TYPE } from "@/constants/publicDemo";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, FolderOpen, Lock, BookOpen, Loader2, MessageSquare, PartyPopper, X, Zap, FileText, LayoutGrid } from "lucide-react";
import { isDemoProject, refreshDemoProjectDates } from "@/services/demoProjectService";
import { normalizeStatus } from "@/lib/projectStatus";
import { ProjectDetailSkeleton } from "@/components/ui/skeleton-screens";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SpacePlannerTab from "@/components/project/SpacePlannerTab";
import TasksTab from "@/components/project/TasksTab";
import OverviewTab from "@/components/project/OverviewTab";
import TeamManagement from "@/components/project/TeamManagement";
import PurchaseRequestsTab from "@/components/project/PurchaseRequestsTab";
import BudgetTab from "@/components/project/BudgetTab";
import ProjectFeedTab from "@/components/project/ProjectFeedTab";
import ProjectFilesTab from "@/components/project/ProjectFilesTab";
import CustomerViewTab from "@/components/project/CustomerViewTab";
import { HomeownerPlanningView } from "@/components/project/overview/HomeownerPlanningView";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ProjectChatSection } from "@/components/project/overview/ProjectChatSection";
import { UnifiedTableTab } from "@/components/project/unified-table";
import type { FeedComment } from "@/components/project/feed/types";
import { getContextType } from "@/components/project/feed/utils";
import { MobileBottomNav } from "@/components/project/MobileBottomNav";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { HoverTabMenu } from "@/components/ui/HoverTabMenu";
import { RoomsList } from "@/components/floormap/RoomsList";
import { RoomDetailDialog } from "@/components/floormap/RoomDetailDialog";
import { useFloorMapStore } from "@/components/floormap/store";
import { FloorMapShape } from "@/components/floormap/types";
import { v4 as uuidv4 } from "uuid";
import { useDemoPreferences } from "@/hooks/useDemoPreferences";
import { DemoRoleModal } from "@/components/demo/DemoRoleModal";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoPageGuide } from "@/components/demo/DemoPageGuide";
import {
  getGuestProject,
  getGuestRooms,
  getGuestTasks,
  saveGuestRoom,
  updateGuestRoom,
  deleteGuestRoom as deleteGuestRoomStorage,
  saveGuestTask,
  updateGuestTask,
  deleteGuestTask,
} from "@/services/guestStorageService";
import type { GuestRoom, GuestTask } from "@/types/guest.types";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_budget: number | null;
  spent_amount: number | null;
  start_date: string | null;
  finish_goal_date: string | null;
  project_type?: string | null;
  currency?: string | null;
  address?: string | null;
  cover_image_url?: string | null;
}

const NoAccessPlaceholder = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <Lock className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">{t('access.noAccess')}</h2>
      <p className="text-muted-foreground">{t('access.noAccessDescription')}</p>
    </div>
  );
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user, signOut, loading: authLoading } = useAuthSession();
  const { isGuest: isGuestFromContext, refreshStorageUsage } = useGuestMode();

  // For the public demo, we ignore guest mode completely
  const isPublicDemoProject = projectId === PUBLIC_DEMO_PROJECT_ID;
  const isGuest = isPublicDemoProject ? false : isGuestFromContext;
  const demoPrefs = useDemoPreferences();
  const [showDemoRoleModal, setShowDemoRoleModal] = useState(false);
  useProfileLanguage();
  const { t } = useTranslation();

  // Menu configurations for hover dropdowns
  const menuConfigs = {
    overview: [],
    spaceplanner: [
      { label: t('projectDetail.rooms', 'Rooms'), value: "rooms", description: t('projectDetail.roomsDesc', 'Manage and configure rooms') },
      { label: t('projectDetail.floorPlan', 'Floor Plan'), value: "floorplan", description: t('projectDetail.floorPlanDesc', 'Design and plan your floor layout') },
    ],
    files: [],
    tasks: [],
    purchases: [],
    budget: [],
    team: [],
  };
  const permissions = useProjectPermissions(projectId);
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadQuoteId, setLeadQuoteId] = useState<string | null>(null);
  const [guestRole, setGuestRole] = useState<string | null>(() =>
    isGuest ? localStorage.getItem("guest_user_type") : null
  );

  // Derive effective user type: demo role for demo projects, profile for authenticated, localStorage for guests
  const effectiveUserType = isPublicDemoProject
    ? demoPrefs.preferences.role
    : profile?.onboarding_user_type || (isGuest ? guestRole : undefined);

  const handleGuestRoleChange = useCallback((role: string) => {
    localStorage.setItem("guest_user_type", role);
    setGuestRole(role);
  }, []);

  // Map tab keys to permission keys
  // Guest users: planning-only when status=planning, more tabs when active
  const guestProjectActive = isGuest && project?.status && project.status !== "planning";
  const tabPermissionMap: Record<string, string> = isGuest ? {
    overview: "edit",
    spaceplanner: guestProjectActive ? "edit" : "none",
    files: "none",
    tasks: guestProjectActive ? "edit" : "none",
    purchases: "none",
    budget: "none",
    table: "none",
    team: "none",
    customer: "none",
    planning: "none",
    chat: "none",
  } : {
    overview: permissions.overview,
    spaceplanner: permissions.spacePlanner,
    files: permissions.files,
    // "tasks" parent tab is accessible if either tasks or timeline has access
    tasks: (permissions.tasks !== 'none' || permissions.timeline !== 'none') ? 'view' : 'none',
    purchases: permissions.purchases,
    budget: permissions.budget,
    table: permissions.budget,
    team: permissions.teams,
    customer: (isPublicDemoProject && demoPrefs.preferences.role === "homeowner")
      ? "view"
      : (permissions.customerView || "none"),
    planning: "none",  // Planning is now a sub-section of Overview
    chat: "view",
  };

  const isTabBlocked = (tab: string) => tabPermissionMap[tab] === "none";

  // Sub-tab permission checks
  const isSubTabBlocked = (tab: string, subTab: string) => {
    if (tab === 'tasks') {
      if (subTab === 'tasklist') return permissions.tasks === 'none';
      if (subTab === 'timeline') return permissions.timeline === 'none';
    }
    return false;
  };
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    const validTabs = ["overview", "spaceplanner", "files", "tasks", "purchases", "budget", "table", "team", "customer", "planning", "chat"];
    return tabParam && validTabs.includes(tabParam) ? tabParam : "overview";
  });
  const [openEntityId, setOpenEntityId] = useState<string | null>(() => searchParams.get("entityId"));

  // Pending scroll anchor (e.g. "chat" → scroll to #project-chat after tab renders)
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  // Sync ?tab=, ?subtab=, ?section=, and ?entityId= search params (handles navigation from notifications, etc.)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const subtabParam = searchParams.get("subtab");
    const sectionParam = searchParams.get("section");
    const entityParam = searchParams.get("entityId");
    const validTabs = ["overview", "spaceplanner", "files", "tasks", "purchases", "budget", "table", "team", "customer", "planning", "chat"];

    if (tabParam && validTabs.includes(tabParam)) {
      if (tabParam !== activeTab || subtabParam) {
        setActiveTab(tabParam);
        // Handle subtab navigation (e.g., spaceplanner + rooms)
        if (subtabParam) {
          setActiveSubTab(subtabParam);
        }
        setOpenEntityId(entityParam);
        if (sectionParam) setPendingSection(sectionParam);
        setSearchParams({}, { replace: true });
      }
    } else if (entityParam) {
      setOpenEntityId(entityParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeTab, setSearchParams]);

  // Client in quote phase → redirect to quote (they can only see the quote until accepted)
  const isQuotePhase = ["planning", "quote_created", "quote_sent"].includes(project?.status ?? "");
  useEffect(() => {
    if (!permissions.loading && permissions.isClient && isQuotePhase && leadQuoteId) {
      navigate(`/quotes/${leadQuoteId}`, { replace: true });
    }
  }, [permissions.loading, permissions.isClient, isQuotePhase, leadQuoteId]);

  // Planning contributor → force overview tab only
  useEffect(() => {
    if (!permissions.loading && permissions.isPlanningContributor && activeTab !== "overview") {
      setActiveTab("overview");
    }
  }, [permissions.loading, permissions.isPlanningContributor, activeTab]);

  // Client on active project → redirect blocked tabs to default client tab (preserve pendingSection)
  useEffect(() => {
    if (!permissions.loading && permissions.isClient && !isQuotePhase) {
      if (!searchParams.get("tab") || isTabBlocked(activeTab)) {
        // Clients default to customer view
        setActiveTab("customer");
      }
    }
  }, [permissions.loading, permissions.isClient, isQuotePhase, activeTab, effectiveUserType]);

  // Scroll to anchor element after tab switch (e.g. section=chat → #project-chat)
  useEffect(() => {
    if (!pendingSection) return;
    const anchorId = pendingSection === "chat" ? "project-chat" : pendingSection;
    const timer = setTimeout(() => {
      const el = document.getElementById(anchorId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setPendingSection(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingSection, activeTab]);

  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  // Track previous tab for "Back" navigation from floor planner
  const getTabLabelKey = (tab: string): string => {
    const map: Record<string, string> = {
      overview: 'nav.mobileNav.overview',
      customer: 'nav.mobileNav.customerView',
      tasks: 'nav.mobileNav.tasks',
      purchases: 'nav.mobileNav.purchases',
      files: 'nav.mobileNav.files',
      budget: 'nav.mobileNav.budget',
      team: 'nav.mobileNav.team',
      feed: 'nav.mobileNav.feed',
      spaceplanner: 'nav.mobileNav.plans',
    };
    return map[tab] || 'common.back';
  };
  const [previousTab, setPreviousTab] = useState<{ tab: string; subTab: string | null; label: string }>({
    tab: 'overview',
    subTab: null,
    label: 'nav.mobileNav.overview',
  });
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [contractorRoomIds, setContractorRoomIds] = useState<string[]>([]);

  // Welcome banner for invited users
  const isInvitedWelcome = searchParams.get("welcome") === "invited";
  const welcomeDismissKey = `renomate_invited_welcome_dismissed_${projectId}`;
  const [showInvitedWelcome, setShowInvitedWelcome] = useState(() => {
    if (!isInvitedWelcome) return false;
    return !localStorage.getItem(welcomeDismissKey);
  });
  const dismissInvitedWelcome = () => {
    setShowInvitedWelcome(false);
    localStorage.setItem(welcomeDismissKey, "true");
  };
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;

    // Public demo is accessible to everyone
    if (isPublicDemoProject) {
      loadPublicDemoData();
    } else if (!user && !isGuest) {
      navigate("/auth");
    } else if (isGuest) {
      loadGuestData();
    } else {
      loadData();
    }
  }, [user, projectId, authLoading, isGuest, isPublicDemoProject]);

  // Show demo role modal on first visit (no role chosen yet)
  useEffect(() => {
    if (isPublicDemoProject && !loading && !demoPrefs.hasChosenRole && !user) {
      setShowDemoRoleModal(true);
    }
  }, [isPublicDemoProject, loading, demoPrefs.hasChosenRole, user]);

  // Override project status based on demo phase stepper (contractor only)
  const effectiveProject = (isPublicDemoProject && demoPrefs.preferences.role === "contractor" && project)
    ? {
        ...project,
        status: demoPrefs.preferences.phase === "planning" ? "planning"
          : demoPrefs.preferences.phase === "quote_sent" ? "quote_sent"
          : "in_progress",
      }
    : project;

  const loadGuestData = () => {
    if (!projectId) return;
    try {
      const guestProject = getGuestProject(projectId);
      if (!guestProject) {
        toast({
          title: t('common.error'),
          description: t('projects.notFound', 'Project not found'),
          variant: "destructive",
        });
        navigate("/start");
        return;
      }

      setProject({
        id: guestProject.id,
        name: guestProject.name,
        description: guestProject.description,
        status: guestProject.status,
        total_budget: guestProject.total_budget || null,
        spent_amount: null,
        start_date: guestProject.start_date || null,
        finish_goal_date: null,
        project_type: guestProject.project_type,
        currency: 'SEK',
      });

      // Load guest rooms
      const guestRooms = getGuestRooms(projectId);
      setRoomsData(guestRooms.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        name: r.name,
        room_type: r.room_type,
        status: r.status,
        area_sqm: r.area_sqm,
        floor_number: r.floor_number,
        notes: r.notes,
        created_at: r.created_at,
      })));

      setRoomsLoading(false);
      refreshStorageUsage();
    } catch (error) {
      console.error("Error loading guest project:", error);
      navigate("/start");
    } finally {
      setLoading(false);
    }
  };

  const loadPublicDemoData = async () => {
    if (!projectId) return;
    try {
      // Fetch public demo project (RLS allows anonymous access to public_demo projects)
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("project_type", PUBLIC_DEMO_PROJECT_TYPE)
        .single();

      if (projectError || !projectData) {
        console.error("Error loading public demo:", projectError);
        navigate("/");
        return;
      }

      setProject(projectData);

      // Fetch rooms for the public demo
      const { data: roomsResult } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      setRoomsData(roomsResult || []);
      setRoomsLoading(false);

      // If user is logged in, also fetch their profile for the header
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfile(profileData);

      }
    } catch (error) {
      console.error("Error loading public demo:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // Hide main header when in Floor Plan edit mode
  // SpacePlannerTopBar will be the only visible header (industry standard UX)
  useEffect(() => {
    if (activeTab === "spaceplanner" && activeSubTab === "floorplan") {
      setIsHeaderVisible(false);
    } else {
      setIsHeaderVisible(true);
    }
  }, [activeTab, activeSubTab]);

  const loadData = async () => {
    try {
      // First fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user?.id).single();

      setProfile(profileData);

      // Then fetch project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // If this is a personal demo project (not the shared public_demo), refresh task dates
      // This ensures the timeline always shows relevant example data
      // Note: We don't refresh public_demo dates - that's a shared project managed by admins
      if (projectData?.project_type === 'demo_project' && profileData?.id) {
        refreshDemoProjectDates(profileData.id);
      }

      // For projects in quote phase, fetch the associated quote
      const quotePhases = ["planning", "quote_created", "quote_sent"];
      if (quotePhases.includes(projectData?.status)) {
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("id")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (quoteData) {
          setLeadQuoteId(quoteData.id);
        }
      }

    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
      navigate("/start");
    } finally {
      setLoading(false);
    }
  };

  // Handle room interactions
  const handleRoomClick = (room: any) => {
    setSelectedRoom(room);
    setShowRoomDialog(true);
  };

  const handleAddRoom = () => {
    setSelectedRoom(null);
    setShowCreateRoomDialog(true);
  };

  const handleRoomUpdated = () => {
    // Refresh data if needed
    loadData();
    // Uppdatera rooms data
    loadRoomsData().then((data) => {
      setRoomsData(data);
      setRoomsLoading(false);
    }).catch(() => {
      setRoomsLoading(false);
    });
  };

  const handleRoomCreated = () => {
    // Uppdatera rooms data efter att ett nytt rum skapats
    loadRoomsData().then((data) => {
      setRoomsData(data);
      setRoomsLoading(false);
    }).catch(() => {
      setRoomsLoading(false);
    });
  };

  const loadRoomsData = async () => {
    // Guest mode: load from localStorage
    if (isGuest && projectId && !isPublicDemoProject) {
      const guestRooms = getGuestRooms(projectId);
      return guestRooms.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        name: r.name,
        room_type: r.room_type,
        status: r.status,
        area_sqm: r.area_sqm,
        floor_number: r.floor_number,
        notes: r.notes,
        created_at: r.created_at,
      }));
    }

    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error loading rooms:", error);
      return [];
    }
  };

  // Load rooms data when component mounts
  useEffect(() => {
    if (projectId) {
      setRoomsLoading(true);
      loadRoomsData().then((data) => {
        setRoomsData(data);
        setRoomsLoading(false);
      }).catch(() => {
        setRoomsData([]);
        setRoomsLoading(false);
      });
    }
  }, [projectId]);

  // Fetch room IDs for tasks assigned to the current user (for highlighting on floor plan)
  useEffect(() => {
    const fetchContractorRoomIds = async () => {
      if (!profile?.id || !projectId || permissions.isOwner) return;

      const { data } = await supabase
        .from("tasks")
        .select("room_id")
        .eq("project_id", projectId)
        .eq("assigned_to_stakeholder_id" as never, profile.id)
        .not("room_id", "is", null);

      if (data) {
        const uniqueRoomIds = [...new Set(data.map(t => t.room_id).filter(Boolean))] as string[];
        setContractorRoomIds(uniqueRoomIds);
      }
    };
    fetchContractorRoomIds();
  }, [profile?.id, projectId, permissions.isOwner]);

  const handleDeleteRoom = async (roomId: string) => {
    // Hitta rummet för att visa namnet i bekräftelsen
    const room = roomsData.find(r => r.id === roomId);

    if (!room) return;

    if (!confirm(t('projectDetail.confirmDeleteRoom', { name: room.name }))) {
      return;
    }

    try {
      // Guest mode: delete from localStorage
      if (isGuest && projectId) {
        const success = deleteGuestRoomStorage(projectId, roomId);
        if (!success) throw new Error("Failed to delete room");

        toast({
          title: t('projectDetail.roomDeleted'),
          description: t('projectDetail.roomDeletedDescription', { name: room.name }),
        });

        setRoomsData(prev => prev.filter(r => r.id !== roomId));
        refreshStorageUsage();
        return;
      }

      // Authenticated mode: delete from Supabase
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: t('projectDetail.roomDeleted'),
        description: t('projectDetail.roomDeletedDescription', { name: room.name }),
      });

      // Uppdatera rooms state direkt istället för att hämta från databasen
      setRoomsData(prev => prev.filter(r => r.id !== roomId));
      setRoomsLoading(false);

    } catch (error: unknown) {
      console.error("Error deleting room:", error);
      toast({
        title: t('common.error'),
        description: (error as Error).message || t('projectDetail.failedToDeleteRoom'),
        variant: "destructive",
      });
    }
  };

  // Callback för när ett rum har raderats från listan
  const handleRoomDeleted = () => {
    // Uppdatera rooms state genom att hämta från databasen
    loadRoomsData().then((data) => {
      setRoomsData(data);
      setRoomsLoading(false);
    }).catch(() => {
      setRoomsLoading(false);
    });
  };

  // Handle menu item selection
  const handleMenuSelect = (menuId: string, itemValue: string) => {
    if (menuId !== "customer" && isTabBlocked(menuId)) return;
    if (isSubTabBlocked(menuId, itemValue)) return;

    // Save current tab before navigating to floor planner (for Back button)
    if (menuId === 'spaceplanner' && (itemValue === 'floorplan' || !itemValue)) {
      // Only save if we're not already in spaceplanner
      if (activeTab !== 'spaceplanner') {
        setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });
      }
    }

    setActiveTab(menuId);

    // Handle sub-tabs for menus with sub-items
    if (menuId === 'overview') {
      if (menuConfigs.overview.find(item => item.value === itemValue)) {
        setActiveSubTab(itemValue === 'overview' ? null : itemValue);
      } else {
        setActiveSubTab(null);
      }
    } else if (menuId === 'spaceplanner') {
      if (menuConfigs.spaceplanner.find(item => item.value === itemValue)) {
        setActiveSubTab(itemValue);
      } else {
        setActiveSubTab('rooms');
      }
    } else if (menuId === 'tasks') {
      setActiveSubTab(null);
    } else {
      setActiveSubTab(null);
    }
  };

  // Handle using an image as canvas background
  const handleUseAsBackground = (imageUrl: string, fileName: string) => {
    // Get currentPlanId from store
    const { addShape, currentPlanId } = useFloorMapStore.getState();

    // Create an image shape with low zIndex to place behind other shapes
    const imageShape: FloorMapShape = {
      id: uuidv4(),
      type: 'image',
      planId: currentPlanId || undefined,
      coordinates: {
        x: 500, // Start position on canvas (in pixels/mm)
        y: 500,
        width: 0, // Will be auto-sized based on image dimensions
        height: 0,
      },
      imageUrl,
      imageOpacity: 0.5,
      locked: false,
      zIndex: -100, // Negative zIndex to ensure it's behind other shapes
      name: fileName,
    };

    // Add the shape to the store
    addShape(imageShape);

    // Save current tab before navigating to floor planner
    setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });

    // Navigate to Floor Plan tab
    setActiveTab('spaceplanner');
    setActiveSubTab('floorplan');

    toast({
      title: t('projectDetail.imageAdded'),
      description: t('projectDetail.imageAddedDescription', { name: fileName }),
    });
  };

  const handleFeedNavigate = async (comment: FeedComment) => {
    const type = getContextType(comment);
    switch (type) {
      case "task":
        setActiveTab("tasks");
        setActiveSubTab("tasklist");
        if (comment.task_id) setOpenEntityId(comment.task_id);
        break;
      case "material":
        setActiveTab("purchases");
        setActiveSubTab(null);
        if (comment.material_id) setOpenEntityId(comment.material_id);
        break;
      case "room":
        setActiveTab("spaceplanner");
        setActiveSubTab("rooms");
        if (comment.entity_id) {
          const { data: room } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", comment.entity_id)
            .single();
          if (room) {
            setSelectedRoom(room);
            setShowRoomDialog(true);
          }
        }
        break;
      case "drawing_object":
        // Save current tab before navigating to floor planner
        setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });
        setActiveTab("spaceplanner");
        setActiveSubTab("floorplan");
        break;
    }
  };

  // Handle navigating to a room that's placed on the floor plan
  const handleNavigateToRoom = (room: Room) => {
    // Save current tab before navigating to floor planner
    setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });

    // Navigate to floor plan first
    setActiveTab('spaceplanner');
    setActiveSubTab('floorplan');

    // Center on the room after delays to ensure canvas is fully rendered
    // First attempt after 300ms (for fast renders)
    setTimeout(() => {
      const { centerOnRoom, shapes } = useFloorMapStore.getState();
      const roomShape = shapes.find(s => s.roomId === room.id && s.type === 'room');
      if (roomShape) {
        centerOnRoom(room.id);
      }
    }, 300);

    // Second attempt after 600ms (fallback for slower renders)
    setTimeout(() => {
      const { centerOnRoom, shapes, selectedShapeIds } = useFloorMapStore.getState();
      const roomShape = shapes.find(s => s.roomId === room.id && s.type === 'room');
      // Only center if room exists and isn't already selected
      if (roomShape && !selectedShapeIds.includes(roomShape.id)) {
        centerOnRoom(room.id);
      }
    }, 600);

    toast({
      title: t('projectDetail.navigatingToRoom'),
      description: t('projectDetail.showingRoomOnDrawing', { name: room.name }),
    });
  };

  const handleNavigateToRoomById = (roomId: string) => {
    const room = roomsData.find((r: { id: string }) => r.id === roomId);
    if (room) {
      handleNavigateToRoom(room);
    }
  };

  // Handle placing an unplaced room on the floor plan
  const handlePlaceRoom = (room: Room) => {
    const { setPendingRoomPlacement } = useFloorMapStore.getState();

    // Set the pending room placement
    setPendingRoomPlacement({
      roomId: room.id,
      roomName: room.name,
    });

    // Save current tab before navigating to floor planner
    setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });

    // Navigate to floor plan
    setActiveTab('spaceplanner');
    setActiveSubTab('floorplan');

    toast({
      title: t('projectDetail.placeRoom'),
      description: t('projectDetail.clickToPlaceRoom', { name: room.name }),
    });
  };

  // Show loading while auth or data is loading
  if (authLoading || loading || permissions.loading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isDemo = project ? isDemoProject(project.project_type) : false;
  const isPersonalDemo = isDemo && !isPublicDemoProject;
  const projectStatus = normalizeStatus(effectiveProject?.status);

  const demoBannerContent = isPersonalDemo ? (
    <>
      <BookOpen className="h-4 w-4" />
      <span className="font-medium">Demo</span>
      <span className="text-primary-foreground/80">– {t("demoProject.description")}</span>
      {!permissions.isSystemAdmin && (
        <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 rounded text-xs font-medium">
          {t("common.viewOnly", "Endast visning")}
        </span>
      )}
    </>
  ) : null;

  return (
    <div className={cn("min-h-screen bg-background flex flex-col md:pb-0", isHeaderVisible ? "pb-20" : "pb-0")}>
      {/* Unified Header - Hidden in Floor Plan edit mode */}
      {isHeaderVisible && (
        <div className="sticky top-0 z-50">
        <AppHeader
          userName={isPublicDemoProject && !user ? t('guest.visitor', 'Visitor') : isGuest ? t('guest.guestUser', 'Guest') : profile?.name}
          userEmail={isPublicDemoProject && !user ? t('guest.publicDemo', 'Public demo') : isGuest ? t('guest.localMode', 'Local mode') : (profile?.email || user?.email)}
          avatarUrl={(!user || isGuest) ? undefined : profile?.avatar_url}
          onSignOut={(!user || isGuest) ? undefined : handleSignOut}
          isGuest={isGuest || (isPublicDemoProject && !user)}
          guestUserType={isGuest ? guestRole : null}
          onGuestRoleChange={isGuest ? handleGuestRoleChange : undefined}
        >
          {/* Mobile: Back button + project name */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                // If on a sub-tab, go back to overview first
                if (activeTab !== "overview") {
                  setActiveTab("overview");
                  setActiveSubTab(null);
                } else {
                  // Already on overview, go to previous page
                  navigate(-1);
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium truncate">
              {project?.name}
            </span>
          </div>
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-3">
            {/* Back to start button */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => navigate(user ? "/start" : "/")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden lg:inline">{t('projectDetail.backToStart')}</span>
            </Button>
            <div className="flex items-center gap-5 lg:gap-7 overflow-x-auto whitespace-nowrap">
              {/* Client-only: Kundvy tab */}
              {!isTabBlocked("customer") && (
                <div
                  className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "customer" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => handleMenuSelect('customer', 'customer')}
                >
                  {t("customerView.tabTitle")}
                </div>
              )}
              {/* Chat tab — mobile: own tab; desktop: navigate to Overview + scroll to chat */}
              <div
                className={cn(
                  "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors md:hidden",
                  activeTab === "chat" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleMenuSelect('chat', 'chat')}
              >
                {t("projectDetail.chat", "Chat")}
              </div>
              <div
                className="hidden md:flex items-center py-1.5 cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setActiveTab("overview");
                  setActiveSubTab(null);
                  setTimeout(() => {
                    document.getElementById("project-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                title={t("projectDetail.chat", "Chat")}
              >
                <MessageSquare className="h-4 w-4" />
              </div>
              {/* Primary tabs */}
              {/* 1. Översikt */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "overview" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("overview") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t("projectDetail.overview")}
                  </div>
                }
                items={menuConfigs.overview}
                onSelect={(value) => handleMenuSelect('overview', value)}
                onMainClick={() => handleMenuSelect('overview', 'overview')}
                activeValue={activeTab === "overview" ? activeSubTab || "overview" : undefined}
              />

              {/* 2. Uppgifter */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "tasks" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("tasks") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t("projectDetail.tasks")}
                  </div>
                }
                items={menuConfigs.tasks}
                onSelect={(value) => handleMenuSelect('tasks', value)}
                onMainClick={() => handleMenuSelect('tasks', 'tasks')}
                activeValue={activeTab === "tasks" ? "tasks" : undefined}
              />

              {/* 3. Inköp */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "purchases" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("purchases") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t('projectDetail.purchases')}
                  </div>
                }
                items={menuConfigs.purchases}
                onSelect={(value) => handleMenuSelect('purchases', value)}
                onMainClick={() => handleMenuSelect('purchases', 'purchases')}
                activeValue={activeTab === "purchases" ? activeSubTab || "purchases" : undefined}
              />

              {/* 4. Budget */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "budget" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("budget") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t('common.budget')}
                  </div>
                }
                items={menuConfigs.budget}
                onSelect={(value) => handleMenuSelect('budget', value)}
                onMainClick={() => handleMenuSelect('budget', 'budget')}
                activeValue={activeTab === "budget" ? "budget" : undefined}
              />

              {/* 5. Yta */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "spaceplanner" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("spaceplanner") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t('projectDetail.spacePlanner')}
                  </div>
                }
                items={menuConfigs.spaceplanner}
                onSelect={(value) => handleMenuSelect('spaceplanner', value)}
                onMainClick={() => handleMenuSelect('spaceplanner', 'rooms')}
                activeValue={activeTab === "spaceplanner" ? activeSubTab || "rooms" : undefined}
              />

              {/* 6. Filer */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "files" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("files") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t('projectDetail.files')}
                  </div>
                }
                items={menuConfigs.files}
                onSelect={(value) => handleMenuSelect('files', value)}
                onMainClick={() => handleMenuSelect('files', 'files')}
                activeValue={activeTab === "files" ? "files" : undefined}
              />

              {/* 7. Team */}
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "py-1.5 text-sm font-medium cursor-pointer transition-colors",
                    activeTab === "team" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground",
                    isTabBlocked("team") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    {t('projectDetail.team')}
                  </div>
                }
                items={menuConfigs.team}
                onSelect={(value) => handleMenuSelect('team', value)}
                onMainClick={() => handleMenuSelect('team', 'team')}
                activeValue={activeTab === "team" ? activeSubTab || "team" : undefined}
              />
            </div>
          </div>
        </AppHeader>
        {/* Public demo banner with role/phase stepper */}
        {isPublicDemoProject && (
          <DemoBanner
            role={demoPrefs.preferences.role}
            phase={demoPrefs.preferences.phase}
            onPhaseChange={demoPrefs.setPhase}
            onRoleChange={demoPrefs.setRole}
          />
        )}
        {/* Demo context info bar for homeowners — explains which view they're seeing */}
        {isPublicDemoProject && demoPrefs.preferences.role === "homeowner" && (
          <div className="px-4 py-1.5 flex items-center justify-center gap-2 text-xs bg-blue-50 text-blue-700 border-b border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900">
            {activeTab === "customer"
              ? t("demo.homeownerContext.customerView", "You are viewing the Client View — this is what you see when a builder invites you to follow your project.")
              : t("demo.homeownerContext.overview", "You are viewing your own project — this is how it looks when you manage a renovation yourself.")}
          </div>
        )}
        {/* Personal demo banner */}
        {isPersonalDemo && (
          <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
            {demoBannerContent}
          </div>
        )}
        </div>
      )}

      {/* Demo banner in floorplan mode — fixed below SpacePlannerTopBar */}
      {!isHeaderVisible && isPublicDemoProject && (
        <div className="fixed top-14 left-0 right-0 z-[59]">
          <DemoBanner
            role={demoPrefs.preferences.role}
            phase={demoPrefs.preferences.phase}
            onPhaseChange={demoPrefs.setPhase}
            onRoleChange={demoPrefs.setRole}
          />
        </div>
      )}
      {!isHeaderVisible && isPersonalDemo && (
        <div className="fixed top-14 left-0 right-0 z-[59] bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
          {demoBannerContent}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">

        {/* Demo page guide — contextual onboarding modal for demo visitors */}
        {isPublicDemoProject && !user && demoPrefs.preferences.role && (
          <DemoPageGuide pageKey={activeTab} role={demoPrefs.preferences.role} />
        )}

        <TabsContent value="overview" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("overview") ? null : activeSubTab === 'feed' ? (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <ProjectFeedTab projectId={project.id} onNavigateToEntity={handleFeedNavigate} />
            </div>
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              {showInvitedWelcome && (
                <Card className="mb-4 border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <PartyPopper className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{t("onboarding.invitedWelcome.title", "Welcome to your project!")}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("onboarding.invitedWelcome.description", "Here you can follow the progress, view photos, and communicate with your project team.")}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={dismissInvitedWelcome}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <OverviewTab
                project={effectiveProject!}
                userType={effectiveUserType}
                isGuest={isGuest}
                isProjectOwner={permissions.isOwner}
                isPlanningContributor={permissions.isPlanningContributor}
                onProjectUpdate={isGuest ? loadGuestData : loadData}
                onNavigateToEntity={handleFeedNavigate}
                onNavigateToPurchases={(materialId?: string) => {
                  setActiveTab('purchases');
                  setActiveSubTab(null);
                  if (materialId) setOpenEntityId(materialId);
                }}
                onNavigateToTasks={(taskId?: string) => {
                  setActiveTab('tasks');
                  setActiveSubTab(null);
                  if (taskId) setOpenEntityId(taskId);
                }}
                onNavigateToFeed={() => {
                  setActiveTab('overview');
                  setActiveSubTab('feed');
                }}
                onNavigateToBudget={() => {
                  setActiveTab('budget');
                  setActiveSubTab(null);
                }}
                onNavigateToFiles={() => {
                  setActiveTab('files');
                  setActiveSubTab(null);
                }}
                onNavigateToRoom={handleNavigateToRoomById}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="spaceplanner" className="m-0 h-screen">
          <ErrorBoundary>
          {isTabBlocked("spaceplanner") ? (
            <NoAccessPlaceholder />
          ) : (
            <>
              {activeSubTab === 'floorplan' && (
                <SpacePlannerTab
                  projectId={project.id}
                  projectName={project.name}
                  onBack={() => {
                    // Restore previous tab (where user was before entering floor planner)
                    setActiveTab(previousTab.tab);
                    setActiveSubTab(previousTab.subTab);
                  }}
                  backLabel={previousTab.label}
                  isReadOnly={permissions.spacePlanner === 'view'}
                  isDemo={isDemo}
                  highlightedRoomIds={contractorRoomIds}
                  showPinterest={effectiveUserType === "homeowner"}
                  simplified={effectiveUserType === "homeowner"}
                />
              )}
              {(!activeSubTab || activeSubTab === 'rooms') && (
                <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
                  <h2 className="text-2xl font-bold mb-4">{t('projectDetail.roomManagement')}</h2>
                  <p className="text-muted-foreground mb-6">{t('projectDetail.roomManagementDescription')}</p>
                  {roomsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <RoomsList
                      projectId={project.id}
                      rooms={roomsData}
                      onRoomClick={handleRoomClick}
                      onAddRoom={handleAddRoom}
                      onDeleteRoom={handleDeleteRoom}
                      onRoomDeleted={handleRoomDeleted}
                      onNavigateToRoom={handleNavigateToRoom}
                      onPlaceRoom={handlePlaceRoom}
                    />
                  )}
                </div>
              )}
            </>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="files" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("files") ? (
            <NoAccessPlaceholder />
          ) : (
            <ProjectFilesTab
              projectId={project.id}
              projectName={project.name}
              canEdit={permissions.files === "edit"}
              onNavigateToFloorPlan={() => {
                // Save current tab before navigating to floor planner
                setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });
                setActiveTab('spaceplanner');
                setActiveSubTab('floorplan');
              }}
              onUseAsBackground={handleUseAsBackground}
            />
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="tasks" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("tasks") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <TasksTab
                projectId={project.id}
                projectName={project.name}
                projectStatus={effectiveProject?.status}
                tasksScope={permissions.tasksScope as 'all' | 'assigned'}
                openEntityId={activeTab === "tasks" ? openEntityId : null}
                onEntityOpened={() => setOpenEntityId(null)}
                onNavigateToRoom={handleNavigateToRoomById}
                showTimeline={permissions.timeline !== 'none'}
                userType={effectiveUserType}
                currency={project?.currency}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="purchases" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("purchases") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <PurchaseRequestsTab projectId={project.id} openEntityId={activeTab === "purchases" ? openEntityId : null} onEntityOpened={() => setOpenEntityId(null)} currency={project?.currency} />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="budget" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("budget") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="w-full px-3 md:px-6 lg:px-8 py-4 md:py-8">
              <BudgetTab
                projectId={project.id}
                currency={project?.currency}
                isReadOnly={permissions.budget === "view"}
                userType={effectiveUserType}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="table" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("table") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <UnifiedTableTab
                projectId={project.id}
                currency={project?.currency}
                isReadOnly={permissions.budget === "view"}
                userType={effectiveUserType}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="planning" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("planning") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <HomeownerPlanningView
                projectId={project.id}
                projectName={project.name}
                projectAddress={project.address}
                currency={project.currency}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="customer" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("customer") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <CustomerViewTab
                projectId={project.id}
                projectName={project.name}
                projectStartDate={project.start_date}
                projectFinishDate={project.finish_goal_date}
                currency={project.currency}
                userType={effectiveUserType}
              />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="chat" className="m-0 pb-8">
          <ErrorBoundary>
          <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-2xl">
            <ProjectChatSection
              projectId={project.id}
              userType={effectiveUserType}
              onNavigateToEntity={handleFeedNavigate}
            />
          </div>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="team" className="m-0 pb-8">
          <ErrorBoundary>
          {isTabBlocked("team") || isGuest ? (
            isGuest ? (
              <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">{t('guest.featureDisabled', 'This feature requires an account')}</h2>
                <p className="text-muted-foreground mb-4">{t('guest.teamFeatureDescription', 'Sign in to invite team members and collaborate on your project.')}</p>
                <Button onClick={() => navigate("/auth")}>
                  {t('common.signIn')}
                </Button>
              </div>
            ) : (
              <NoAccessPlaceholder />
            )
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <TeamManagement projectId={project.id} isOwner={permissions.isOwner} canManageTeam={permissions.isOwner || permissions.teams === "invite"} />
            </div>
          )}
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Room Detail Dialog */}
      <RoomDetailDialog
        room={selectedRoom}
        projectId={project.id}
        open={showRoomDialog}
        onOpenChange={setShowRoomDialog}
        onRoomUpdated={handleRoomUpdated}
        showPinterest={effectiveUserType === "homeowner"}
      />

      {/* Create Room Dialog */}
      <RoomDetailDialog
        room={null}
        projectId={project.id}
        open={showCreateRoomDialog}
        onOpenChange={setShowCreateRoomDialog}
        onRoomUpdated={handleRoomCreated}
        isCreateMode={true}
        showPinterest={effectiveUserType === "homeowner"}
      />

      {isHeaderVisible && (
        <MobileBottomNav
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onTabChange={(tab, subTab) => {
            setActiveTab(tab);
            setActiveSubTab(subTab ?? null);
          }}
          isTabBlocked={isTabBlocked}
          userRole={
            permissions.isOwner
              ? "owner"
              : permissions.isClient
                ? "client"
                : permissions.tasks === "edit" || permissions.spacePlanner === "edit"
                  ? "editor"
                  : "viewer"
          }
        />
      )}

      {/* Demo role selection modal */}
      <DemoRoleModal
        open={showDemoRoleModal}
        onComplete={(role, language) => {
          demoPrefs.setRole(role);
          demoPrefs.setLanguage(language);
          setShowDemoRoleModal(false);
          if (role === "homeowner") {
            setActiveTab("customer");
          }
        }}
        onDismiss={() => {
          // Default to contractor experience if dismissed without choosing
          demoPrefs.setRole("contractor");
          setShowDemoRoleModal(false);
        }}
      />
    </div>
  );
};

export default ProjectDetail;
