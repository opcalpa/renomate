import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, ClipboardList, ArrowRight, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface PlanningTask {
  id: string;
  title: string;
  budget: number | null;
  room_id: string | null;
  room_name: string | null;
  status: string;
}

interface Room {
  id: string;
  name: string;
}

interface PlanningTaskListProps {
  projectId: string;
  currency?: string | null;
  onNavigateToTasks?: (taskId?: string) => void;
  onCreateQuote?: () => void;
}

export function PlanningTaskList({
  projectId,
  currency,
  onNavigateToTasks,
  onCreateQuote,
}: PlanningTaskListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const [tasksRes, roomsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, budget, room_id, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("rooms")
        .select("id, name")
        .eq("project_id", projectId),
    ]);

    const roomMap = new Map(
      (roomsRes.data || []).map((r) => [r.id, r.name])
    );
    setRooms(roomsRes.data || []);

    setTasks(
      (tasksRes.data || []).map((task) => ({
        ...task,
        room_name: task.room_id ? roomMap.get(task.room_id) || null : null,
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setAddingLoading(true);
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title,
        status: "planned",
        priority: "medium",
        created_by_user_id: profile.user.id,
      });

      if (error) throw error;

      setNewTitle("");
      setIsAdding(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setAddingLoading(false);
    }
  };

  const totalBudget = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const pricedCount = tasks.filter((t) => t.budget && t.budget > 0).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {t("planningTasks.title", "Scope of work")}
            </CardTitle>
            <CardDescription>
              {t("planningTasks.description", "Define tasks to include in your quote")}
            </CardDescription>
          </div>
          {tasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {pricedCount}/{tasks.length} {t("planningTasks.priced", "priced")}
              </span>
              <span className="text-sm font-medium">
                {formatCurrency(totalBudget, currency)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium mb-1">
              {t("planningTasks.empty", "No tasks yet")}
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              {t("planningTasks.emptyHint", "Add the work items that will make up your quote")}
            </p>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("planningTasks.addFirst", "Add first task")}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[45%]">
                      {t("planningTasks.taskName", "Task")}
                    </TableHead>
                    <TableHead className="w-[25%] hidden sm:table-cell">
                      {t("planningTasks.room", "Room")}
                    </TableHead>
                    <TableHead className="w-[22%] text-right">
                      {t("planningTasks.budget", "Budget")}
                    </TableHead>
                    <TableHead className="w-[8%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => onNavigateToTasks?.(task.id)}
                    >
                      <TableCell className="font-medium py-2.5">
                        <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell py-2.5">
                        {task.room_name || "–"}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {task.budget ? (
                          <span className="text-sm font-medium">
                            {formatCurrency(task.budget, currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("planningTasks.noBudget", "–")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTasks?.(task.id);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Inline add row */}
                  {isAdding && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="py-2">
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleQuickAdd();
                          }}
                        >
                          <Input
                            autoFocus
                            placeholder={t("planningTasks.taskPlaceholder", "e.g. Demolish bathroom")}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="h-8 text-sm"
                            disabled={addingLoading}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-8 px-3"
                            disabled={!newTitle.trim() || addingLoading}
                          >
                            {t("common.add", "Add")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => {
                              setIsAdding(false);
                              setNewTitle("");
                            }}
                          >
                            {t("common.cancel", "Cancel")}
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("planningTasks.addTask", "Add task")}
              </Button>

              {tasks.length > 0 && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => onCreateQuote?.()}
                >
                  {t("projectStatus.cta.generateQuote", "Generate quote")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
