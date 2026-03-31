import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

interface DashboardStripProps {
  projectIds: string[];
  currency?: string;
}

interface StripData {
  overdueTasks: Array<{ projectId: string; projectName: string; count: number }>;
  unreadComments: Array<{ projectId: string; projectName: string; count: number }>;
  pendingPurchases: Array<{ projectId: string; projectName: string; count: number }>;
  totalBudget: number;
  totalSpent: number;
}

export function DashboardStrip({ projectIds, currency = "SEK" }: DashboardStripProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-strip", projectIds],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Fetch in parallel
      const [overdueRes, commentsRes, purchasesRes, budgetRes] = await Promise.all([
        // Overdue tasks (deadline passed, not completed)
        supabase
          .from("tasks")
          .select("id, project_id, projects!inner(name)")
          .in("project_id", projectIds)
          .lt("due_date", today)
          .not("status", "eq", "done")
          .is("deleted_at", null),

        // Recent comments (last 7 days)
        supabase
          .from("comments")
          .select("id, project_id, projects!inner(name)")
          .in("project_id", projectIds)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),

        // Pending purchases (to_order status)
        supabase
          .from("materials")
          .select("id, project_id, projects!inner(name)")
          .in("project_id", projectIds)
          .eq("status", "to_order"),

        // Budget aggregation
        supabase
          .from("projects")
          .select("total_budget, spent_amount")
          .in("id", projectIds),
      ]);

      // Group overdue by project
      const overdueByProject = new Map<string, { name: string; count: number }>();
      for (const task of overdueRes.data || []) {
        const proj = overdueByProject.get(task.project_id) || {
          name: (task.projects as unknown as { name: string })?.name || "",
          count: 0,
        };
        proj.count++;
        overdueByProject.set(task.project_id, proj);
      }

      // Group comments by project
      const commentsByProject = new Map<string, { name: string; count: number }>();
      for (const comment of commentsRes.data || []) {
        const proj = commentsByProject.get(comment.project_id) || {
          name: (comment.projects as unknown as { name: string })?.name || "",
          count: 0,
        };
        proj.count++;
        commentsByProject.set(comment.project_id, proj);
      }

      // Group purchases by project
      const purchasesByProject = new Map<string, { name: string; count: number }>();
      for (const mat of purchasesRes.data || []) {
        const proj = purchasesByProject.get(mat.project_id) || {
          name: (mat.projects as unknown as { name: string })?.name || "",
          count: 0,
        };
        proj.count++;
        purchasesByProject.set(mat.project_id, proj);
      }

      // Budget totals
      let totalBudget = 0;
      let totalSpent = 0;
      for (const p of budgetRes.data || []) {
        totalBudget += p.total_budget || 0;
        totalSpent += p.spent_amount || 0;
      }

      return {
        overdueTasks: Array.from(overdueByProject.entries()).map(([projectId, v]) => ({
          projectId,
          projectName: v.name,
          count: v.count,
        })),
        unreadComments: Array.from(commentsByProject.entries()).map(([projectId, v]) => ({
          projectId,
          projectName: v.name,
          count: v.count,
        })),
        pendingPurchases: Array.from(purchasesByProject.entries()).map(([projectId, v]) => ({
          projectId,
          projectName: v.name,
          count: v.count,
        })),
        totalBudget,
        totalSpent,
      } satisfies StripData;
    },
    enabled: projectIds.length >= 2,
    staleTime: 60 * 1000,
  });

  const totalOverdue = useMemo(
    () => data?.overdueTasks.reduce((s, p) => s + p.count, 0) ?? 0,
    [data]
  );
  const totalComments = useMemo(
    () => data?.unreadComments.reduce((s, p) => s + p.count, 0) ?? 0,
    [data]
  );
  const totalPurchases = useMemo(
    () => data?.pendingPurchases.reduce((s, p) => s + p.count, 0) ?? 0,
    [data]
  );

  if (projectIds.length < 2 || isLoading || !data) return null;

  // Don't show if there's nothing interesting to show
  const hasContent = totalOverdue > 0 || totalComments > 0 || totalPurchases > 0 || (data.totalBudget > 0);
  if (!hasContent) return null;

  const budgetPct = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Overdue tasks */}
      <button
        type="button"
        onClick={() => {
          const first = data.overdueTasks[0];
          if (first) navigate(`/projects/${first.projectId}?tab=tasks`);
        }}
        className="rounded-xl border bg-card p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={`h-4 w-4 ${totalOverdue > 0 ? "text-red-500" : "text-green-500"}`} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("dashboard.overdue", "Overdue")}
          </span>
        </div>
        {totalOverdue > 0 ? (
          <>
            <p className="text-2xl font-bold tabular-nums text-red-600">{totalOverdue}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {data.overdueTasks.map((p) => `${p.projectName} (${p.count})`).join(", ")}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-green-600">0</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.allOnTrack", "All on track")}</p>
          </>
        )}
      </button>

      {/* Recent comments */}
      <button
        type="button"
        onClick={() => {
          const first = data.unreadComments[0];
          if (first) navigate(`/projects/${first.projectId}?tab=overview`);
        }}
        className="rounded-xl border bg-card p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className={`h-4 w-4 ${totalComments > 0 ? "text-blue-500" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("dashboard.comments", "Comments")}
          </span>
        </div>
        {totalComments > 0 ? (
          <>
            <p className="text-2xl font-bold tabular-nums">{totalComments}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {t("dashboard.lastWeek", "Last 7 days")}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-muted-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.noRecent", "No recent activity")}</p>
          </>
        )}
      </button>

      {/* Pending purchases */}
      <button
        type="button"
        onClick={() => {
          const first = data.pendingPurchases[0];
          if (first) navigate(`/projects/${first.projectId}?tab=purchases`);
        }}
        className="rounded-xl border bg-card p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className={`h-4 w-4 ${totalPurchases > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("dashboard.purchases", "To order")}
          </span>
        </div>
        {totalPurchases > 0 ? (
          <>
            <p className="text-2xl font-bold tabular-nums text-amber-600">{totalPurchases}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {data.pendingPurchases.map((p) => `${p.projectName} (${p.count})`).join(", ")}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-muted-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.noPending", "Nothing pending")}</p>
          </>
        )}
      </button>

      {/* Budget overview */}
      {data.totalBudget > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`h-4 w-4 ${budgetPct > 90 ? "text-red-500" : budgetPct > 70 ? "text-amber-500" : "text-green-500"}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.budget", "Budget")}
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(data.totalSpent, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            / {formatCurrency(data.totalBudget, currency)}
          </p>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
