import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Layers, Trash2, MoreVertical, Home, User, Settings, LogOut, Globe, LayoutDashboard, CheckSquare, ShoppingCart, Users } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFloorMapStore } from "./store";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createPlanInDB, deletePlanFromDB } from "./utils/plans";

interface SpacePlannerTopBarProps {
  projectId: string;
  projectName?: string;
  onBack?: () => void;
}

export const SpacePlannerTopBar = ({ projectId, projectName, onBack }: SpacePlannerTopBarProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'sv');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
  };
  const { 
    viewMode, 
    setViewMode, 
    plans, 
    currentPlanId, 
    setCurrentPlanId, 
    addPlan,
    deletePlan,
    shapes
  } = useFloorMapStore();
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDescription, setNewPlanDescription] = useState("");
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // No auto-hide - always visible for better UX
  // This matches industry standard design tools (Figma, Canva, etc.)

  const handleCreateNewPlan = async () => {
    if (!newPlanName.trim()) {
      toast({
        title: "Namn krävs",
        description: "Ange ett namn för det nya planet",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create plan in database
      const newPlan = await createPlanInDB(projectId, newPlanName.trim());
      
      if (!newPlan) {
        throw new Error('Kunde inte skapa plan');
      }

      // Add to store
      addPlan(newPlan);
      setCurrentPlanId(newPlan.id);
      setShowNewPlanDialog(false);
      setNewPlanName("");
      setNewPlanDescription("");

      toast({
        title: "Nytt plan skapat!",
        description: `"${newPlan.name}" har skapats och är nu aktivt`,
      });
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast({
        title: "Fel vid skapande",
        description: error.message || "Kunde inte skapa nytt plan",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    // Prevent deleting if it's the last plan
    if (plans.length <= 1) {
      toast({
        title: "Kan inte radera",
        description: "Du måste ha minst ett plan. Skapa ett nytt innan du raderar detta.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete from database
      const success = await deletePlanFromDB(planId);
      
      if (!success) {
        throw new Error('Kunde inte radera plan från databasen');
      }

      // If we're deleting the current plan, switch to another one
      if (currentPlanId === planId) {
        const otherPlan = plans.find(p => p.id !== planId);
        if (otherPlan) {
          setCurrentPlanId(otherPlan.id);
        }
      }

      // Remove from store
      deletePlan(planId);
      setPlanToDelete(null);

      const deletedPlan = plans.find(p => p.id === planId);
      toast({
        title: "Plan raderat",
        description: `"${deletedPlan?.name}" har raderats`,
      });
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Fel vid radering",
        description: error.message || "Kunde inte radera planet",
        variant: "destructive",
      });
    }
  };

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const currentPlanShapes = shapes.filter(s => s.planId === currentPlanId);

  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur-md fixed top-0 left-0 right-0 z-[60] flex items-center px-4 gap-4 shadow-sm">
      {/* Main Menu (3 dots) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Project Navigation */}
          <DropdownMenuLabel>{projectName || t('Project')}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}`)} className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>{t('projectDetail.overview')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}?tab=tasks`)} className="cursor-pointer">
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>{t('projectDetail.tasks')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}?tab=purchases`)} className="cursor-pointer">
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>Purchases</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}?tab=team`)} className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* App Navigation */}
          <DropdownMenuLabel>Renomate</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("/projects")} className="cursor-pointer">
            <Home className="mr-2 h-4 w-4" />
            <span>{t('nav.projects')}</span>
          </DropdownMenuItem>
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
              <span>{t('common.language')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={currentLanguage} onValueChange={handleLanguageChange}>
                <DropdownMenuRadioItem value="sv">Svenska</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('common.signOut')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onBack ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Back")}</span>
        </Button>
      ) : (
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center justify-center gap-2 shrink-0 h-9 px-3 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Back")}</span>
        </Link>
      )}
      
      <div className="h-6 w-px bg-border hidden sm:block" />

      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <span
          className="truncate max-w-[120px] sm:max-w-[200px] text-foreground font-medium"
          title={projectName}
        >
          {projectName || t("Project")}
        </span>
      </div>

      {/* Plan Selector */}
      <div className="ml-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="max-w-[200px] truncate">
                {currentPlan?.name || "Välj plan"}
              </span>
              {currentPlanShapes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {currentPlanShapes.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[300px]">
            <DropdownMenuLabel>Floor Plans</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {plans.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Inga plan skapade ännu
              </div>
            ) : (
              plans.map((plan) => {
                const planShapes = shapes.filter(s => s.planId === plan.id);
                return (
                  <DropdownMenuItem
                    key={plan.id}
                    className={`${currentPlanId === plan.id ? "bg-accent" : ""} group`}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div 
                      className="flex flex-col flex-1 gap-1 cursor-pointer"
                      onClick={() => setCurrentPlanId(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{plan.name}</span>
                        {planShapes.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {planShapes.length} objekt
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <span className="text-xs text-muted-foreground">
                          {plan.description}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlanToDelete(plan.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </DropdownMenuItem>
                );
              })
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowNewPlanDialog(true)}
              className="text-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Skapa nytt plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center bg-muted/50 rounded-lg p-1">
          <Button
            variant={viewMode === "floor" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("floor")}
            className="h-7 px-3 text-xs"
          >
            {t("Floor Plan")}
          </Button>
          <Button
            variant={viewMode === "elevation" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("elevation")}
            className="h-7 px-3 text-xs"
          >
            {t("Elevation")}
          </Button>
          <Button
            variant={viewMode === "3d" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("3d")}
            className="h-7 px-3 text-xs"
          >
            {t("3D View")}
          </Button>
        </div>
      </div>

      {/* New Plan Dialog */}
      <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa nytt Floor Plan</DialogTitle>
            <DialogDescription>
              Skapa ett nytt tomt plan eller importera från en ritning
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan namn *</Label>
              <Input
                id="plan-name"
                placeholder="t.ex. Våning 1, Källare, Alternativ A"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewPlan();
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plan-description">Beskrivning (valfritt)</Label>
              <Input
                id="plan-description"
                placeholder="t.ex. Huvudplan med alla rum"
                value={newPlanDescription}
                onChange={(e) => setNewPlanDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewPlanDialog(false);
                setNewPlanName("");
                setNewPlanDescription("");
              }}
            >
              Avbryt
            </Button>
            <Button onClick={handleCreateNewPlan}>
              <Plus className="h-4 w-4 mr-2" />
              Skapa plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera Floor Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera "{plans.find(p => p.id === planToDelete)?.name}"?
              <br />
              <br />
              <strong>Detta går inte att ångra.</strong> Alla väggar, rum och objekt i detta plan kommer att raderas permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && handleDeletePlan(planToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Radera plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};
