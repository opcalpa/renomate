import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Package, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BudgetDashboard from "./BudgetDashboard";
import ProjectTimeline from "./ProjectTimeline";
import ProjectFeedTab from "./ProjectFeedTab";
import type { FeedComment } from "./feed/types";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
interface Project {
  id: string;
  name: string;
  status: string;
  total_budget: number | null;
  spent_amount: number | null;
  start_date: string | null;
  finish_goal_date: string | null;
}
interface OverviewTabProps {
  project: Project;
  onProjectUpdate?: () => void;
  projectFinishDate: string | null;
  onNavigateToEntity?: (comment: FeedComment) => void;
}
const OverviewTab = ({
  project,
  onProjectUpdate,
  projectFinishDate,
  onNavigateToEntity
}: OverviewTabProps) => {
  const { t } = useTranslation();
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [editingGoalDate, setEditingGoalDate] = useState(false);
  const [goalDate, setGoalDate] = useState(project.finish_goal_date || "");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(project.total_budget?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    percentage: 0
  });
  const [calculatedSpent, setCalculatedSpent] = useState(0);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchTaskStats();
    fetchCalculatedSpent();
  }, [project.id]);
  const fetchTaskStats = async () => {
    try {
      const {
        data: tasks,
        error
      } = await supabase.from("tasks").select("status").eq("project_id", project.id);
      if (error) throw error;
      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.status === "completed").length || 0;
      const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
      setTaskStats({
        total,
        completed,
        percentage
      });
    } catch (error: unknown) {
      console.error("Error fetching task stats:", error);
    }
  };
  const fetchCalculatedSpent = async () => {
    try {
      // Get all task budgets
      const {
        data: tasks
      } = await supabase.from("tasks").select("budget").eq("project_id", project.id);
      const taskBudgetTotal = tasks?.reduce((sum, task) => sum + (task.budget || 0), 0) || 0;

      // Get all material costs (using price_total which is auto-calculated)
      // Exclude materials marked as "exclude_from_budget" (ongoing operational costs)
      const {
        data: materials
      } = await supabase.from("materials").select("price_total, exclude_from_budget").eq("project_id", project.id);
      const materialCostTotal = materials?.reduce((sum, mat) => {
        // Only include materials that are part of the project budget
        if (mat.exclude_from_budget) return sum;
        return sum + (mat.price_total || 0);
      }, 0) || 0;
      setCalculatedSpent(taskBudgetTotal + materialCostTotal);
    } catch (error: unknown) {
      console.error("Error calculating spent amount:", error);
    }
  };
  const handleSaveStartDate = async () => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("projects").update({
        start_date: startDate || null
      }).eq("id", project.id);
      if (error) throw error;
      toast({
        title: t('overview.startDateUpdated'),
        description: t('overview.startDateUpdatedDescription')
      });
      setEditingStartDate(false);
      onProjectUpdate?.();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleSaveGoalDate = async () => {
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("projects").update({
        finish_goal_date: goalDate || null
      }).eq("id", project.id);
      if (error) throw error;
      toast({
        title: t('overview.goalDateUpdated'),
        description: t('overview.goalDateUpdatedDescription')
      });
      setEditingGoalDate(false);
      onProjectUpdate?.();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleSaveBudget = async () => {
    setSaving(true);
    try {
      const budgetNumber = budgetValue ? parseFloat(budgetValue) : null;
      const {
        error
      } = await supabase.from("projects").update({
        total_budget: budgetNumber
      }).eq("id", project.id);
      if (error) throw error;
      toast({
        title: t('overview.budgetUpdated'),
        description: t('overview.budgetUpdatedDescription')
      });
      setEditingBudget(false);
      onProjectUpdate?.();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const totalBudget = project.total_budget || 0;
  const remainingBudget = totalBudget - calculatedSpent;
  return <div className="space-y-6">
      {/* Project Timeline */}
      <div className="mb-8">
        <ProjectTimeline projectId={project.id} projectName={project.name} projectStartDate={project.start_date} projectFinishDate={projectFinishDate} />
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('overview.projectOverview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status and Completion */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t('overview.statusProgress')}</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('overview.currentStatus')}</p>
                  <Badge variant={project.status === "completed" ? "default" : "secondary"} className="text-sm">
                    <span className="capitalize">{t(`projectStatuses.${project.status}`, project.status.replace("_", " "))}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('overview.taskCompletion')}</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xl font-bold">{taskStats.percentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('overview.tasksCompleted', { completed: taskStats.completed, total: taskStats.total })}</p>
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t('overview.projectStart')}</h4>
              {editingStartDate ? <div className="space-y-3">
                  <DatePicker
                    date={startDate ? new Date(startDate) : undefined}
                    onDateChange={(date) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj startdatum"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveStartDate} disabled={saving}>
                      {saving ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                  setEditingStartDate(false);
                  setStartDate(project.start_date || "");
                }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div> : <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('common.startDate')}</p>
                  {project.start_date ? <div className="flex items-center justify-between">
                      <p className="text-base font-medium">
                        {format(new Date(project.start_date), "MMM d, yyyy")}
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => setEditingStartDate(true)}>
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div> : <Button size="sm" variant="outline" onClick={() => setEditingStartDate(true)}>
                      {t('overview.setStartDate')}
                    </Button>}
                </div>}
            </div>

            {/* Goal Date */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t('overview.targetCompletion')}</h4>
              {editingGoalDate ? <div className="space-y-3">
                  <DatePicker
                    date={goalDate ? new Date(goalDate) : undefined}
                    onDateChange={(date) => setGoalDate(date ? date.toISOString().split('T')[0] : '')}
                    placeholder="Välj måldatum"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveGoalDate} disabled={saving}>
                      {saving ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                  setEditingGoalDate(false);
                  setGoalDate(project.finish_goal_date || "");
                }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div> : <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('overview.targetCompletion')}</p>
                  {project.finish_goal_date ? <div className="flex items-center justify-between">
                      <p className="text-base font-medium">
                        {format(new Date(project.finish_goal_date), "MMM d, yyyy")}
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => setEditingGoalDate(true)}>
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div> : <Button size="sm" variant="outline" onClick={() => setEditingGoalDate(true)}>
                      {t('overview.setGoalDate')}
                    </Button>}
                </div>}
            </div>

            {/* Project Budget */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t('overview.projectBudget')}</h4>
              {editingBudget ? <div className="space-y-3">
                  <Input id="budget" type="number" step="0.01" placeholder={t('overview.enterTotalBudget')} value={budgetValue} onChange={e => setBudgetValue(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveBudget} disabled={saving}>
                      {saving ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                  setEditingBudget(false);
                  setBudgetValue(project.total_budget?.toString() || "");
                }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div> : <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('overview.totalBudget')}</p>
                  {project.total_budget ? <div className="flex items-center justify-between">
                      <p className="text-base font-medium">
                        ${project.total_budget.toLocaleString()}
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBudget(true)}>
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    </div> : <Button size="sm" variant="outline" onClick={() => setEditingBudget(true)}>
                      {t('overview.setBudget')}
                    </Button>}
                </div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Dashboard */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('overview.budgetOverview')}</h3>
        <BudgetDashboard projectId={project.id} totalBudget={project.total_budget} spentAmount={calculatedSpent} />
      </div>

      {/* Project Feed - hidden on mobile, accessible via bottom nav */}
      <div className="hidden md:block">
        <ProjectFeedTab projectId={project.id} onNavigateToEntity={onNavigateToEntity} />
      </div>
    </div>;
};
export default OverviewTab;