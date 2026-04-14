import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/currency";

interface BudgetRow {
  id: string;
  name: string;
  type: "task" | "material";
  budget: number;
  ordered: number;
  paid: number;
  status: string;
  room?: string;
  roomId?: string;
  costCenter?: string;
}

interface BudgetChartsSectionProps {
  rows: BudgetRow[];
  currency?: string | null;
}

type ChartDataOption = "type" | "room" | "status" | "costCenter";

const COST_CENTER_I18N: Record<string, string> = {
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
  inspection: "financialAnalysis.ccInspection",
  cleanup: "financialAnalysis.ccCleanup",
  design: "financialAnalysis.ccDesign",
  other: "financialAnalysis.ccOther",
};

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function BudgetChartsSection({ rows, currency }: BudgetChartsSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pieDataOption, setPieDataOption] = useState<ChartDataOption>("costCenter");
  const [barDataOption, setBarDataOption] = useState<ChartDataOption>("costCenter");

  const dataOptions: { value: ChartDataOption; label: string }[] = [
    { value: "type", label: t("budgetCharts.byType") },
    { value: "room", label: t("budgetCharts.byRoom") },
    { value: "status", label: t("budgetCharts.byStatus") },
    { value: "costCenter", label: t("budgetCharts.byCostCenter") },
  ];

  // Aggregate data based on selected option
  const aggregateData = (option: ChartDataOption) => {
    const grouped = new Map<string, { budget: number; paid: number; count: number }>();

    for (const row of rows) {
      let key: string;
      let label: string;

      switch (option) {
        case "type":
          key = row.type;
          label = row.type === "task" ? t("budget.task") : t("budget.material");
          break;
        case "room":
          key = row.roomId || "no-room";
          label = row.room || t("budget.noRoom");
          break;
        case "status":
          key = row.status;
          label = getStatusLabel(row.status);
          break;
        case "costCenter":
          key = row.costCenter || "no-cc";
          label = row.costCenter
            ? t(COST_CENTER_I18N[row.costCenter] || "financialAnalysis.ccOther", row.costCenter)
            : t("budgetCharts.noCostCenter");
          break;
        default:
          key = "unknown";
          label = "Unknown";
      }

      const existing = grouped.get(key) || { budget: 0, paid: 0, count: 0, label };
      grouped.set(key, {
        ...existing,
        budget: existing.budget + row.budget,
        paid: existing.paid + row.paid,
        count: existing.count + 1,
        label,
      });
    }

    return Array.from(grouped.entries())
      .map(([key, data]) => ({
        key,
        name: (data as { label: string }).label,
        budget: data.budget,
        paid: data.paid,
        count: data.count,
      }))
      .filter((d) => d.budget > 0)
      .sort((a, b) => b.budget - a.budget);
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      not_paid: t("paymentStatuses.notPaid"),
      billed: t("materialStatuses.billed"),
      partially_paid: t("paymentStatuses.partiallyPaid"),
      paid: t("materialStatuses.paid"),
      submitted: t("materialStatuses.submitted"),
      declined: t("materialStatuses.declined"),
      approved: t("materialStatuses.approved"),
      paused: t("materialStatuses.paused"),
    };
    return map[status] || status;
  };

  const pieData = aggregateData(pieDataOption);
  const barData = aggregateData(barDataOption);
  const totalBudget = rows.reduce((sum, r) => sum + r.budget, 0);

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { budget: number; paid: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalBudget > 0 ? ((data.payload.budget / totalBudget) * 100).toFixed(1) : 0;
      return (
        <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
          <p className="font-medium">{data.name}</p>
          <p>{t("common.budget")}: {formatCurrency(data.payload.budget, currency)} ({percentage}%)</p>
          {data.payload.paid > 0 && (
            <p className="text-muted-foreground">{t("budget.paid")}: {formatCurrency(data.payload.paid, currency)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; payload?: { budget: number; paid: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const d = payload[0]?.payload;
      const paidPct = d && d.budget > 0 ? Math.round((d.paid / d.budget) * 100) : 0;
      return (
        <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
          <p className="font-medium">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.dataKey === "budget" ? COLORS[0] : COLORS[1] }}
              />
              {p.dataKey === "budget" ? t("common.budget") : t("budget.paid")}:{" "}
              {formatCurrency(p.value, currency)}
              {p.dataKey === "paid" && d && d.budget > 0 && (
                <span className="text-muted-foreground">({paidPct}%)</span>
              )}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border rounded-lg">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2 font-medium">
          <BarChart3 className="h-4 w-4" />
          {t("budgetCharts.title")}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Charts */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className={`grid grid-cols-1 ${pieData.length > 1 ? "lg:grid-cols-2" : ""} gap-6 pt-4`}>
            {/* Pie Chart — only show if >1 segment (1 segment = no insight) */}
            {pieData.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PieChartIcon className="h-4 w-4" />
                  {t("budgetCharts.distribution")}
                </span>
                <Select value={pieDataOption} onValueChange={(v) => setPieDataOption(v as ChartDataOption)}>
                  <SelectTrigger className="w-[160px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="budget"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            )}

            {/* Bar Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  {t("budgetCharts.comparison")}
                </span>
                <Select value={barDataOption} onValueChange={(v) => setBarDataOption(v as ChartDataOption)}>
                  <SelectTrigger className="w-[160px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData.slice(0, 8)} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => (v.length > 20 ? v.substring(0, 20) + "…" : v)}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Legend
                      formatter={(value) => (value === "budget" ? t("common.budget") : t("budget.paid"))}
                    />
                    <Bar dataKey="budget" fill={COLORS[0]} name="budget" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="paid" name="paid" fill={COLORS[1]} radius={[0, 4, 4, 0]}>
                      {barData.slice(0, 8).map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={entry.paid > entry.budget ? "#ef4444" : entry.paid > entry.budget * 0.9 ? "#f59e0b" : COLORS[1]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("budgetCharts.noData")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
