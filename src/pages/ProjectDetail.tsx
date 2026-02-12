import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, FolderOpen, Lock, BookOpen, Loader2, PartyPopper, X } from "lucide-react";
import { isDemoProject, refreshDemoProjectDates } from "@/services/demoProjectService";
import { ProjectDetailSkeleton } from "@/components/ui/skeleton-screens";
import { WithHotspot } from "@/components/onboarding/Hotspot";
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
import type { FeedComment } from "@/components/project/feed/types";
import { getContextType } from "@/components/project/feed/utils";
import { MobileBottomNav } from "@/components/project/MobileBottomNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverTabMenu } from "@/components/ui/HoverTabMenu";
import { RoomsList } from "@/components/floormap/RoomsList";
import { RoomDetailDialog } from "@/components/floormap/RoomDetailDialog";
import { useFloorMapStore } from "@/components/floormap/store";
import { FloorMapShape } from "@/components/floormap/types";
import { v4 as uuidv4 } from "uuid";

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
  useProfileLanguage();
  const { t } = useTranslation();

  // Menu configurations for hover dropdowns
  const menuConfigs = {
    overview: [
      { label: t('projectDetail.overview'), value: "overview", description: t('projectDetail.overviewDesc', 'Project summary and status') },
      { label: t('nav.mobileNav.feed'), value: "feed", description: t('projectDetail.feedDesc', 'Comments and activity feed') },
    ],
    spaceplanner: [
      { label: t('projectDetail.floorPlan', 'Floor Plan'), value: "floorplan", description: t('projectDetail.floorPlanDesc', 'Design and plan your floor layout') },
      { label: t('projectDetail.rooms', 'Rooms'), value: "rooms", description: t('projectDetail.roomsDesc', 'Manage and configure rooms') },
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Map tab keys to permission keys
  const tabPermissionMap: Record<string, string> = {
    overview: permissions.overview,
    spaceplanner: permissions.spacePlanner,
    files: permissions.files,
    // "tasks" parent tab is accessible if either tasks or timeline has access
    tasks: (permissions.tasks !== 'none' || permissions.timeline !== 'none') ? 'view' : 'none',
    purchases: permissions.purchases,
    budget: permissions.budget,
    team: permissions.teams,
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
    const validTabs = ["overview", "spaceplanner", "files", "tasks", "purchases", "budget", "team", "feed"];
    return tabParam && validTabs.includes(tabParam) ? tabParam : "overview";
  });
  const [openEntityId, setOpenEntityId] = useState<string | null>(() => searchParams.get("entityId"));

  // Sync ?tab= and ?entityId= search params (handles navigation from notifications, etc.)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const entityParam = searchParams.get("entityId");
    const validTabs = ["overview", "spaceplanner", "files", "tasks", "purchases", "budget", "team", "feed"];
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
      setOpenEntityId(entityParam);
      setSearchParams({}, { replace: true });
    } else if (entityParam) {
      setOpenEntityId(entityParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeTab, setSearchParams]);

  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  // Track previous tab for "Back" navigation from floor planner
  const getTabLabelKey = (tab: string): string => {
    const map: Record<string, string> = {
      overview: 'nav.mobileNav.overview',
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

    if (!user) {
      navigate("/auth");
    } else {
      loadData();
    }
  }, [user, projectId, authLoading]);

  // Hide main header when in Floor Plan edit mode
  // SpacePlannerTopBar will be the only visible header (industry standard UX)
  useEffect(() => {
    if (activeTab === "spaceplanner" && (!activeSubTab || activeSubTab === "floorplan")) {
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

      // If this is a demo project, refresh task dates to be relative to today
      // This ensures the timeline always shows relevant example data
      if (isDemoProject(projectData?.project_type) && profileData?.id) {
        refreshDemoProjectDates(profileData.id);
      }

      // Fetch all projects for the dropdown
      const { data: allProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", profileData?.id)
        .order("created_at", { ascending: false });

      setProjects(allProjects || []);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
      navigate("/projects");
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

    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('projectDetail.failedToDeleteRoom'),
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
    if (menuId !== "overview" && isTabBlocked(menuId)) return;
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
        setActiveSubTab('floorplan');
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

  const demoBannerContent = isDemo ? (
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
          userName={profile?.name}
          userEmail={profile?.email || user?.email}
          avatarUrl={profile?.avatar_url}
          onSignOut={handleSignOut}
        >
          {/* Mobile project name */}
          <span className="text-sm font-medium truncate md:hidden">
            {project?.name}
          </span>
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 shrink-0">
                  <FolderOpen className="h-4 w-4" />
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-[100]">
                <DropdownMenuLabel>{t('nav.projects')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('projectDetail.allProjects')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((proj) => (
                  <DropdownMenuItem
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className={`cursor-pointer ${proj.id === projectId ? "bg-accent" : ""}`}
                  >
                    <span className="truncate">{proj.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center space-x-6">
              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "overview" ? "border border-primary text-primary" : "border border-transparent"
                  )}>
                    {t("projectDetail.overview")}
                  </div>
                }
                items={menuConfigs.overview}
                onSelect={(value) => handleMenuSelect('overview', value)}
                onMainClick={() => handleMenuSelect('overview', 'overview')}
                activeValue={activeTab === "overview" ? activeSubTab || "overview" : undefined}
              />

              <WithHotspot
                hotspotId="canvas-tab"
                hotspotContent="hotspots.canvas"
                hotspotPosition="top-right"
                showOnce={true}
              >
                <HoverTabMenu
                  trigger={
                    <div className={cn(
                      "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                      activeTab === "spaceplanner" ? "border border-primary text-primary" : "border border-transparent",
                      isTabBlocked("spaceplanner") && "opacity-40 pointer-events-none cursor-default"
                    )}>
                      {t('projectDetail.spacePlanner')}
                    </div>
                  }
                  items={menuConfigs.spaceplanner}
                  onSelect={(value) => handleMenuSelect('spaceplanner', value)}
                  onMainClick={() => handleMenuSelect('spaceplanner', 'floorplan')}
                  activeValue={activeTab === "spaceplanner" ? activeSubTab || "floorplan" : undefined}
                />
              </WithHotspot>

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border flex items-center gap-1.5",
                    activeTab === "files" ? "border border-primary text-primary" : "border border-transparent",
                    isTabBlocked("files") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    <FolderOpen className="h-4 w-4" />
                    {t('projectDetail.files')}
                  </div>
                }
                items={menuConfigs.files}
                onSelect={(value) => handleMenuSelect('files', value)}
                onMainClick={() => handleMenuSelect('files', 'files')}
                activeValue={activeTab === "files" ? "files" : undefined}
              />

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "tasks" ? "border border-primary text-primary" : "border border-transparent",
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

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "purchases" ? "border border-primary text-primary" : "border border-transparent",
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

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "budget" ? "border border-primary text-primary" : "border border-transparent",
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

              <WithHotspot
                hotspotId="invite-team"
                hotspotContent="hotspots.inviteTeam"
                hotspotPosition="top-right"
                showOnce={true}
              >
                <HoverTabMenu
                  trigger={
                    <div className={cn(
                      "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                      activeTab === "team" ? "border border-primary text-primary" : "border border-transparent",
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
              </WithHotspot>
            </div>
          </div>
        </AppHeader>
        {/* Demo banner inside sticky wrapper — sticks with header */}
        {isDemo && (
          <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
            {demoBannerContent}
          </div>
        )}
        </div>
      )}

      {/* Demo banner in floorplan mode — fixed below SpacePlannerTopBar */}
      {!isHeaderVisible && isDemo && (
        <div className="fixed top-14 left-0 right-0 z-[59] bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
          {demoBannerContent}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">

        <TabsContent value="overview" className="m-0 pb-8">
          {isTabBlocked("overview") ? (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <ProjectFeedTab projectId={project.id} onNavigateToEntity={handleFeedNavigate} restrictToUserId={profile?.id} />
            </div>
          ) : activeSubTab === 'feed' ? (
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
                project={project}
                onProjectUpdate={loadData}
                onNavigateToEntity={handleFeedNavigate}
                onNavigateToPurchases={() => {
                  setActiveTab('purchases');
                  setActiveSubTab(null);
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
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="spaceplanner" className="m-0 h-screen">
          {isTabBlocked("spaceplanner") ? (
            <NoAccessPlaceholder />
          ) : (
            <>
              {(!activeSubTab || activeSubTab === 'floorplan') && (
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
                />
              )}
              {activeSubTab === 'rooms' && (
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
        </TabsContent>

        <TabsContent value="files" className="m-0 pb-8">
          {isTabBlocked("files") ? (
            <NoAccessPlaceholder />
          ) : (
            <ProjectFilesTab
              projectId={project.id}
              projectName={project.name}
              onNavigateToFloorPlan={() => {
                // Save current tab before navigating to floor planner
                setPreviousTab({ tab: activeTab, subTab: activeSubTab, label: getTabLabelKey(activeTab) });
                setActiveTab('spaceplanner');
                setActiveSubTab('floorplan');
              }}
              onUseAsBackground={handleUseAsBackground}
            />
          )}
        </TabsContent>

        <TabsContent value="tasks" className="m-0 pb-8">
          {isTabBlocked("tasks") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <TasksTab
                projectId={project.id}
                projectName={project.name}
                tasksScope={permissions.tasksScope as 'all' | 'assigned'}
                openEntityId={activeTab === "tasks" ? openEntityId : null}
                onEntityOpened={() => setOpenEntityId(null)}
                onNavigateToRoom={handleNavigateToRoomById}
                showTimeline={permissions.timeline !== 'none'}
                currency={project?.currency}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="m-0 pb-8">
          {isTabBlocked("purchases") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <PurchaseRequestsTab projectId={project.id} openEntityId={activeTab === "purchases" ? openEntityId : null} onEntityOpened={() => setOpenEntityId(null)} currency={project?.currency} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget" className="m-0 pb-8">
          {isTabBlocked("budget") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <BudgetTab projectId={project.id} currency={project?.currency} isReadOnly={permissions.budget === "view"} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="m-0 pb-8">
          {isTabBlocked("team") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <TeamManagement projectId={project.id} isOwner={permissions.isOwner} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Room Detail Dialog */}
      <RoomDetailDialog
        room={selectedRoom}
        projectId={project.id}
        open={showRoomDialog}
        onOpenChange={setShowRoomDialog}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Create Room Dialog */}
      <RoomDetailDialog
        room={null}
        projectId={project.id}
        open={showCreateRoomDialog}
        onOpenChange={setShowCreateRoomDialog}
        onRoomUpdated={handleRoomCreated}
        isCreateMode={true}
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
              : permissions.tasks === "edit" || permissions.spacePlanner === "edit"
                ? "editor"
                : permissions.overview !== "none"
                  ? "client"
                  : "viewer"
          }
        />
      )}
    </div>
  );
};

export default ProjectDetail;
