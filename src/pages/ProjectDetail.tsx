import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfileLanguage } from "@/hooks/useProfileLanguage";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ChevronDown, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SpacePlannerTab from "@/components/project/SpacePlannerTab";
import TasksTab from "@/components/project/TasksTab";
import OverviewTab from "@/components/project/OverviewTab";
import ProjectTimeline from "@/components/project/ProjectTimeline";
import TeamManagement from "@/components/project/TeamManagement";
import PurchaseRequestsTab from "@/components/project/PurchaseRequestsTab";
import ProjectFilesTab from "@/components/project/ProjectFilesTab";
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

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { user, signOut, loading: authLoading } = useAuthSession();
  useProfileLanguage();
  const { t } = useTranslation();

  // Menu configurations for hover dropdowns
  const menuConfigs = {
    overview: [],
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
    team: [],
  };
  const [profile, setProfile] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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

      // Fetch all projects for the dropdown
      const { data: allProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", profileData?.id)
        .order("created_at", { ascending: false });

      setProjects(allProjects || []);

      // Check ownership and management permissions
      if (profileData) {
        const ownerStatus = projectData.owner_id === profileData.id;
        setIsOwner(ownerStatus);

        // Check if user can manage (is owner or has admin/editor role)
        if (!ownerStatus) {
          const { data: shareData } = await supabase
            .from("project_shares")
            .select("role")
            .eq("project_id", projectId)
            .eq("shared_with_user_id", profileData.id)
            .single();

          setCanManage(shareData?.role === "admin" || shareData?.role === "editor");
        } else {
          setCanManage(true);
        }
      }
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
    setActiveTab(menuId);

    // Handle sub-tabs for menus with sub-items
    if (menuId === 'spaceplanner') {
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

  // Show loading while auth or data is loading
  if (authLoading || loading) {
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
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      {/* Main AppHeader - Hidden in Floor Plan edit mode */}
      {isHeaderVisible && (
        <AppHeader
          userName={profile?.name}
          userEmail={profile?.email || user?.email}
          avatarUrl={profile?.avatar_url}
          onSignOut={handleSignOut}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
        {/* Tab Navigation - Hidden in Floor Plan edit mode */}
        {isHeaderVisible && (
        <div className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
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
              <div className="flex flex-1 items-center space-x-8">
                <HoverTabMenu
                  trigger={
                    <div className={cn(
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      activeTab === "overview" && "border-b-2 border-primary text-primary"
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
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      activeTab === "spaceplanner" && "border-b-2 border-primary text-primary"
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
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5",
                      activeTab === "files" && "border-b-2 border-primary text-primary"
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
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      activeTab === "tasks" && "border-b-2 border-primary text-primary"
                    )}>
                      {t("projectDetail.tasks")}
                    </div>
                  }
                  items={menuConfigs.tasks}
                  onSelect={(value) => handleMenuSelect('tasks', value)}
                  onMainClick={() => handleMenuSelect('tasks', 'tasklist')}
                  activeValue={activeTab === "tasks" ? activeSubTab || "tasklist" : undefined}
                />

                <HoverTabMenu
                  trigger={
                    <div className={cn(
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      activeTab === "purchases" && "border-b-2 border-primary text-primary"
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
                      "px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                      activeTab === "team" && "border-b-2 border-primary text-primary"
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
          </div>
        </div>
        )}

        <TabsContent value="overview" className="m-0 pb-8">
          <div className="container mx-auto px-4 py-8">
            <OverviewTab project={project} onProjectUpdate={loadData} projectFinishDate={project.finish_goal_date} />
          </div>
        </TabsContent>

        <TabsContent value="spaceplanner" className="m-0 h-screen">
          {(!activeSubTab || activeSubTab === 'floorplan') && (
            <SpacePlannerTab
              projectId={project.id}
              projectName={project.name}
              onBack={() => {
                setActiveTab('overview');
                setActiveSubTab(null);
              }}
            />
          )}
          {activeSubTab === 'rooms' && (
            <div className="container mx-auto px-4 py-8">
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
        </TabsContent>

        <TabsContent value="files" className="m-0 pb-8">
          <ProjectFilesTab
            projectId={project.id}
            projectName={project.name}
            onNavigateToFloorPlan={() => {
              setActiveTab('spaceplanner');
              setActiveSubTab('floorplan');
            }}
            onUseAsBackground={handleUseAsBackground}
          />
        </TabsContent>

        <TabsContent value="tasks" className="m-0 pb-8">
          <div className="container mx-auto px-4 py-8">
            {(!activeSubTab || activeSubTab === 'tasklist') && (
              <TasksTab projectId={project.id} />
            )}
            {activeSubTab === 'timeline' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Project Timeline</h2>
                <ProjectTimeline projectId={project.id} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="m-0 pb-8">
          <div className="container mx-auto px-4 py-8">
            <PurchaseRequestsTab projectId={project.id} />
          </div>
        </TabsContent>

        <TabsContent value="team" className="m-0 pb-8">
          <div className="container mx-auto px-4 py-8">
            <TeamManagement projectId={project.id} isOwner={isOwner} />
          </div>
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
    </div>
  );
};

export default ProjectDetail;
