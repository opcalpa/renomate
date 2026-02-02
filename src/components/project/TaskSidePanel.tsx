import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Calendar, User, AlertCircle, Package, Save, Loader2, Trash2, Plus, ShoppingCart, ChevronDown, Tag, X } from "lucide-react";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { EntityPhotoGallery } from "@/components/shared/EntityPhotoGallery";
import { TaskFilesList } from "./TaskFilesList";
import { DEFAULT_COST_CENTERS } from "@/lib/costCenters";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

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
  ordered_amount: number | null;
  paid_amount: number | null;
  payment_status: string | null;
  cost_center: string | null;
  cost_centers?: string[] | null;
  room_id: string | null;
  checklists?: Checklist[];
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
  price_per_unit: number | null;
  price_total: number | null;
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

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: 'toDo', in_progress: 'inProgress', on_hold: 'onHold',
    new_construction: 'newConstruction', to_be_renovated: 'toBeRenovated',
    not_paid: 'notPaid', partially_paid: 'partiallyPaid',
  };
  return map[s] || s;
};

const TaskSidePanel = ({ taskId, projectId, open, onOpenChange, onTaskUpdated }: TaskSidePanelProps) => {
  const { t } = useTranslation();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const { toast} = useToast();

  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("to_do");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [progress, setProgress] = useState(0);
  const [budget, setBudget] = useState("");
  const [orderedAmount, setOrderedAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("not_paid");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);

  // Purchase Order form state
  const [poName, setPoName] = useState("");
  const [poQuantity, setPoQuantity] = useState("1");
  const [poUnit, setPoUnit] = useState("pcs");
  const [poPricePerUnit, setPoPricePerUnit] = useState("");

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
      fetchTeamMembers();
      fetchRooms();
    }
  }, [taskId, open]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("project_id", projectId)
      .order("name");
    setRooms(data || []);
  };

  const fetchTeamMembers = async () => {
    try {
      // Fetch project owner
      const { data: projectData } = await supabase
        .from("projects")
        .select("owner_id, profiles!projects_owner_id_fkey(id, name)")
        .eq("id", projectId)
        .single();

      // Fetch shared users
      const { data: sharesData } = await supabase
        .from("project_shares")
        .select("shared_with_user_id, profiles!project_shares_shared_with_user_id_fkey(id, name)")
        .eq("project_id", projectId);

      const members: TeamMember[] = [];

      if (projectData?.profiles) {
        const profile = Array.isArray(projectData.profiles)
          ? projectData.profiles[0]
          : projectData.profiles;
        if (profile) {
          members.push({ id: profile.id, name: profile.name || "Owner" });
        }
      }

      if (sharesData) {
        const existingIds = new Set(members.map(m => m.id));
        sharesData.forEach((share: unknown) => {
          const s = share as { profiles?: { id: string; name: string } | null };
          if (s.profiles && !existingIds.has(s.profiles.id)) {
            existingIds.add(s.profiles.id);
            members.push({ id: s.profiles.id, name: s.profiles.name || "Team Member" });
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
      setOrderedAmount(formattedTask.ordered_amount?.toString() || "");
      setPaidAmount(formattedTask.paid_amount?.toString() || "");
      setPaymentStatus(formattedTask.payment_status || "not_paid");
      setAssignedTo(formattedTask.assigned_to_contractor_id || "");
      setRoomId(formattedTask.room_id || "");
      setCostCenters(formattedTask.cost_centers || (formattedTask.cost_center ? [formattedTask.cost_center] : []));
      setChecklists(formattedTask.checklists || []);

      // Fetch materials
      const { data: materialsData } = await supabase
        .from("materials")
        .select("id, name, quantity, unit, price_per_unit, price_total, status")
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
        title: t('common.error'),
        description: error?.message || t('taskPanel.failedToLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!taskId || !title.trim()) {
      toast({
        title: t('common.error'),
        description: t('taskPanel.taskTitleRequired'),
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
        ordered_amount: orderedAmount ? parseFloat(orderedAmount) : null,
        paid_amount: paidAmount ? parseFloat(paidAmount) : null,
        payment_status: paymentStatus || null,
        assigned_to_contractor_id: assignedTo || null,
        room_id: roomId || null,
        cost_centers: costCenters.length > 0 ? costCenters : null,
        cost_center: costCenters[0] || null,
        checklists: checklists,
      };

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('taskPanel.taskUpdated'),
      });

      onTaskUpdated?.();
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: t('common.error'),
        description: t('taskPanel.failedToUpdate'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!poName.trim()) {
      toast({
        title: t('common.error'),
        description: t('taskPanel.materialNameRequired'),
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
        quantity: parseFloat(poQuantity) || 1,
        unit: poUnit,
        price_per_unit: poPricePerUnit ? parseFloat(poPricePerUnit) : null,
        status: "submitted",
        task_id: taskId,
        project_id: projectId,
        created_by_user_id: profile.id,
      };

      const { error } = await supabase
        .from("materials")
        .insert(materialData);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('taskPanel.poCreatedAndLinked'),
      });

      // Reset form
      setPoName("");
      setPoQuantity("1");
      setPoUnit("pcs");
      setPoPricePerUnit("");
      setPoDialogOpen(false);

      // Refresh materials list
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Error creating purchase order:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('taskPanel.failedToCreatePO'),
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
      case "waiting":
        return "bg-yellow-500/90 text-white";
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
          <SheetTitle>{t('taskPanel.title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('taskPanel.title')}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !task ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            {t('taskPanel.noTaskSelected')}
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Status and Priority Badges */}
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(status)}>
                {t(`statuses.${statusKey(status)}`)}
              </Badge>
              <Badge variant={getPriorityColor(priority)}>
                {t(`tasks.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`)}
              </Badge>
              <div className="ml-auto text-xs text-muted-foreground">
                Created {format(parseISO(task.created_at), "MMM d, yyyy")}
              </div>
            </div>

            <Separator />

            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">{t('tasks.taskTitle')} *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('taskPanel.enterTaskTitle')}
                className="text-lg font-semibold"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">{t('common.description')}</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('taskPanel.addDescription')}
                rows={4}
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">{t('statuses.planned', 'Planned')}</SelectItem>
                    <SelectItem value="to_do">{t('statuses.toDo')}</SelectItem>
                    <SelectItem value="in_progress">{t('statuses.inProgress')}</SelectItem>
                    <SelectItem value="waiting">{t('statuses.waiting')}</SelectItem>
                    <SelectItem value="completed">{t('statuses.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('statuses.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('common.priority')}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tasks.priorityLow')}</SelectItem>
                    <SelectItem value="medium">{t('tasks.priorityMedium')}</SelectItem>
                    <SelectItem value="high">{t('tasks.priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.startDate')}</Label>
                <DatePicker
                  date={startDate}
                  setDate={setStartDate}
                  placeholder={t('taskPanel.selectStartDate')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('common.finishDate')}</Label>
                <DatePicker
                  date={finishDate}
                  setDate={setFinishDate}
                  placeholder={t('taskPanel.selectFinishDate')}
                />
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('common.progress')}</Label>
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
              <Label htmlFor="task-budget">{t('common.budget')}</Label>
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
              <Label>{t('common.assignedTo')}</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder={t('taskPanel.selectTeamMember')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label>{t('purchases.room')}</Label>
              <Select value={roomId || "none"} onValueChange={(v) => setRoomId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('purchases.selectRoom')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('purchases.noRoom')}</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('purchases.orderedAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={orderedAmount}
                  onChange={(e) => setOrderedAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('purchases.paidAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.paymentStatus')}</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(value) => {
                    if (value === "input_amount") {
                      setPaymentStatus("partially_paid");
                    } else {
                      setPaymentStatus(value);
                      if (value === "paid" && budget) {
                        setPaidAmount(budget);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_paid">{t('paymentStatuses.notPaid')}</SelectItem>
                    <SelectItem value="paid">{t('materialStatuses.paid')}</SelectItem>
                    <SelectItem value="billed">{t('materialStatuses.billed')}</SelectItem>
                    <SelectItem value="input_amount">{t('paymentStatuses.partiallyPaid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cost Centers */}
            <div className="space-y-2">
              <Label>{t('budget.costCenter')}</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {DEFAULT_COST_CENTERS.map((cc) => {
                  const Icon = cc.icon;
                  const isSelected = costCenters.includes(cc.id);
                  return (
                    <div key={cc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sp-cc-${cc.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newCenters = checked
                            ? [...costCenters, cc.id]
                            : costCenters.filter(c => c !== cc.id);
                          setCostCenters(newCenters);
                        }}
                      />
                      <label
                        htmlFor={`sp-cc-${cc.id}`}
                        className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        {cc.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklists */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('taskPanel.checklists', 'Checklists')}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newChecklist: Checklist = {
                      id: crypto.randomUUID(),
                      title: t('taskPanel.checklist', 'Checklist'),
                      items: [],
                    };
                    setChecklists([...checklists, newChecklist]);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('taskPanel.addChecklist', 'Add Checklist')}
                </Button>
              </div>
              {checklists.map((checklist, clIdx) => {
                const completedCount = checklist.items.filter(i => i.completed).length;
                const totalCount = checklist.items.length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                const updateChecklist = (updates: Partial<Checklist>) => {
                  const updated = [...checklists];
                  updated[clIdx] = { ...updated[clIdx], ...updates };
                  setChecklists(updated);
                };

                const deleteChecklist = () => {
                  setChecklists(checklists.filter((_, i) => i !== clIdx));
                };

                return (
                  <div key={checklist.id} className="border rounded-lg">
                    <Collapsible defaultOpen>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <Input
                          value={checklist.title}
                          onChange={(e) => updateChecklist({ title: e.target.value })}
                          className="h-7 text-sm font-medium border-none shadow-none px-1 focus-visible:ring-1"
                        />
                        {totalCount > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {completedCount}/{totalCount}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={deleteChecklist}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {totalCount > 0 && (
                        <div className="px-3 pb-1">
                          <Progress value={progressPct} className="h-1.5" />
                        </div>
                      )}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-1">
                          {checklist.items.map((item, itemIdx) => (
                            <div key={item.id} className="flex items-center gap-2 group">
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={(checked) => {
                                  const newItems = [...checklist.items];
                                  newItems[itemIdx] = { ...newItems[itemIdx], completed: !!checked };
                                  updateChecklist({ items: newItems });
                                }}
                              />
                              <Input
                                value={item.title}
                                onChange={(e) => {
                                  const newItems = [...checklist.items];
                                  newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                  updateChecklist({ items: newItems });
                                }}
                                className={`h-7 text-sm border-none shadow-none px-1 focus-visible:ring-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const newItems = checklist.items.filter((_, i) => i !== itemIdx);
                                  updateChecklist({ items: newItems });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Input
                            placeholder={t('taskPanel.addItem', 'Add item...')}
                            className="h-7 text-sm mt-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  const newItem: ChecklistItem = {
                                    id: crypto.randomUUID(),
                                    title: val,
                                    completed: false,
                                  };
                                  updateChecklist({ items: [...checklist.items, newItem] });
                                  (e.target as HTMLInputElement).value = "";
                                }
                              }
                            }}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <Label className="mb-0">{t('taskPanel.dependencies')}</Label>
                </div>
                <div className="space-y-1">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="text-sm bg-muted px-3 py-2 rounded-lg"
                    >
                      {t('taskPanel.dependsOn')}: {dep.depends_on_task.title}
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
                  <Label className="mb-0">{t('taskPanel.purchaseOrders')} ({materials.length})</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPoDialogOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('common.create')}
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
                          {material.price_per_unit != null && ` • ${material.price_per_unit.toFixed(2)}/${t('common.unit').toLowerCase()}`}
                          {material.price_total != null && ` • ${t('purchases.priceTotal')}: ${material.price_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                <p className="text-sm text-muted-foreground">{t('taskPanel.noPurchaseOrdersForTask')}</p>
              )}
            </div>

            {/* Photos */}
            {taskId && (
              <>
                <Separator className="my-4" />
                <EntityPhotoGallery entityId={taskId} entityType="task" />
              </>
            )}

            {/* Linked Files */}
            {taskId && (
              <>
                <Separator className="my-4" />
                <TaskFilesList taskId={taskId} projectId={projectId} />
              </>
            )}

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
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('taskPanel.saveChanges')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>

      {/* Create Purchase Order Dialog */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('taskPanel.createPOForTask')}</DialogTitle>
            <DialogDescription>
              {t('taskPanel.poLinkedTo', { title })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="po-name">{t('purchases.materialName')} *</Label>
              <Input
                id="po-name"
                value={poName}
                onChange={(e) => setPoName(e.target.value)}
                placeholder="e.g. Floor tiles"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po-quantity">{t('common.quantity')}</Label>
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
                <Label htmlFor="po-unit">{t('common.unit')}</Label>
                <Select value={poUnit} onValueChange={setPoUnit}>
                  <SelectTrigger id="po-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">{t('taskPanel.pieces')}</SelectItem>
                    <SelectItem value="sqm">{t('taskPanel.squareMeters')}</SelectItem>
                    <SelectItem value="m">{t('taskPanel.meters')}</SelectItem>
                    <SelectItem value="kg">{t('taskPanel.kilograms')}</SelectItem>
                    <SelectItem value="liters">{t('taskPanel.liters')}</SelectItem>
                    <SelectItem value="hours">{t('taskPanel.hours')}</SelectItem>
                    <SelectItem value="days">{t('taskPanel.days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="po-price-per-unit">{t('purchases.pricePerUnit')} ({t('common.optional')})</Label>
              <Input
                id="po-price-per-unit"
                type="number"
                value={poPricePerUnit}
                onChange={(e) => setPoPricePerUnit(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {poQuantity && poPricePerUnit && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('purchases.priceTotal')}: {(parseFloat(poQuantity) * parseFloat(poPricePerUnit)).toFixed(2)}
                </p>
              )}
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
                    {t('purchases.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchases.createOrder')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPoDialogOpen(false)}
                disabled={creatingPO}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default TaskSidePanel;
