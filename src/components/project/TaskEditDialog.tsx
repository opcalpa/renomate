import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/currency";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Tag, ChevronDown, ChevronRight, Trash2, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { EntityPhotoGallery } from "@/components/shared/EntityPhotoGallery";
import { TaskFilesList } from "./TaskFilesList";
import { DEFAULT_COST_CENTERS } from "@/lib/costCenters";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

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

interface MaterialItem {
  id: string;
  name: string;
  amount: number;
  markup_percent: number | null; // null = use group markup
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  finish_date: string | null;
  progress: number;
  assigned_to_stakeholder_id: string | null;
  room_id: string | null;
  budget: number | null;
  ordered_amount: number | null;
  payment_status: string | null;
  paid_amount: number | null;
  cost_center: string | null;
  cost_centers?: string[] | null;
  checklists?: Checklist[];
  material_items?: MaterialItem[];
  project_id: string;
  task_cost_type: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
  material_markup_percent: number | null;
  labor_cost_percent: number | null;
  is_ata: boolean;
}

interface TaskEditDialogProps {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  currency?: string | null;
  projectStatus?: string | null;
}

export const TaskEditDialog = ({
  taskId,
  projectId,
  open,
  onOpenChange,
  onSaved,
  currency,
  projectStatus,
}: TaskEditDialogProps) => {
  const isPlanning = projectStatus === "planning";
  const { t } = useTranslation();
  const { toast } = useToast();
  const permissions = useProjectPermissions(projectId);
  const isBuilder = permissions.isOwner;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [customCostCenters, setCustomCostCenters] = useState<string[]>([]);
  const [showCustomCostCenter, setShowCustomCostCenter] = useState(false);
  const [customCostCenterValue, setCustomCostCenterValue] = useState("");
  const [perRowMarkup, setPerRowMarkup] = useState(false);
  const [profileDefaultRate, setProfileDefaultRate] = useState<number | null>(null);
  const [profileLaborCostPercent, setProfileLaborCostPercent] = useState<number | null>(null);
  const hasAutoFilledRef = useRef(false);
  const [materialSpent, setMaterialSpent] = useState(0);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) throw error;
      setTask(data);

      // Fetch material spend for this task
      const { data: matSpendData } = await supabase
        .from("materials")
        .select("price_total")
        .eq("task_id", taskId)
        .eq("exclude_from_budget", false);
      setMaterialSpent((matSpendData || []).reduce((sum, m) => sum + (m.price_total || 0), 0));

      // Detect per-row markup mode from loaded data
      const items: MaterialItem[] = data.material_items || [];
      setPerRowMarkup(items.length > 0 && items.some((i: MaterialItem) => (i.markup_percent ?? null) !== null));

      // Extract custom cost centers from task
      const existingCenters = data.cost_centers || [];
      const defaultIds = DEFAULT_COST_CENTERS.map((cc) => cc.id);
      const custom = existingCenters.filter((c: string) => !defaultIds.includes(c));
      setCustomCostCenters(custom);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load task";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [taskId, toast, t]);

  const fetchSupportingData = useCallback(async () => {
    try {
      // Fetch rooms
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId)
        .order("name");
      setRooms(roomsData || []);

      // Fetch team members in two steps (no FK relationship)
      const { data: sharesData } = await supabase
        .from("project_shares")
        .select("shared_with_user_id")
        .eq("project_id", projectId);

      const profileIds = (sharesData || [])
        .map((s) => s.shared_with_user_id)
        .filter((id): id is string => id != null);

      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", profileIds);

        setTeamMembers(
          (profilesData || [])
            .filter((p) => p.name)
            .map((p) => ({ id: p.id, name: p.name }))
        );
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error("Failed to fetch supporting data:", error);
    }
  }, [projectId]);

  const fetchProfileDefault = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("default_hourly_rate, default_labor_cost_percent")
        .eq("user_id", user.id)
        .single();
      setProfileDefaultRate(data?.default_hourly_rate ?? null);
      setProfileLaborCostPercent(data?.default_labor_cost_percent ?? null);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      fetchSupportingData();
      fetchProfileDefault();
    }
    if (!open) {
      hasAutoFilledRef.current = false;
    }
  }, [open, taskId, fetchTask, fetchSupportingData, fetchProfileDefault]);

  // Auto-fill hourly rate from profile default during planning
  useEffect(() => {
    if (
      isPlanning &&
      task &&
      task.hourly_rate == null &&
      profileDefaultRate != null &&
      !hasAutoFilledRef.current
    ) {
      hasAutoFilledRef.current = true;
      const hours = task.estimated_hours || 0;
      const labor = hours * profileDefaultRate;
      const ue = (task.subcontractor_cost || 0) * (1 + (task.markup_percent || 0) / 100);
      const mat = (task.material_estimate || 0) * (1 + (task.material_markup_percent || 0) / 100);
      const budget = labor + ue + mat || null;
      setTask({ ...task, hourly_rate: profileDefaultRate, budget });
    }
  }, [isPlanning, task, profileDefaultRate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setSaving(true);
    try {
      // Build update payload — only include cost fields if they exist on the DB
      // (i.e. the migration has been applied and select("*") returned them)
      const payload: Record<string, unknown> = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        start_date: task.start_date || null,
        finish_date: task.finish_date || null,
        room_id: task.room_id || null,
        progress: task.progress,
        assigned_to_stakeholder_id: task.assigned_to_stakeholder_id || null,
        budget: task.budget || null,
        ordered_amount: task.ordered_amount || null,
        payment_status: task.payment_status || null,
        paid_amount: task.paid_amount || null,
        cost_center: task.cost_center || null,
        cost_centers: task.cost_centers || null,
        checklists: task.checklists || [],
      };

      // Cost estimation fields — only include if the column existed when we fetched
      if ("task_cost_type" in task) {
        payload.task_cost_type = task.task_cost_type || "own_labor";
        payload.estimated_hours = task.estimated_hours || null;
        payload.hourly_rate = task.hourly_rate || null;
        payload.subcontractor_cost = task.subcontractor_cost || null;
        payload.markup_percent = task.markup_percent ?? 0;
        payload.material_estimate = task.material_estimate || null;
        payload.material_markup_percent = task.material_markup_percent ?? 0;
      }

      // Labor cost percent — only include if the column existed when we fetched
      if ("labor_cost_percent" in task) {
        payload.labor_cost_percent = task.labor_cost_percent;
      }

      // Material items — only include if the column existed when we fetched
      if ("material_items" in task) {
        payload.material_items = task.material_items || [];
      }

      // ÄTA field — only include if the column existed when we fetched
      if ("is_ata" in task) {
        payload.is_ata = task.is_ata;
      }

      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("tasks.taskUpdatedDescription"),
      });

      // Offer to save hourly rate as profile default if none set yet
      if (
        task.hourly_rate &&
        task.hourly_rate > 0 &&
        profileDefaultRate == null
      ) {
        toast({
          description: t("taskCost.saveAsDefault"),
          action: (
            <ToastAction
              altText={t("common.save")}
              onClick={async () => {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (!currentUser) return;
                const { error: profileError } = await supabase
                  .from("profiles")
                  .update({ default_hourly_rate: task.hourly_rate })
                  .eq("user_id", currentUser.id);
                if (!profileError) {
                  setProfileDefaultRate(task.hourly_rate);
                  toast({
                    description: t("taskCost.rateSavedToProfile"),
                  });
                }
              }}
            >
              {t("common.save")}
            </ToastAction>
          ),
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateChecklist = (clIdx: number, updates: Partial<Checklist>) => {
    if (!task) return;
    const updated = [...(task.checklists || [])];
    updated[clIdx] = { ...updated[clIdx], ...updates };
    setTask({ ...task, checklists: updated });
  };

  const deleteChecklist = (clIdx: number) => {
    if (!task) return;
    const updated = (task.checklists || []).filter((_, i) => i !== clIdx);
    setTask({ ...task, checklists: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{t("tasks.editTask")}</DialogTitle>
          <DialogDescription>{t("tasks.editTaskDescription")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : task ? (
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 py-4 px-6">
              {/* ── Always-visible fields ── */}
              <div className="space-y-2">
                <Label htmlFor="edit-task-title">{t("tasks.taskTitle")}</Label>
                <Input
                  id="edit-task-title"
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-description">{t("tasks.description")}</Label>
                <Textarea
                  id="edit-task-description"
                  value={task.description || ""}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Room selector — shown during planning */}
              {isPlanning && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {t("tasks.room")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px]">
                          <p className="text-xs">{t("tasks.roomTooltip")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select
                    value={task.room_id || "none"}
                    onValueChange={(value) =>
                      setTask({ ...task, room_id: value === "none" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("tasks.noRoom")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("tasks.noRoom")}</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ÄTA checkbox — only shown after planning phase */}
              {!isPlanning && "is_ata" in task && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-task-is-ata"
                  checked={task.is_ata}
                  onCheckedChange={(checked) => setTask({ ...task, is_ata: !!checked })}
                />
                <Label htmlFor="edit-task-is-ata" className="text-sm font-normal cursor-pointer">
                  {t("tasks.isAta")}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px]">
                      <p className="text-xs">{t("tasks.ataTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              )}

              {/* Cost estimation — planning mode gets the pricing form */}
              {isPlanning ? (
              (() => {
                const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
                const ueWithMarkup = (task.subcontractor_cost || 0) * (1 + (task.markup_percent || 0) / 100);

                // Material calculation — supports both simple and multi-row modes
                const calcMaterial = (t: Task) => {
                  const items = t.material_items || [];
                  if (items.length > 0) {
                    const base = items.reduce((sum, i) => sum + (i.amount || 0), 0);
                    const hasPerRow = items.some(i => (i.markup_percent ?? null) !== null);
                    if (hasPerRow) {
                      return items.reduce((sum, i) =>
                        sum + (i.amount || 0) * (1 + (i.markup_percent || 0) / 100), 0);
                    }
                    return base * (1 + (t.material_markup_percent || 0) / 100);
                  }
                  return (t.material_estimate || 0) * (1 + (t.material_markup_percent || 0) / 100);
                };

                const materialWithMarkup = calcMaterial(task);
                const materialBase = (task.material_items || []).length > 0
                  ? (task.material_items || []).reduce((sum, i) => sum + (i.amount || 0), 0)
                  : (task.material_estimate || 0);
                const customerPrice = laborTotal + ueWithMarkup + materialWithMarkup;
                const ueMarkupAmount = ueWithMarkup - (task.subcontractor_cost || 0);
                const materialMarkupAmount = materialWithMarkup - materialBase;
                const effectiveCostPercent = task.labor_cost_percent ?? profileLaborCostPercent ?? 50;
                const laborProfit = laborTotal * (1 - effectiveCostPercent / 100);
                const result = laborProfit + ueMarkupAmount + materialMarkupAmount;

                const recalcBudget = (updates: Partial<Task>) => {
                  const next = { ...task, ...updates };
                  const labor = (next.estimated_hours || 0) * (next.hourly_rate || 0);
                  const ue = (next.subcontractor_cost || 0) * (1 + (next.markup_percent || 0) / 100);
                  // Sync material_estimate from items for backward compat
                  const items = next.material_items || [];
                  if (items.length > 0) {
                    next.material_estimate = items.reduce((sum, i) => sum + (i.amount || 0), 0) || null;
                  }
                  const mat = calcMaterial(next);
                  const total = labor + ue + mat;
                  setTask({ ...next, budget: total || null });
                };

                return (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <Label className="text-sm font-semibold">{t("taskCost.pricing", "Pricing")}</Label>

                {/* Own labor */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("taskCost.ownLabor", "Own labor")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("taskCost.estimatedHours", "Hours")}</Label>
                      <Input
                        type="number" step="0.5" min="0" placeholder="0"
                        value={task.estimated_hours?.toString() || ""}
                        onChange={(e) => {
                          const hours = e.target.value ? parseFloat(e.target.value) : null;
                          recalcBudget({ estimated_hours: hours });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("taskCost.hourlyRate", "Hourly rate")}</Label>
                      <Input
                        type="number" step="1" min="0" placeholder="0"
                        value={task.hourly_rate?.toString() || ""}
                        onChange={(e) => {
                          const rate = e.target.value ? parseFloat(e.target.value) : null;
                          recalcBudget({ hourly_rate: rate });
                        }}
                      />
                    </div>
                  </div>
                  {laborTotal > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {t("taskCost.laborTotal", "Labor")}: {formatCurrency(laborTotal, currency)}
                    </p>
                  )}
                  {laborTotal > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {t("taskCost.costPercent", "Cost %")}:
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px]">
                              <p className="text-xs">{t("taskCost.costPercentTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      {task.labor_cost_percent != null ? (
                        <Input
                          type="number" step="1" min="0" max="100" placeholder="50"
                          value={task.labor_cost_percent?.toString() || ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            setTask({ ...task, labor_cost_percent: val });
                          }}
                          className="w-16 h-7 text-sm text-right"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{effectiveCostPercent}%</span>
                      )}
                      <Switch
                        checked={task.labor_cost_percent != null}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTask({ ...task, labor_cost_percent: effectiveCostPercent });
                          } else {
                            setTask({ ...task, labor_cost_percent: null });
                          }
                        }}
                        className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                      />
                      <span className="text-xs text-muted-foreground">
                        {task.labor_cost_percent != null ? t("taskCost.perTask", "Per task") : t("taskCost.standard", "Standard")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Subcontractor */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t("taskCost.subcontractor", "Subcontractor")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("taskCost.subcontractorCost", "Subcontractor cost")}</Label>
                      <Input
                        type="number" step="1" min="0" placeholder="0"
                        value={task.subcontractor_cost?.toString() || ""}
                        onChange={(e) => {
                          const cost = e.target.value ? parseFloat(e.target.value) : null;
                          recalcBudget({ subcontractor_cost: cost });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("taskCost.markupPercent", "Markup %")}</Label>
                      <Input
                        type="number" step="1" min="0" placeholder="0"
                        value={task.markup_percent?.toString() || ""}
                        onChange={(e) => {
                          const markup = e.target.value ? parseFloat(e.target.value) : null;
                          recalcBudget({ markup_percent: markup });
                        }}
                      />
                    </div>
                  </div>
                  {(task.subcontractor_cost || 0) > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {t("taskCost.withMarkup", "With markup")}: {formatCurrency(ueWithMarkup, currency)}
                    </p>
                  )}
                </div>

                {/* Material */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{t("taskCost.materialEstimate", "Material estimate")}</Label>
                    {(task.material_items || []).length === 0 && (
                      <Button
                        type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => {
                          const firstItem: MaterialItem = {
                            id: crypto.randomUUID(),
                            name: "Material",
                            amount: task.material_estimate || 0,
                            markup_percent: null,
                          };
                          recalcBudget({ material_items: [firstItem] });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {(task.material_items || []).length === 0 ? (
                    /* Simple mode — single amount + markup */
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("taskCost.materialEstimate", "Material")}</Label>
                          <Input
                            type="number" step="1" min="0" placeholder="0"
                            value={task.material_estimate?.toString() || ""}
                            onChange={(e) => {
                              const material = e.target.value ? parseFloat(e.target.value) : null;
                              recalcBudget({ material_estimate: material });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("taskCost.materialMarkup", "Markup %")}</Label>
                          <Input
                            type="number" step="1" min="0" placeholder="0"
                            value={task.material_markup_percent?.toString() || ""}
                            onChange={(e) => {
                              const markup = e.target.value ? parseFloat(e.target.value) : null;
                              recalcBudget({ material_markup_percent: markup });
                            }}
                          />
                        </div>
                      </div>
                      {(task.material_estimate || 0) > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                          {t("taskCost.materialWithMarkup", "With markup")}: {formatCurrency(materialWithMarkup, currency)}
                        </p>
                      )}
                    </>
                  ) : (
                    /* Multi-row mode */
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("taskCost.groupMarkup", "Group")}</span>
                        <Switch
                          checked={perRowMarkup}
                          onCheckedChange={(checked) => {
                            const items = task.material_items || [];
                            if (checked) {
                              // Group → Per-row: copy group markup into each item
                              const groupMarkup = task.material_markup_percent || 0;
                              const updated = items.map(i => ({ ...i, markup_percent: groupMarkup }));
                              setPerRowMarkup(true);
                              recalcBudget({ material_items: updated, material_markup_percent: 0 });
                            } else {
                              // Per-row → Group: use first item's markup as group, clear per-row
                              const firstMarkup = items[0]?.markup_percent || 0;
                              const updated = items.map(i => ({ ...i, markup_percent: null }));
                              setPerRowMarkup(false);
                              recalcBudget({ material_items: updated, material_markup_percent: firstMarkup });
                            }
                          }}
                          className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                        />
                        <span className="text-xs text-muted-foreground">{t("taskCost.perRowMarkup", "Per row")}</span>
                      </div>

                      {/* Group markup field */}
                      {!perRowMarkup && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t("taskCost.markupPercent", "Markup %")}</Label>
                          <Input
                            type="number" step="1" min="0" placeholder="0"
                            value={task.material_markup_percent?.toString() || ""}
                            onChange={(e) => {
                              const markup = e.target.value ? parseFloat(e.target.value) : null;
                              recalcBudget({ material_markup_percent: markup });
                            }}
                          />
                        </div>
                      )}

                      {/* Item rows */}
                      <div className="space-y-2">
                        {(task.material_items || []).map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Input
                              placeholder={t("taskCost.materialName", "Description")}
                              value={item.name}
                              onChange={(e) => {
                                const items = [...(task.material_items || [])];
                                items[idx] = { ...items[idx], name: e.target.value };
                                recalcBudget({ material_items: items });
                              }}
                              className="flex-1"
                            />
                            <Input
                              type="number" step="1" min="0" placeholder="SEK"
                              value={item.amount?.toString() || ""}
                              onChange={(e) => {
                                const items = [...(task.material_items || [])];
                                items[idx] = { ...items[idx], amount: e.target.value ? parseFloat(e.target.value) : 0 };
                                recalcBudget({ material_items: items });
                              }}
                              className="w-24"
                            />
                            {perRowMarkup && (
                              <Input
                                type="number" step="1" min="0" placeholder="%"
                                value={item.markup_percent?.toString() || ""}
                                onChange={(e) => {
                                  const items = [...(task.material_items || [])];
                                  items[idx] = { ...items[idx], markup_percent: e.target.value ? parseFloat(e.target.value) : 0 };
                                  recalcBudget({ material_items: items });
                                }}
                                className="w-16"
                              />
                            )}
                            <Button
                              type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const items = (task.material_items || []).filter((_, i) => i !== idx);
                                if (items.length === 0) {
                                  // Revert to simple mode
                                  setPerRowMarkup(false);
                                }
                                recalcBudget({ material_items: items });
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => {
                          const newItem: MaterialItem = {
                            id: crypto.randomUUID(),
                            name: "",
                            amount: 0,
                            markup_percent: perRowMarkup ? 0 : null,
                          };
                          recalcBudget({ material_items: [...(task.material_items || []), newItem] });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("taskCost.addMaterial", "Add material")}
                      </Button>

                      {materialWithMarkup > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                          {t("taskCost.materialWithMarkup", "With markup")}: {formatCurrency(materialWithMarkup, currency)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("taskCost.customerPrice", "Customer price")}</span>
                  <span className="text-sm font-semibold">
                    {formatCurrency(customerPrice, currency)}
                  </span>
                </div>
                {isBuilder && customerPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      {t("taskCost.result", "Result")}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px]">
                            <p className="text-xs">{t("taskCost.resultTooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className={`text-sm font-semibold ${result >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(result, currency)}
                    </span>
                  </div>
                )}
              </div>
                );
              })()
              ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-task-budget">
                  {isBuilder ? t("tasks.contractValue", "Contract Value") : t("tasks.budget")}
                </Label>
                <Input
                  id="edit-task-budget"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={task.budget?.toString() || ""}
                  onChange={(e) =>
                    setTask({ ...task, budget: e.target.value ? parseFloat(e.target.value) : null })
                  }
                />
              </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-start-date">{t("tasks.startDate")}</Label>
                  <DatePicker
                    date={task.start_date ? parseLocalDate(task.start_date) : undefined}
                    onDateChange={(date) =>
                      setTask({ ...task, start_date: date ? formatLocalDate(date) : null })
                    }
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-finish-date">{t("tasks.finishDate")}</Label>
                  <DatePicker
                    date={task.finish_date ? parseLocalDate(task.finish_date) : undefined}
                    onDateChange={(date) =>
                      setTask({ ...task, finish_date: date ? formatLocalDate(date) : null })
                    }
                    placeholder="Välj slutdatum"
                  />
                </div>
              </div>

              {/* ── Collapsible sections ── */}
              {!isPlanning && (
              <div className="space-y-1 pt-2">

                {/* Status & Priority & Assignee */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("tasks.status")} / {t("tasks.priority")} / {t("tasks.assignTo")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-task-status">{t("tasks.status")}</Label>
                          <Select
                            value={task.status}
                            onValueChange={(value) => setTask({ ...task, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planned">{t("statuses.planned", "Planned")}</SelectItem>
                              <SelectItem value="to_do">{t("statuses.toDo")}</SelectItem>
                              <SelectItem value="in_progress">{t("statuses.inProgress")}</SelectItem>
                              <SelectItem value="waiting">{t("statuses.waiting")}</SelectItem>
                              <SelectItem value="completed">{t("statuses.completed")}</SelectItem>
                              <SelectItem value="cancelled">{t("statuses.cancelled")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-task-priority">{t("tasks.priority")}</Label>
                          <Select
                            value={task.priority}
                            onValueChange={(value) => setTask({ ...task, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{t("tasks.priorityLow")}</SelectItem>
                              <SelectItem value="medium">{t("tasks.priorityMedium")}</SelectItem>
                              <SelectItem value="high">{t("tasks.priorityHigh")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-task-assignee">{t("tasks.assignTo")}</Label>
                        <Select
                          value={task.assigned_to_stakeholder_id || "unassigned"}
                          onValueChange={(value) =>
                            setTask({
                              ...task,
                              assigned_to_stakeholder_id: value === "unassigned" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("common.unassigned")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">{t("common.unassigned")}</SelectItem>
                            {teamMembers.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name} {member.role ? `(${member.role})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Progress */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("tasks.progress")}: {task.progress}%
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3">
                      <Slider
                        id="edit-task-progress"
                        min={0}
                        max={100}
                        step={5}
                        value={[task.progress]}
                        onValueChange={([value]) => setTask({ ...task, progress: value })}
                        className="w-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Room */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("tasks.room")}{task.room_id ? `: ${rooms.find(r => r.id === task.room_id)?.name || ""}` : ""}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3">
                      <Select
                        value={task.room_id || "none"}
                        onValueChange={(value) =>
                          setTask({ ...task, room_id: value === "none" ? null : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("tasks.noRoom")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("tasks.noRoom")}</SelectItem>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Payment / cost tracking */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {isBuilder ? t("tasks.costTracking", "Cost Tracking") : t("tasks.paymentStatus")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3 space-y-3">
                      {/* Cost Breakdown — builder only */}
                      {isBuilder && task.budget ? (() => {
                        const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
                        const ueCost = task.subcontractor_cost || 0;
                        const ueMarkup = ueCost * (task.markup_percent || 0) / 100;
                        const materialBase = task.material_estimate || 0;
                        const materialMarkup = materialBase * (task.material_markup_percent || 0) / 100;
                        const effectiveCostPercent = task.labor_cost_percent ?? profileLaborCostPercent ?? 50;
                        const laborProfit = laborTotal * (1 - effectiveCostPercent / 100);
                        const totalProfit = laborProfit + ueMarkup + materialMarkup;

                        return (
                          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{t("taskCost.customerPrice")}</span>
                              <span className="text-sm font-semibold">{formatCurrency(task.budget, currency)}</span>
                            </div>
                            <Separator />
                            <span className="text-xs font-medium text-muted-foreground">{t("costBreakdown.title")}</span>
                            {laborTotal > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t("taskCost.ownLabor")}</span>
                                <span>{formatCurrency(laborTotal, currency)}</span>
                              </div>
                            )}
                            {ueCost > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t("taskCost.subcontractor")}</span>
                                <span>{formatCurrency(ueCost + ueMarkup, currency)}</span>
                              </div>
                            )}
                            {materialBase > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {t("taskCost.materialEstimate")}
                                  <span className="ml-1 text-muted-foreground/60">({t("costBreakdown.spendingBudget")})</span>
                                </span>
                                <span>{formatCurrency(materialBase, currency)}</span>
                              </div>
                            )}
                            {totalProfit > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{t("costBreakdown.markupProfit")}</span>
                                <span className="text-green-600">{formatCurrency(totalProfit, currency)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })() : null}

                      {/* Purchase Tracking — builder only, when material_estimate > 0 */}
                      {isBuilder && (task.material_estimate || 0) > 0 ? (() => {
                        const materialBudget = task.material_estimate || 0;
                        const ratio = materialSpent / materialBudget;
                        const remaining = materialBudget - materialSpent;
                        const barColor = ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";
                        const textColor = remaining < 0 ? "text-destructive" : remaining > 0 ? "text-emerald-600" : "";

                        return (
                          <div className="rounded-lg border p-3 space-y-2">
                            <span className="text-xs font-medium">{t("costBreakdown.purchaseTracking")}</span>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t("costBreakdown.materialBudget")}</span>
                              <span>{formatCurrency(materialBudget, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t("costBreakdown.spent")}</span>
                              <span>{formatCurrency(materialSpent, currency)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`}
                                   style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t("costBreakdown.remainingToBuy")}</span>
                              <span className={textColor}>{formatCurrency(remaining, currency)}</span>
                            </div>
                          </div>
                        );
                      })() : null}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-task-ordered">
                            {isBuilder ? t("tasks.materialPurchased", "Material Purchased") : t("tasks.ordered")}
                          </Label>
                          <Input
                            id="edit-task-ordered"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={task.ordered_amount?.toString() || ""}
                            onChange={(e) =>
                              setTask({
                                ...task,
                                ordered_amount: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-task-paid">
                            {isBuilder ? t("tasks.expenses", "Expenses") : t("tasks.paid")}
                          </Label>
                          <Input
                            id="edit-task-paid"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={task.paid_amount?.toString() || ""}
                            onChange={(e) =>
                              setTask({
                                ...task,
                                paid_amount: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Margin — builder only */}
                      {isBuilder && task.budget ? (() => {
                        const totalExpenses = (task.paid_amount || 0) + (task.ordered_amount || 0);
                        const laborCost = (task.estimated_hours || 0) * (task.hourly_rate || 0);
                        const ueCost = task.subcontractor_cost || 0;
                        const matCost = task.material_estimate || 0;
                        const estimatedCosts = laborCost + ueCost + matCost;
                        const margin = task.budget - (totalExpenses > 0 ? totalExpenses : estimatedCosts);
                        return (
                          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                            <span className="text-sm text-muted-foreground">{t("tasks.margin", "Margin")}</span>
                            <span className={`text-sm font-semibold ${margin >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {formatCurrency(margin, currency)}
                            </span>
                          </div>
                        );
                      })() : null}

                      {!isBuilder && task.budget && (
                        <div className="space-y-2">
                          <Label htmlFor="edit-task-payment-status">{t("tasks.paymentStatus")}</Label>
                          <Select
                            value={task.payment_status || "not_paid"}
                            onValueChange={(value) => {
                              if (value === "input_amount") {
                                setTask({ ...task, payment_status: "partially_paid" });
                              } else {
                                setTask({
                                  ...task,
                                  payment_status: value,
                                  paid_amount: value === "paid" && task.budget ? task.budget : null,
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_paid">{t("tasks.notPaid")}</SelectItem>
                              <SelectItem value="paid">{t("tasks.paid")}</SelectItem>
                              <SelectItem value="billed">{t("tasks.billed")}</SelectItem>
                              <SelectItem value="input_amount">{t("tasks.partiallyPaid")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Cost Centers */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("tasks.costCentersMultiple")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3 space-y-2">
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {DEFAULT_COST_CENTERS.map((cc) => {
                          const Icon = cc.icon;
                          const isSelected = (task.cost_centers || []).includes(cc.id);
                          return (
                            <div key={cc.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cc-${cc.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentCenters = task.cost_centers || [];
                                  const newCenters = checked
                                    ? [...currentCenters, cc.id]
                                    : currentCenters.filter((c) => c !== cc.id);
                                  setTask({ ...task, cost_centers: newCenters, cost_center: newCenters[0] || null });
                                }}
                              />
                              <label htmlFor={`cc-${cc.id}`} className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                                <Icon className="h-4 w-4" />
                                {cc.label}
                              </label>
                            </div>
                          );
                        })}
                        {customCostCenters.map((cc) => {
                          const isSelected = (task.cost_centers || []).includes(cc);
                          return (
                            <div key={cc} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cc-custom-${cc}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentCenters = task.cost_centers || [];
                                  const newCenters = checked
                                    ? [...currentCenters, cc]
                                    : currentCenters.filter((c) => c !== cc);
                                  setTask({ ...task, cost_centers: newCenters, cost_center: newCenters[0] || null });
                                }}
                              />
                              <label htmlFor={`cc-custom-${cc}`} className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                                <Tag className="h-4 w-4" />
                                {cc}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowCustomCostCenter(true)} className="w-full">
                        <Plus className="h-3 w-3 mr-2" />
                        {t("tasks.addCustomCostCenter")}
                      </Button>
                      {showCustomCostCenter && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder={t("tasks.enterCustomCostCenter")}
                            value={customCostCenterValue}
                            onChange={(e) => setCustomCostCenterValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (customCostCenterValue.trim()) {
                                  const newCustomCenter = customCostCenterValue.trim();
                                  setCustomCostCenters([...customCostCenters, newCustomCenter]);
                                  const currentCenters = task.cost_centers || [];
                                  setTask({ ...task, cost_centers: [...currentCenters, newCustomCenter], cost_center: task.cost_center || newCustomCenter });
                                  setShowCustomCostCenter(false);
                                  setCustomCostCenterValue("");
                                }
                              }
                            }}
                          />
                          <Button type="button" onClick={() => {
                            if (customCostCenterValue.trim()) {
                              const newCustomCenter = customCostCenterValue.trim();
                              setCustomCostCenters([...customCostCenters, newCustomCenter]);
                              const currentCenters = task.cost_centers || [];
                              setTask({ ...task, cost_centers: [...currentCenters, newCustomCenter], cost_center: task.cost_center || newCustomCenter });
                              setShowCustomCostCenter(false);
                              setCustomCostCenterValue("");
                            }
                          }}>
                            Add
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => { setShowCustomCostCenter(false); setCustomCostCenterValue(""); }}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Checklists */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("tasks.checklists")} {(task.checklists || []).length > 0 && `(${(task.checklists || []).length})`}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3 space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newChecklist: Checklist = {
                            id: crypto.randomUUID(),
                            title: t("tasks.checklist"),
                            items: [],
                          };
                          setTask({ ...task, checklists: [...(task.checklists || []), newChecklist] });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("tasks.addChecklist")}
                      </Button>
                      {(task.checklists || []).map((checklist, clIdx) => {
                        const completedCount = checklist.items.filter((i) => i.completed).length;
                        const totalCount = checklist.items.length;
                        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
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
                                  onChange={(e) => updateChecklist(clIdx, { title: e.target.value })}
                                  className="h-7 text-sm font-medium border-none shadow-none px-1 focus-visible:ring-1"
                                />
                                {totalCount > 0 && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">{completedCount}/{totalCount}</span>
                                )}
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteChecklist(clIdx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {totalCount > 0 && (
                                <div className="px-3 pb-1"><Progress value={progressPct} className="h-1.5" /></div>
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
                                          updateChecklist(clIdx, { items: newItems });
                                        }}
                                      />
                                      <Input
                                        value={item.title}
                                        onChange={(e) => {
                                          const newItems = [...checklist.items];
                                          newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                          updateChecklist(clIdx, { items: newItems });
                                        }}
                                        className={`h-7 text-sm border-none shadow-none px-1 focus-visible:ring-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                                      />
                                      <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => {
                                        const newItems = checklist.items.filter((_, i) => i !== itemIdx);
                                        updateChecklist(clIdx, { items: newItems });
                                      }}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Input
                                    placeholder={t("tasks.addItem")}
                                    className="h-7 text-sm mt-1"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const val = (e.target as HTMLInputElement).value.trim();
                                        if (val) {
                                          const newItem: ChecklistItem = { id: crypto.randomUUID(), title: val, completed: false };
                                          updateChecklist(clIdx, { items: [...checklist.items, newItem] });
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
                  </CollapsibleContent>
                </Collapsible>

                {/* Photos */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("files.photos", "Photos")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3">
                      <EntityPhotoGallery entityId={task.id} entityType="task" />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Files */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("projectDetail.files", "Files")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3">
                      <TaskFilesList taskId={task.id} projectId={projectId} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Comments */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    {t("feed.comments", "Comments")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pb-3">
                      <CommentsSection taskId={task.id} projectId={projectId} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

              </div>
              )}

            </div>
            {/* Sticky save footer */}
            <div className="flex-shrink-0 border-t bg-background px-6 py-3">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t("tasks.updating")}
                  </>
                ) : (
                  t("tasks.updateTask")
                )}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground py-8 text-center">{t("budget.noData")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
