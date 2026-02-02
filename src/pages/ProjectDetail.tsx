import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ChevronDown, FolderOpen, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SpacePlannerTab from "@/components/project/SpacePlannerTab";
import TasksTab from "@/components/project/TasksTab";
import OverviewTab from "@/components/project/OverviewTab";
import ProjectTimeline from "@/components/project/ProjectTimeline";
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
}

const NoAccessPlaceholder = () => (
  <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
    <Lock className="h-12 w-12 text-muted-foreground mb-4" />
    <h2 className="text-xl font-semibold mb-2">Ingen behörighet</h2>
    <p className="text-muted-foreground">Du har inte tillgång till den här sektionen.</p>
  </div>
);

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user, signOut, loading: authLoading } = useAuthSession();
  useProfileLanguage();
  const { t } = useTranslation();

  // Menu configurations for hover dropdowns
  const menuConfigs = {
    overview: [
      { label: "Overview", value: "overview", description: "Project summary and status" },
      { label: "Feed", value: "feed", description: "Comments and activity feed" },
    ],
    spaceplanner: [
      { label: "Floor Plan", value: "floorplan", description: "Design and plan your floor layout" },
      { label: "Rooms", value: "rooms", description: "Manage and configure rooms" },
    ],
    files: [],
    tasks: [
      { label: "Task List", value: "tasklist", description: "View and manage all tasks" },
      { label: "Timeline", value: "timeline", description: "Project timeline and scheduling" },
    ],
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
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
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

      // Fetch all projects for the dropdown
      const { data: allProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", profileData?.id)
        .order("created_at", { ascending: false });

      setProjects(allProjects || []);
    } catch (error: any) {
      toast({
        title: "Error",
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

  const handleDeleteRoom = async (roomId: string) => {
    // Hitta rummet för att visa namnet i bekräftelsen
    const room = roomsData.find(r => r.id === roomId);

    if (!room) return;

    if (!confirm(`Är du säker på att du vill ta bort rummet "${room.name}"? Denna åtgärd kan inte ångras.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Rum borttaget",
        description: `"${room.name}" har tagits bort`,
      });

      // Uppdatera rooms state direkt istället för att hämta från databasen
      setRoomsData(prev => prev.filter(r => r.id !== roomId));
      setRoomsLoading(false);

    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: error.message || "Kunde inte ta bort rum",
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
      if (menuConfigs.tasks.find(item => item.value === itemValue)) {
        setActiveSubTab(itemValue);
      } else {
        setActiveSubTab('tasklist');
      }
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

    // Navigate to Floor Plan tab
    setActiveTab('spaceplanner');
    setActiveSubTab('floorplan');

    toast({
      title: "Bild tillagd",
      description: `"${fileName}" har lagts till som bakgrundsbild på canvas`,
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
        setActiveTab("spaceplanner");
        setActiveSubTab("floorplan");
        break;
    }
  };

  // Show loading while auth or data is loading
  if (authLoading || loading || permissions.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className={cn("min-h-screen bg-background flex flex-col overflow-y-auto md:pb-0", isHeaderVisible ? "pb-20" : "pb-0")}>
      {/* Unified Header - Hidden in Floor Plan edit mode */}
      {isHeaderVisible && (
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
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  All Projects
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

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "spaceplanner" ? "border border-primary text-primary" : "border border-transparent",
                    isTabBlocked("spaceplanner") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    Space Planner
                  </div>
                }
                items={menuConfigs.spaceplanner}
                onSelect={(value) => handleMenuSelect('spaceplanner', value)}
                onMainClick={() => handleMenuSelect('spaceplanner', 'floorplan')}
                activeValue={activeTab === "spaceplanner" ? activeSubTab || "floorplan" : undefined}
              />

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border flex items-center gap-1.5",
                    activeTab === "files" ? "border border-primary text-primary" : "border border-transparent",
                    isTabBlocked("files") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    <FolderOpen className="h-4 w-4" />
                    Filer
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
                items={menuConfigs.tasks.filter(item => !isSubTabBlocked('tasks', item.value))}
                onSelect={(value) => handleMenuSelect('tasks', value)}
                onMainClick={() => {
                  if (!isSubTabBlocked('tasks', 'tasklist')) handleMenuSelect('tasks', 'tasklist');
                  else if (!isSubTabBlocked('tasks', 'timeline')) handleMenuSelect('tasks', 'timeline');
                }}
                activeValue={activeTab === "tasks" ? activeSubTab || "tasklist" : undefined}
              />

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "purchases" ? "border border-primary text-primary" : "border border-transparent",
                    isTabBlocked("purchases") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    Purchases
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
                    Budget
                  </div>
                }
                items={menuConfigs.budget}
                onSelect={(value) => handleMenuSelect('budget', value)}
                onMainClick={() => handleMenuSelect('budget', 'budget')}
                activeValue={activeTab === "budget" ? "budget" : undefined}
              />

              <HoverTabMenu
                trigger={
                  <div className={cn(
                    "px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors rounded-md hover:border hover:border-border",
                    activeTab === "team" ? "border border-primary text-primary" : "border border-transparent",
                    isTabBlocked("team") && "opacity-40 pointer-events-none cursor-default"
                  )}>
                    Team
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
              <OverviewTab project={project} onProjectUpdate={loadData} projectFinishDate={project.finish_goal_date} onNavigateToEntity={handleFeedNavigate} />
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
                    setActiveTab('overview');
                    setActiveSubTab(null);
                  }}
                  isReadOnly={permissions.spacePlanner === 'view'}
                />
              )}
              {activeSubTab === 'rooms' && (
                <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
                  <h2 className="text-2xl font-bold mb-4">Room Management</h2>
                  <p className="text-muted-foreground mb-6">Manage and configure rooms for your project.</p>
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
              {(!activeSubTab || activeSubTab === 'tasklist') && (
                permissions.tasks === 'none' ? (
                  <NoAccessPlaceholder />
                ) : (
                  <TasksTab projectId={project.id} tasksScope={permissions.tasksScope as 'all' | 'assigned'} openEntityId={activeTab === "tasks" ? openEntityId : null} onEntityOpened={() => setOpenEntityId(null)} />
                )
              )}
              {activeSubTab === 'timeline' && (
                permissions.timeline === 'none' ? (
                  <NoAccessPlaceholder />
                ) : (
                  <div>
                    <ProjectTimeline projectId={project.id} projectName={project.name} />
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="m-0 pb-8">
          {isTabBlocked("purchases") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <PurchaseRequestsTab projectId={project.id} openEntityId={activeTab === "purchases" ? openEntityId : null} onEntityOpened={() => setOpenEntityId(null)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="budget" className="m-0 pb-8">
          {isTabBlocked("budget") ? (
            <NoAccessPlaceholder />
          ) : (
            <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
              <BudgetTab projectId={project.id} />
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
          onTabChange={(tab) => {
            setActiveTab(tab);
            setActiveSubTab(null);
          }}
          isTabBlocked={isTabBlocked}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
