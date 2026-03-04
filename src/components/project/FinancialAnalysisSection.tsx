import { useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/currency";
import { subMonths, isAfter, isBefore, parseISO, format, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { Input } from "@/components/ui/input";

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

const PIE_COLORS = ["#3b82f6", "#10b981"];

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

  // Compute date range from the active preset
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
        const created = parseISO(p.created_at);
        if (dateRange.from && !isAfter(created, dateRange.from)) return false;
        if (dateRange.to && !isBefore(created, dateRange.to)) return false;
        const allowed = STATUS_FILTER_GROUPS[statusFilter];
        if (allowed.length > 0 && p.status && !allowed.includes(p.status)) return false;
        return true;
      }),
    [projects, financials, dateRange, statusFilter]
  );

  // Readable date range string for context
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

  // Per-project bar chart data
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

  // Monthly time-series data
  const monthlyData = useMemo(() => {
    const buckets = new Map<string, { budget: number; profit: number }>();

    for (const p of filtered) {
      const monthKey = format(startOfMonth(parseISO(p.created_at)), "yyyy-MM");
      const prev = buckets.get(monthKey) || { budget: 0, profit: 0 };
      buckets.set(monthKey, {
        budget: prev.budget + (financials[p.id]?.budget ?? 0),
        profit: prev.profit + (financials[p.id]?.profit ?? 0),
      });
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: format(parseISO(key + "-01"), "MMM yy"),
        budget: Math.round(val.budget),
        profit: Math.round(val.profit),
      }));
  }, [filtered, financials]);

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

  // Pie chart data
  const pieData = useMemo(
    () => [
      { name: t("financialAnalysis.totalBudget"), value: Math.round(totals.budget) },
      { name: t("financialAnalysis.totalProfit"), value: Math.round(totals.profit) },
    ],
    [totals, t]
  );

  // Tooltips
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
          {/* Period toggle + date range indicator */}
          <div className="flex flex-col gap-2">
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

            {/* Status filter */}
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

            {/* Custom date inputs */}
            {period === "custom" && (
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
              {t("financialAnalysis.showing")}: {dateRangeLabel} ({filtered.length}/{projects.filter((p) => financials[p.id]?.budget > 0).length} {t("financialAnalysis.projects")})
            </p>
          </div>

          {!hasData ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t("financialAnalysis.noData")}
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
                  <p className="text-xs text-muted-foreground">
                    {totals.count} {t("financialAnalysis.projects")}
                  </p>
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

              {/* Pie chart + Monthly chart — side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie: Budget vs Profit totals */}
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {t("financialAnalysis.budgetVsProfit")}
                  </p>
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
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly time-series */}
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

              {/* Per-project horizontal bar chart */}
              {projectChartData.length > 0 && (
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
            </>
          )}
        </div>
      )}
    </section>
  );
}
