import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import TaskDetailDialog from "@/components/project/TaskDetailDialog";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_stakeholder_id: string | null;
}

const statusKey = (s: string) => {
  const map: Record<string, string> = {
    to_do: 'toDo',
    in_progress: 'inProgress',
    on_hold: 'onHold',
  };
  return map[s] || s;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "on_hold":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "scrapped":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

interface RelatedTasksSectionProps {
  roomId: string;
  projectId: string;
}

export function RelatedTasksSection({ roomId, projectId }: RelatedTasksSectionProps) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Task detail dialog state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Task form state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState("to_do");
  const [taskPriority, setTaskPriority] = useState("medium");

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, status, priority, assigned_to_stakeholder_id")
      .eq("room_id", roomId);

    if (error) {
      console.error("Failed to load tasks:", error);
    } else {
      setTasks((data as Task[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [roomId]);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error(t('rooms.taskTitleRequired', 'Task title is required'));
      return;
    }

    setCreatingTask(true);
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

      const taskData = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        room_id: roomId,
        project_id: projectId,
        created_by_user_id: profile.id,
      };

      const { error } = await supabase
        .from("tasks")
        .insert(taskData);

      if (error) throw error;

      toast.success(t('rooms.taskCreatedForRoom', 'Task created and linked to room'));

      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setTaskStatus("to_do");
      setTaskPriority("medium");
      setTaskDialogOpen(false);

      // Refresh tasks list
      await fetchTasks();
    } catch (error: unknown) {
      console.error("Error creating task:", error);
      toast.error(error instanceof Error ? error.message : t('rooms.failedToCreateTask', 'Failed to create task'));
    } finally {
      setCreatingTask(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{t('rooms.loadingTasks')}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header with Create button */}
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTaskDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t('common.create')}
          </Button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {t('rooms.noTasksForRoom')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 transition-colors"
                onClick={() => handleTaskClick(task.id)}
              >
                <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(task.status)}`}>
                  {t(`statuses.${statusKey(task.status)}`)}
                </Badge>
                <span className="truncate font-medium">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={() => {
          // Could navigate to full task edit page if needed
        }}
      />

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('rooms.createTaskForRoom', 'Create Task')}</DialogTitle>
            <DialogDescription>
              {t('rooms.taskWillBeLinkedToRoom', 'The task will be linked to this room')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">{t('tasks.taskTitle', 'Task Title')} *</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={t('rooms.taskTitlePlaceholder', 'e.g. Install flooring, Paint walls')}
              />
            </div>
            <div>
              <Label htmlFor="task-description">{t('common.description')} ({t('common.optional')})</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder={t('rooms.taskDescriptionPlaceholder', 'Add details about the task...')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-status">{t('common.status')}</Label>
                <Select value={taskStatus} onValueChange={setTaskStatus}>
                  <SelectTrigger id="task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ideas">{t('statuses.ideas')}</SelectItem>
                    <SelectItem value="to_do">{t('statuses.toDo')}</SelectItem>
                    <SelectItem value="in_progress">{t('statuses.inProgress')}</SelectItem>
                    <SelectItem value="on_hold">{t('statuses.onHold')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-priority">{t('common.priority')}</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tasks.priorityLow', 'Low')}</SelectItem>
                    <SelectItem value="medium">{t('tasks.priorityMedium', 'Medium')}</SelectItem>
                    <SelectItem value="high">{t('tasks.priorityHigh', 'High')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateTask}
                disabled={creatingTask || !taskTitle.trim()}
                className="flex-1"
              >
                {creatingTask ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('rooms.creatingTask', 'Creating...')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('rooms.createTask', 'Create Task')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTaskDialogOpen(false)}
                disabled={creatingTask}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
