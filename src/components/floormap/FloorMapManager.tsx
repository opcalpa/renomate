import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, Plus, Pencil, Trash2, Copy, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFloorMapStore } from "./store";
import { FloorMapPlan } from "./types";
import { toast } from "sonner";

interface FloorMapManagerProps {
  plans: FloorMapPlan[];
  currentPlanId: string | null;
  onCreatePlan: (name: string) => Promise<void>;
  onSelectPlan: (planId: string) => Promise<void>;
  onRenamePlan: (planId: string, name: string) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onSetDefault: (planId: string) => Promise<void>;
  onMergePlans: (planIds: string[], newName: string) => Promise<void>;
}

export const FloorMapManager = ({
  plans,
  currentPlanId,
  onCreatePlan,
  onSelectPlan,
  onRenamePlan,
  onDeletePlan,
  onSetDefault,
  onMergePlans,
}: FloorMapManagerProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [renamingPlanId, setRenamingPlanId] = useState<string | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!newPlanName.trim()) {
      toast.error(t("Plan name cannot be empty"));
      return;
    }
    
    await onCreatePlan(newPlanName);
    setNewPlanName("");
    setShowCreateDialog(false);
  };

  const handleRename = async () => {
    if (!renamingPlanId || !newPlanName.trim()) {
      toast.error(t("Plan name cannot be empty"));
      return;
    }
    
    await onRenamePlan(renamingPlanId, newPlanName);
    setNewPlanName("");
    setRenamingPlanId(null);
    setShowRenameDialog(false);
  };

  const handleMerge = async () => {
    if (selectedForMerge.length < 2) {
      toast.error(t("Select at least 2 plans to merge"));
      return;
    }
    
    if (!newPlanName.trim()) {
      toast.error(t("Merged plan name cannot be empty"));
      return;
    }
    
    await onMergePlans(selectedForMerge, newPlanName);
    setSelectedForMerge([]);
    setNewPlanName("");
    setShowMergeDialog(false);
  };

  const toggleMergeSelection = (planId: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-2" />
            {t("Manage Plans")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Space Planner Manager")}</DialogTitle>
            <DialogDescription>
              {t("Create, rename, and organize your floor plans")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex-1"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("New Plan")}
              </Button>
              <Button
                onClick={() => setShowMergeDialog(true)}
                variant="outline"
                className="flex-1"
                size="sm"
                disabled={plans.length < 2}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("Merge Plans")}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {plans.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t("No floor plans yet. Create your first one!")}
                    </p>
                  </Card>
                ) : (
                  plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        currentPlanId === plan.id
                          ? "border-primary bg-accent"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => onSelectPlan(plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {plan.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="font-medium">{plan.name}</span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {!plan.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onSetDefault(plan.id)}
                              title={t("Set as default")}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setRenamingPlanId(plan.id);
                              setNewPlanName(plan.name);
                              setShowRenameDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeletePlan(plan.id)}
                            disabled={plans.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(plan.updatedAt).toLocaleDateString()}
                      </div>
                    </Card>
                  ))
                )}
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Create New Floor Plan")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">{t("Plan Name")}</Label>
              <Input
                id="plan-name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder={t("e.g., Ground Floor, First Floor")}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleCreate}>{t("Create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Rename Floor Plan")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-plan">{t("Plan Name")}</Label>
              <Input
                id="rename-plan"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleRename}>{t("Rename")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Merge Floor Plans")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Select plans to merge (minimum 2)")}</Label>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      checked={selectedForMerge.includes(plan.id)}
                      onCheckedChange={() => toggleMergeSelection(plan.id)}
                    />
                    <Label className="flex-1">{plan.name}</Label>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merged-name">{t("Name for merged plan")}</Label>
              <Input
                id="merged-name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder={t("e.g., Complete Floor Plan")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleMerge} disabled={selectedForMerge.length < 2}>
              {t("Merge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
