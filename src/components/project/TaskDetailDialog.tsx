import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Calendar, User, AlertCircle, Package, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskFilesList } from "./TaskFilesList";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  currency?: string | null;
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
  assigned_to_stakeholder_id: string | null;
  project_id: string;
  budget: number | null;
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

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: 'toDo', in_progress: 'inProgress', on_hold: 'onHold',
    new_construction: 'newConstruction', to_be_renovated: 'toBeRenovated',
    not_paid: 'notPaid', partially_paid: 'partiallyPaid',
  };
  return map[s] || s;
};

const TaskDetailDialog = ({ taskId, open, onOpenChange, onEdit, currency }: TaskDetailDialogProps) => {
  const { t } = useTranslation();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId && open) {
      fetchTaskDetails();
    }
  }, [taskId, open]);

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      // Fetch task with assigned user
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles!tasks_assigned_to_stakeholder_id_fkey(name)
        `)
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      // Handle profiles being an array and convert to single object
      const formattedTask = {
        ...taskData,
        profiles: Array.isArray(taskData.profiles) && taskData.profiles.length > 0
          ? taskData.profiles[0]
          : null
      };

      setTask(formattedTask);

      // Fetch materials
      const { data: materialsData } = await supabase
        .from("materials")
        .select("id, name, quantity, unit, price_per_unit, price_total, status")
        .eq("task_id", taskId);

      setMaterials(materialsData || []);

      // Fetch dependencies
      const { data: depsData } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(title)
        `)
        .eq("task_id", taskId);

      setDependencies(depsData || []);
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in_progress":
        return "bg-warning text-warning-foreground";
      case "waiting":
        return "bg-warning/80 text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
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

  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-2xl max-h-screen md:max-h-[85vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl pr-8">{task.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onOpenChange(false);
                onEdit?.();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="sr-only">
            {t('taskDetail.taskDetails', 'Task details')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status and Priority */}
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(task.status)}>
                {t(`statuses.${statusKey(task.status)}`)}
              </Badge>
              <Badge variant={getPriorityColor(task.priority)}>
                {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="font-medium mb-2">{t('common.description')}</h3>
                <p className="text-muted-foreground">{task.description}</p>
              </div>
            )}

            {/* Progress */}
            {task.progress > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{t('common.progress')}</h3>
                  <span className="text-sm font-medium">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-3" />
              </div>
            )}

            {/* Timeline */}
            {(task.start_date || task.finish_date) && (
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">{t('taskDetail.timeline')}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {task.start_date && (
                      <div>{t('taskDetail.start')}: {format(parseISO(task.start_date), "MMM d, yyyy")}</div>
                    )}
                    {task.finish_date && (
                      <div>{t('taskDetail.finish')}: {format(parseISO(task.finish_date), "MMM d, yyyy")}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Budget */}
            {task.budget !== null && task.budget > 0 && (
              <div className="flex items-start gap-2">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">{t('taskDetail.taskBudget')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(task.budget, currency)}
                  </p>
                </div>
              </div>
            )}

            {/* Assigned To */}
            {task.profiles?.name && (
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">{t('common.assignedTo')}</h3>
                  <p className="text-sm text-muted-foreground">{task.profiles.name}</p>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">{t('taskPanel.dependencies')}</h3>
                  <div className="space-y-1">
                    {dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded"
                      >
                        {t('taskPanel.dependsOn')}: {dep.depends_on_task.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Materials */}
            {materials.length > 0 && (
              <div className="flex items-start gap-2">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">{t('taskDetail.materials')}</h3>
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between bg-muted px-3 py-2 rounded"
                      >
                        <div>
                          <div className="font-medium text-sm">{material.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {material.quantity} {material.unit}
                            {material.price_per_unit && ` • ${formatCurrency(material.price_per_unit, currency, { decimals: 2 })}/unit`}
                            {material.price_total && ` • Total: ${formatCurrency(material.price_total, currency, { decimals: 2 })}`}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {material.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Linked Files */}
            <Separator />
            <TaskFilesList taskId={task.id} projectId={task.project_id} readonly />

            {/* Created Date */}
            <div className="text-xs text-muted-foreground pt-4 border-t">
              Created {format(parseISO(task.created_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
