import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Plus, Tag, ChevronDown, Trash2, X } from "lucide-react";
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
  project_id: string;
}

interface TaskEditDialogProps {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  currency?: string | null;
}

export const TaskEditDialog = ({
  taskId,
  projectId,
  open,
  onOpenChange,
  onSaved,
}: TaskEditDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [customCostCenters, setCustomCostCenters] = useState<string[]>([]);
  const [showCustomCostCenter, setShowCustomCostCenter] = useState(false);
  const [customCostCenterValue, setCustomCostCenterValue] = useState("");

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
        .select("profile_id")
        .eq("project_id", projectId);

      const profileIds = (sharesData || [])
        .map((s) => s.profile_id)
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

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      fetchSupportingData();
    }
  }, [open, taskId, fetchTask, fetchSupportingData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
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
        })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("tasks.taskUpdatedDescription"),
      });

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
      <DialogContent className="max-w-2xl max-h-[90vh] h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{t("tasks.editTask")}</DialogTitle>
          <DialogDescription>{t("tasks.editTaskDescription")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : task ? (
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 px-6">
            <div className="space-y-4 overflow-y-auto flex-1 py-4">
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
                  rows={3}
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="edit-task-progress">
                  {t("tasks.progress")}: {task.progress}%
                </Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-start-date">{t("tasks.startDate")}</Label>
                  <DatePicker
                    date={task.start_date ? new Date(task.start_date) : undefined}
                    onDateChange={(date) =>
                      setTask({ ...task, start_date: date ? date.toISOString().split("T")[0] : null })
                    }
                    placeholder="Välj startdatum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-task-finish-date">{t("tasks.finishDate")}</Label>
                  <DatePicker
                    date={task.finish_date ? new Date(task.finish_date) : undefined}
                    onDateChange={(date) =>
                      setTask({ ...task, finish_date: date ? date.toISOString().split("T")[0] : null })
                    }
                    placeholder="Välj slutdatum"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-room">{t("tasks.room")}</Label>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-budget">{t("tasks.budget")}</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="edit-task-ordered">{t("tasks.ordered")}</Label>
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
                  <Label htmlFor="edit-task-paid">{t("tasks.paid")}</Label>
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

              {task.budget && (
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

              <div className="space-y-2">
                <Label>{t("tasks.costCentersMultiple")}</Label>
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
                            setTask({
                              ...task,
                              cost_centers: newCenters,
                              cost_center: newCenters[0] || null,
                            });
                          }}
                        />
                        <label
                          htmlFor={`cc-${cc.id}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
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
                            setTask({
                              ...task,
                              cost_centers: newCenters,
                              cost_center: newCenters[0] || null,
                            });
                          }}
                        />
                        <label
                          htmlFor={`cc-custom-${cc}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                        >
                          <Tag className="h-4 w-4" />
                          {cc}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomCostCenter(true)}
                  className="w-full"
                >
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
                            setTask({
                              ...task,
                              cost_centers: [...currentCenters, newCustomCenter],
                              cost_center: task.cost_center || newCustomCenter,
                            });
                            setShowCustomCostCenter(false);
                            setCustomCostCenterValue("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (customCostCenterValue.trim()) {
                          const newCustomCenter = customCostCenterValue.trim();
                          setCustomCostCenters([...customCostCenters, newCustomCenter]);
                          const currentCenters = task.cost_centers || [];
                          setTask({
                            ...task,
                            cost_centers: [...currentCenters, newCustomCenter],
                            cost_center: task.cost_center || newCustomCenter,
                          });
                          setShowCustomCostCenter(false);
                          setCustomCostCenterValue("");
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowCustomCostCenter(false);
                        setCustomCostCenterValue("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Checklists */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("tasks.checklists")}</Label>
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
                      setTask({
                        ...task,
                        checklists: [...(task.checklists || []), newChecklist],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("tasks.addChecklist")}
                  </Button>
                </div>
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
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completedCount}/{totalCount}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteChecklist(clIdx)}
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
                                  className={`h-7 text-sm border-none shadow-none px-1 focus-visible:ring-1 ${
                                    item.completed ? "line-through text-muted-foreground" : ""
                                  }`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const newItems = checklist.items.filter((_, i) => i !== itemIdx);
                                    updateChecklist(clIdx, { items: newItems });
                                  }}
                                >
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
                                    const newItem: ChecklistItem = {
                                      id: crypto.randomUUID(),
                                      title: val,
                                      completed: false,
                                    };
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

              {/* Photos */}
              <Separator className="my-4" />
              <EntityPhotoGallery entityId={task.id} entityType="task" />

              {/* Linked Files */}
              <Separator className="my-4" />
              <TaskFilesList taskId={task.id} projectId={projectId} />

              {/* Comments */}
              <Separator className="my-4" />
              <CommentsSection taskId={task.id} projectId={projectId} />

              {/* Save Button */}
              <div className="pt-6 pb-4">
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
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground py-8 text-center">{t("budget.noData")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
