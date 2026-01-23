import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Calendar, User, AlertCircle, Package, Save, Loader2, Trash2, Plus, ShoppingCart } from "lucide-react";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

interface TaskSidePanelProps {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  finish_date: string | null;
  progress: number;
  assigned_to_contractor_id: string | null;
  budget: number | null;
  cost_center: string | null;
  cost_centers?: string[] | null;
  room_id: string | null;
  created_at: string;
  profiles?: {
    name: string;
  } | null;
}

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number | null;
  status: string;
}

interface Dependency {
  id: string;
  depends_on_task: {
    title: string;
  };
}

interface TeamMember {
  id: string;
  name: string;
}

const TaskSidePanel = ({ taskId, projectId, open, onOpenChange, onTaskUpdated }: TaskSidePanelProps) => {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const { toast} = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("to_do");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [progress, setProgress] = useState(0);
  const [budget, setBudget] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  // Purchase Order form state
  const [poName, setPoName] = useState("");
  const [poDescription, setPoDescription] = useState("");
  const [poQuantity, setPoQuantity] = useState("1");
  const [poUnit, setPoUnit] = useState("pcs");
  const [poCost, setPoCost] = useState("");

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
      fetchTeamMembers();
    }
  }, [taskId, open]);

  const fetchTeamMembers = async () => {
    try {
      // Fetch project owner
      const { data: projectData } = await supabase
        .from("projects")
        .select("user_id, profiles!projects_user_id_fkey(id, name)")
        .eq("id", projectId)
        .single();

      // Fetch shared users
      const { data: sharesData } = await supabase
        .from("project_shares")
        .select("user_id, profiles!project_shares_user_id_fkey(id, name)")
        .eq("project_id", projectId);

      const members: TeamMember[] = [];
      
      if (projectData?.profiles) {
        const profile = Array.isArray(projectData.profiles) 
          ? projectData.profiles[0] 
          : projectData.profiles;
        members.push({ id: profile.id, name: profile.name || "Owner" });
      }

      if (sharesData) {
        sharesData.forEach((share: any) => {
          const profile = Array.isArray(share.profiles) 
            ? share.profiles[0] 
            : share.profiles;
          if (profile) {
            members.push({ id: profile.id, name: profile.name || "Team Member" });
          }
        });
      }

      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchTaskDetails = async () => {
    if (!taskId) {
      return;
    }

    setLoading(true);
    try {
      // Fetch task basic data first
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Task fetch error:", taskError);
        throw taskError;
      }

      // Fetch assigned user profile if exists
      let profileData = null;
      if (taskData.assigned_to_contractor_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", taskData.assigned_to_contractor_id)
          .single();
        
        profileData = profile;
      }
      
      // Combine task data with profile
      const formattedTask = {
        ...taskData,
        profiles: profileData
      };
      
      setTask(formattedTask);
      
      // Populate form fields
      setTitle(formattedTask.title);
      setDescription(formattedTask.description || "");
      setStatus(formattedTask.status);
      setPriority(formattedTask.priority);
      setStartDate(formattedTask.start_date ? parseISO(formattedTask.start_date) : undefined);
      setFinishDate(formattedTask.finish_date ? parseISO(formattedTask.finish_date) : undefined);
      setProgress(formattedTask.progress || 0);
      setBudget(formattedTask.budget?.toString() || "");
      setAssignedTo(formattedTask.assigned_to_contractor_id || "");

      // Fetch materials
      const { data: materialsData } = await supabase
        .from("materials")
        .select("id, name, quantity, unit, cost, status")
        .eq("task_id", taskId);

      setMaterials(materialsData || []);

      // Fetch dependencies
      const { data: depsData, error: depsError } = await supabase
        .from("task_dependencies")
        .select("id, depends_on_task_id")
        .eq("task_id", taskId);

      if (depsError) {
        console.error("Dependencies fetch error:", depsError);
      }

      // Fetch task titles for dependencies
      const formattedDeps: Dependency[] = [];
      if (depsData && depsData.length > 0) {
        for (const dep of depsData) {
          const { data: depTask } = await supabase
            .from("tasks")
            .select("title")
            .eq("id", dep.depends_on_task_id)
            .single();
          
          if (depTask) {
            formattedDeps.push({
              id: dep.id,
              depends_on_task: { title: depTask.title }
            });
          }
        }
      }

      setDependencies(formattedDeps);
    } catch (error: any) {
      console.error("Error fetching task details:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load task details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!taskId || !title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        finish_date: finishDate ? format(finishDate, "yyyy-MM-dd") : null,
        progress,
        budget: budget ? parseFloat(budget) : null,
        assigned_to_contractor_id: assignedTo || null,
      };

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      onTaskUpdated?.();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!poName.trim()) {
      toast({
        title: "Error",
        description: "Material name is required",
        variant: "destructive",
      });
      return;
    }

    setCreatingPO(true);
    try {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not find user profile");

      const materialData = {
        name: poName.trim(),
        description: poDescription.trim() || null,
        quantity: parseFloat(poQuantity) || 1,
        unit: poUnit,
        cost: poCost ? parseFloat(poCost) : null,
        status: "pending",
        task_id: taskId, // Link to this task
        project_id: projectId,
        created_by_user_id: profile.id,
      };

      const { error } = await supabase
        .from("materials")
        .insert(materialData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase Order created and linked to task",
      });

      // Reset form
      setPoName("");
      setPoDescription("");
      setPoQuantity("1");
      setPoUnit("pcs");
      setPoCost("");
      setPoDialogOpen(false);

      // Refresh materials list
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setCreatingPO(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/90 text-white";
      case "in_progress":
        return "bg-blue-500/90 text-white";
      case "blocked":
        return "bg-red-500/90 text-white";
      default:
        return "bg-slate-400/90 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !task ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            No task selected
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Status and Priority Badges */}
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(status)}>
                {status.replace("_", " ")}
              </Badge>
              <Badge variant={getPriorityColor(priority)}>
                {priority} priority
              </Badge>
              <div className="ml-auto text-xs text-muted-foreground">
                Created {format(parseISO(task.created_at), "MMM d, yyyy")}
              </div>
            </div>

            <Separator />

            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                className="text-lg font-semibold"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div className="space-y-2">
                <Label>Finish Date</Label>
                <DatePicker
                  date={finishDate}
                  setDate={setFinishDate}
                  placeholder="Select finish date"
                />
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Progress</Label>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="task-budget">Budget</Label>
              <Input
                id="task-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <Label className="mb-0">Dependencies</Label>
                </div>
                <div className="space-y-1">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="text-sm bg-muted px-3 py-2 rounded-lg"
                    >
                      Depends on: {dep.depends_on_task.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Orders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <Label className="mb-0">Purchase Orders ({materials.length})</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPoDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create
                </Button>
              </div>
              {materials.length > 0 && (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{material.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {material.quantity} {material.unit}
                          {material.price_per_unit && ` • $${material.price_per_unit.toFixed(2)}/unit`}
                          {material.price_total && ` • Total: $${material.price_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {material.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {materials.length === 0 && (
                <p className="text-sm text-muted-foreground">No purchase orders for this task yet.</p>
              )}
            </div>

            {/* Comments Section */}
            {taskId && (
              <>
                <Separator className="my-6" />
                <CommentsSection taskId={taskId} projectId={projectId} />
              </>
            )}

            {/* Save Button */}
            <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t -mx-6 px-6 mt-8">
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>

      {/* Create Purchase Order Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Purchase Order for Task</DialogTitle>
            <DialogDescription>
              This purchase order will be linked to "{title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="po-name">Material Name *</Label>
              <Input
                id="po-name"
                value={poName}
                onChange={(e) => setPoName(e.target.value)}
                placeholder="e.g. Floor tiles"
              />
            </div>
            <div>
              <Label htmlFor="po-description">Description</Label>
              <Textarea
                id="po-description"
                value={poDescription}
                onChange={(e) => setPoDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po-quantity">Quantity</Label>
                <Input
                  id="po-quantity"
                  type="number"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="po-unit">Unit</Label>
                <Select value={poUnit} onValueChange={setPoUnit}>
                  <SelectTrigger id="po-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="sqm">Square Meters</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="po-cost">Estimated Cost</Label>
              <Input
                id="po-cost"
                type="number"
                value={poCost}
                onChange={(e) => setPoCost(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreatePurchaseOrder}
                disabled={creatingPO || !poName.trim()}
                className="flex-1"
              >
                {creatingPO ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase Order
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPoDialogOpen(false)}
                disabled={creatingPO}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default TaskSidePanel;
