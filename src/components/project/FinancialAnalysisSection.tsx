import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { subMonths, isAfter, isBefore, parseISO, format, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface FinancialAnalysisSectionProps {
  projects: { id: string; name: string; created_at: string; status?: string }[];
  financials: Record<string, { budget: number; profit: number }>;
  currency?: string | null;
}

type PeriodPreset = 1 | 3 | 6 | 12 | "all" | "custom";
type StatusFilter = "all" | "active" | "quoting" | "completed";

const PRESETS: PeriodPreset[] = [1, 3, 6, 12, "all", "custom"];

const STATUS_FILTER_GROUPS: Record<StatusFilter, string[]> = {
  all: [],
  active: ["active", "on_hold"],
  quoting: ["quote_created", "quote_sent", "quote_rejected"],
  completed: ["completed"],
};

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

// ---------------------------------------------------------------------------
// Per-project detail data
// ---------------------------------------------------------------------------

interface ProjectTask {
  budget: number;
  cost_center: string | null;
  room_id: string | null;
  room_name: string | null;
  estimated_hours: number | null;
  hourly_rate: number | null;
  labor_cost_percent: number | null;
  subcontractor_cost: number | null;
  markup_percent: number | null;
  material_estimate: number | null;
  material_markup_percent: number | null;
  created_at: string;
}

const COST_CENTER_LABELS: Record<string, string> = {
  construction: "financialAnalysis.ccConstruction",
  electrical: "financialAnalysis.ccElectrical",
  plumbing: "financialAnalysis.ccPlumbing",
  painting: "financialAnalysis.ccPainting",
  flooring: "financialAnalysis.ccFlooring",
  tiling: "financialAnalysis.ccTiling",
  demolition: "financialAnalysis.ccDemolition",
  carpentry: "financialAnalysis.ccCarpentry",
  kitchen: "financialAnalysis.ccKitchen",
  bathroom: "financialAnalysis.ccBathroom",
};

export function FinancialAnalysisSection({
  projects,
  financials,
  currency,
}: FinancialAnalysisSectionProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const isSingleProject = selectedProjectId !== "all";

  // Fetch task details when a single project is selected
  const fetchProjectTasks = useCallback(async (projectId: string) => {
    setLoadingTasks(true);
    try {
      const { data } = await supabase
        .from("tasks")
        .select(`
          budget,
          cost_center,
          room_id,
          estimated_hours,
          hourly_rate,
          labor_cost_percent,
          subcontractor_cost,
          markup_percent,
          material_estimate,
          material_markup_percent,
          created_at,
          rooms!left(name)
        `)
        .eq("project_id", projectId);

      if (data) {
        setProjectTasks(
          data.map((task) => ({
            budget: task.budget || 0,
            cost_center: task.cost_center,
            room_id: task.room_id,
            room_name: (task.rooms as { name: string } | null)?.name ?? null,
            estimated_hours: task.estimated_hours,
            hourly_rate: task.hourly_rate,
            labor_cost_percent: task.labor_cost_percent,
            subcontractor_cost: task.subcontractor_cost,
            markup_percent: task.markup_percent,
            material_estimate: task.material_estimate,
            material_markup_percent: task.material_markup_percent,
            created_at: task.created_at,
          }))
        );
      }
    } catch {
      setProjectTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (isSingleProject) {
      fetchProjectTasks(selectedProjectId);
    } else {
      setProjectTasks([]);
    }
  }, [selectedProjectId, isSingleProject, fetchProjectTasks]);

  const presetLabel = (p: PeriodPreset): string => {
    if (p === "all") return t("financialAnalysis.periodAll");
    if (p === "custom") return t("financialAnalysis.periodCustom");
    const keys: Record<number, string> = {
      1: "financialAnalysis.period1",
      3: "financialAnalysis.period3",
      6: "financialAnalysis.period6",
      12: "financialAnalysis.period12",
    };
    return t(keys[p as number]);
  };

  const dateRange = useMemo(() => {
    if (period === "all") return { from: null, to: null };
    if (period === "custom") {
      return {
        from: customFrom ? startOfDay(parseISO(customFrom)) : null,
        to: customTo ? endOfDay(parseISO(customTo)) : null,
      };
    }
    return { from: subMonths(new Date(), period as number), to: null };
  }, [period, customFrom, customTo]);

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (!(financials[p.id]?.budget > 0)) return false;
        if (isSingleProject && p.id !== selectedProjectId) return false;
        const created = parseISO(p.created_at);
        if (dateRange.from && !isAfter(created, dateRange.from)) return false;
        if (dateRange.to && !isBefore(created, dateRange.to)) return false;
        const allowed = STATUS_FILTER_GROUPS[statusFilter];
        if (allowed.length > 0 && p.status && !allowed.includes(p.status)) return false;
        return true;
      }),
    [projects, financials, dateRange, statusFilter, isSingleProject, selectedProjectId]
  );

  const dateRangeLabel = useMemo(() => {
    if (period === "all") return t("financialAnalysis.allTime");
    if (period === "custom") {
      const f = customFrom ? format(parseISO(customFrom), "yyyy-MM-dd") : "...";
      const to = customTo ? format(parseISO(customTo), "yyyy-MM-dd") : t("financialAnalysis.now");
      return `${f} — ${to}`;
    }
    const from = subMonths(new Date(), period as number);
    return `${format(from, "yyyy-MM-dd")} — ${t("financialAnalysis.now")}`;
  }, [period, customFrom, customTo, t]);

  // ---- Portfolio-level chart data ----

  const projectChartData = useMemo(
    () =>
      filtered
        .map((p) => ({
          name: p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name,
          fullName: p.name,
          budget: financials[p.id]?.budget ?? 0,
          profit: financials[p.id]?.profit ?? 0,
        }))
        .sort((a, b) => b.budget - a.budget)
        .slice(0, 8),
    [filtered, financials]
  );

  const monthlyData = useMemo(() => {
    const source = isSingleProject ? projectTasks : filtered;
    const buckets = new Map<string, { budget: number; profit: number }>();

    for (const item of source) {
      const createdAt = "created_at" in item ? item.created_at : (item as typeof filtered[0]).created_at;
      const monthKey = format(startOfMonth(parseISO(createdAt)), "yyyy-MM");
      const prev = buckets.get(monthKey) || { budget: 0, profit: 0 };

      if (isSingleProject) {
        const task = item as ProjectTask;
        const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
        const costPct = task.labor_cost_percent ?? 50;
        const laborProfit = laborTotal * (1 - costPct / 100);
        const ueProfit = (task.subcontractor_cost || 0) * (task.markup_percent || 0) / 100;
        const matProfit = (task.material_estimate || 0) * (task.material_markup_percent || 0) / 100;
        buckets.set(monthKey, {
          budget: prev.budget + (task.budget || 0),
          profit: prev.profit + laborProfit + ueProfit + matProfit,
        });
      } else {
        const project = item as typeof filtered[0];
        buckets.set(monthKey, {
          budget: prev.budget + (financials[project.id]?.budget ?? 0),
          profit: prev.profit + (financials[project.id]?.profit ?? 0),
        });
      }
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: format(parseISO(key + "-01"), "MMM yy"),
        budget: Math.round(val.budget),
        profit: Math.round(val.profit),
      }));
  }, [filtered, financials, isSingleProject, projectTasks]);

  // Totals
  const totals = useMemo(() => {
    let budget = 0;
    let profit = 0;
    for (const p of filtered) {
      budget += financials[p.id]?.budget ?? 0;
      profit += financials[p.id]?.profit ?? 0;
    }
    const margin = budget > 0 ? Math.round((profit / budget) * 100) : 0;
    return { budget, profit, margin, count: filtered.length };
  }, [filtered, financials]);

  // ---- Single-project chart data ----

  const costCenterData = useMemo(() => {
    if (!isSingleProject) return [];
    const buckets = new Map<string, number>();
    for (const task of projectTasks) {
      const cc = task.cost_center || "other";
      buckets.set(cc, (buckets.get(cc) || 0) + (task.budget || 0));
    }
    return Array.from(buckets.entries())
      .map(([key, value]) => ({
        name: t(COST_CENTER_LABELS[key] || `financialAnalysis.ccOther`, key),
        value: Math.round(value),
        key,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [isSingleProject, projectTasks, t]);

  const roomData = useMemo(() => {
    if (!isSingleProject) return [];
    const buckets = new Map<string, { budget: number; profit: number; name: string }>();
    for (const task of projectTasks) {
      const roomKey = task.room_id || "_unassigned";
      const roomName = task.room_name || t("financialAnalysis.unassigned", "Ej tilldelat");
      const prev = buckets.get(roomKey) || { budget: 0, profit: 0, name: roomName };
      const laborTotal = (task.estimated_hours || 0) * (task.hourly_rate || 0);
      const costPct = task.labor_cost_percent ?? 50;
      const laborProfit = laborTotal * (1 - costPct / 100);
      const ueProfit = (task.subcontractor_cost || 0) * (task.markup_percent || 0) / 100;
      const matProfit = (task.material_estimate || 0) * (task.material_markup_percent || 0) / 100;
      buckets.set(roomKey, {
        budget: prev.budget + (task.budget || 0),
        profit: prev.profit + laborProfit + ueProfit + matProfit,
        name: roomName,
      });
    }
    return Array.from(buckets.values())
      .map((v) => ({
        name: v.name.length > 20 ? v.name.slice(0, 20) + "..." : v.name,
        fullName: v.name,
        budget: Math.round(v.budget),
        profit: Math.round(v.profit),
      }))
      .filter((d) => d.budget > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 8);
  }, [isSingleProject, projectTasks, t]);

  // Pie data: portfolio = budget vs profit, project = cost center breakdown
  const pieData = useMemo(() => {
    if (isSingleProject) return costCenterData;
    return [
      { name: t("financialAnalysis.totalBudget"), value: Math.round(totals.budget) },
      { name: t("financialAnalysis.totalProfit"), value: Math.round(totals.profit) },
    ];
  }, [isSingleProject, costCenterData, totals, t]);

  // ---- Tooltips ----

  const ProjectTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
      payload: { fullName: string; budget: number; profit: number };
    }>;
  }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const margin = d.budget > 0 ? Math.round((d.profit / d.budget) * 100) : 0;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium">{d.fullName}</p>
        <p className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {t("financialAnalysis.totalBudget")}: {formatCurrency(d.budget, currency)}
        </p>
        <p className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {t("financialAnalysis.totalProfit")}: {formatCurrency(d.profit, currency)}
        </p>
        <p className="text-muted-foreground">
          {t("financialAnalysis.margin")}: {margin}%
        </p>
      </div>
    );
  };

  const MonthlyTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.dataKey === "budget" ? "#3b82f6" : "#10b981" }}
            />
            {p.dataKey === "budget"
              ? t("financialAnalysis.totalBudget")
              : t("financialAnalysis.totalProfit")}
            : {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p>{formatCurrency(payload[0].value, currency)}</p>
      </div>
    );
  };

  const hasData = filtered.length > 0;

  // Sort projects alphabetically for the selector
  const sortedProjects = useMemo(
    () => [...projects].filter((p) => financials[p.id]?.budget > 0).sort((a, b) => a.name.localeCompare(b.name)),
    [projects, financials]
  );

  return (
    <section className="mt-8 border rounded-lg">
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2 font-medium">
          <BarChart3 className="h-4 w-4" />
          {t("financialAnalysis.title")}
          {!isExpanded && hasData && (
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {totals.count} {t("financialAnalysis.projects")} &middot;{" "}
              {formatCurrency(totals.budget, currency, { compact: true })}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t space-y-4 pt-4">
          {/* Filters */}
          <div className="flex flex-col gap-2">
            {/* Project selector */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[220px] h-8 text-sm">
                  <SelectValue placeholder={t("financialAnalysis.allProjects", "All projects")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("financialAnalysis.allProjects", "All projects")}</SelectItem>
                  {sortedProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period toggle */}
            {!isSingleProject && (
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={String(p)}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      period === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {presetLabel(p)}
                  </button>
                ))}
              </div>
            )}

            {/* Status filter */}
            {!isSingleProject && (
              <div className="flex flex-wrap gap-1">
                {(["all", "active", "quoting", "completed"] as StatusFilter[]).map((sf) => (
                  <button
                    key={sf}
                    onClick={() => setStatusFilter(sf)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      statusFilter === sf
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t(`financialAnalysis.status_${sf}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Custom date inputs */}
            {!isSingleProject && period === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-auto h-8 text-sm"
                  placeholder={t("financialAnalysis.from")}
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-auto h-8 text-sm"
                  placeholder={t("financialAnalysis.to")}
                />
              </div>
            )}

            {/* Active range label */}
            <p className="text-xs text-muted-foreground">
              {isSingleProject
                ? `${projectTasks.length} ${t("financialAnalysis.tasks", "arbeten")}`
                : `${t("financialAnalysis.showing")}: ${dateRangeLabel} (${filtered.length}/${projects.filter((p) => financials[p.id]?.budget > 0).length} ${t("financialAnalysis.projects")})`}
            </p>
          </div>

          {!hasData || (isSingleProject && loadingTasks) ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {loadingTasks ? "..." : t("financialAnalysis.noData")}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("financialAnalysis.totalBudget")}
                  </p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(totals.budget, currency)}
                  </p>
                  {!isSingleProject && (
                    <p className="text-xs text-muted-foreground">
                      {totals.count} {t("financialAnalysis.projects")}
                    </p>
                  )}
                  {isSingleProject && (
                    <p className="text-xs text-muted-foreground">
                      {projectTasks.length} {t("financialAnalysis.tasks", "arbeten")}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("financialAnalysis.totalProfit")}
                  </p>
                  <p className="text-xl font-semibold text-emerald-600">
                    {formatCurrency(totals.profit, currency)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 col-span-2 sm:col-span-1">
                  <p className="text-sm text-muted-foreground">
                    {t("financialAnalysis.margin")}
                  </p>
                  <p className="text-xl font-semibold">{totals.margin}%</p>
                </div>
              </div>

              {/* Charts — side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Pie chart */}
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {isSingleProject
                      ? t("financialAnalysis.costPerType", "Cost per work type")
                      : t("financialAnalysis.budgetVsProfit")}
                  </p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      {t("financialAnalysis.noData")}
                    </div>
                  )}
                </div>

                {/* Right: Monthly trend */}
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t("financialAnalysis.monthlyTrend")}
                  </p>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyData} margin={{ left: 10, right: 10 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) =>
                            formatCurrency(v, currency, { compact: true })
                          }
                        />
                        <Tooltip content={<MonthlyTooltip />} />
                        <Legend
                          formatter={(value) =>
                            value === "budget"
                              ? t("financialAnalysis.totalBudget")
                              : t("financialAnalysis.totalProfit")
                          }
                        />
                        <Bar dataKey="budget" fill="#3b82f6" name="budget" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" fill="#10b981" name="profit" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      {t("financialAnalysis.noData")}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Per-project bars (portfolio) or Per-room bars (single project) */}
              {!isSingleProject && projectChartData.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t("financialAnalysis.perProject")}
                  </p>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(200, projectChartData.length * 50)}
                  >
                    <BarChart
                      data={projectChartData}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          formatCurrency(v, currency, { compact: true })
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<ProjectTooltip />} />
                      <Legend
                        formatter={(value) =>
                          value === "budget"
                            ? t("financialAnalysis.totalBudget")
                            : t("financialAnalysis.totalProfit")
                        }
                      />
                      <Bar
                        dataKey="budget"
                        fill="#3b82f6"
                        name="budget"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="profit"
                        fill="#10b981"
                        name="profit"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {isSingleProject && roomData.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t("financialAnalysis.perRoom", "Per room")}
                  </p>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(200, roomData.length * 50)}
                  >
                    <BarChart
                      data={roomData}
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          formatCurrency(v, currency, { compact: true })
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<ProjectTooltip />} />
                      <Legend
                        formatter={(value) =>
                          value === "budget"
                            ? t("financialAnalysis.totalBudget")
                            : t("financialAnalysis.totalProfit")
                        }
                      />
                      <Bar
                        dataKey="budget"
                        fill="#3b82f6"
                        name="budget"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="profit"
                        fill="#10b981"
                        name="profit"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
