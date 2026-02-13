import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, Calendar, Wallet, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { TaskStats, BudgetStats, OrderStats, TimelineStats, OverviewNavigation } from "./types";

interface PulseCardsProps {
  taskStats: TaskStats;
  budgetStats: BudgetStats;
  orderStats: OrderStats;
  timelineStats: TimelineStats;
  navigation: OverviewNavigation;
  currency?: string | null;
}

function getTaskColor(percentage: number): string {
  if (percentage >= 75) return "text-green-600 dark:text-green-400";
  if (percentage >= 25) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getTaskBarColor(percentage: number): string {
  if (percentage >= 75) return "[&>div]:bg-green-500";
  if (percentage >= 25) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

function getTimelineColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days > 30) return "text-green-600 dark:text-green-400";
  if (days >= 7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getBudgetColor(percentage: number): string {
  if (percentage > 80) return "text-red-600 dark:text-red-400";
  if (percentage >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function getBudgetBarColor(percentage: number): string {
  if (percentage > 80) return "[&>div]:bg-red-500";
  if (percentage >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-green-500";
}

function getOrderColor(count: number): string {
  return count > 0
    ? "text-amber-600 dark:text-amber-400"
    : "text-green-600 dark:text-green-400";
}

export function PulseCards({
  taskStats,
  budgetStats,
  orderStats,
  timelineStats,
  navigation,
  currency,
}: PulseCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tasks Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigation.onNavigateToTasks()}
      >
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className={`h-4 w-4 ${getTaskColor(taskStats.percentage)}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {t("overview.pulseCards.tasks")}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getTaskColor(taskStats.percentage)}`}>
            {taskStats.completed}/{taskStats.total}
          </p>
          <Progress
            value={taskStats.percentage}
            className={`h-1.5 mt-2 ${getTaskBarColor(taskStats.percentage)}`}
          />
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          // If no deadline set, open settings to add one
          if (timelineStats.daysRemaining === null) {
            navigation.onOpenSettings();
          }
        }}
      >
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className={`h-4 w-4 ${getTimelineColor(timelineStats.daysRemaining)}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {t("overview.pulseCards.timeline")}
            </span>
          </div>
          {timelineStats.daysRemaining !== null ? (
            <p className={`text-2xl font-bold ${getTimelineColor(timelineStats.daysRemaining)}`}>
              {timelineStats.daysRemaining < 0
                ? t("overview.pulseCards.overdue")
                : t("overview.pulseCards.daysRemaining", { count: timelineStats.daysRemaining })}
            </p>
          ) : (
            <p className="text-lg text-muted-foreground">
              {t("overview.pulseCards.noDeadlineSet")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Budget Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          // If no budget set, open settings to add one
          if (!budgetStats.total) {
            navigation.onOpenSettings();
          } else {
            navigation.onNavigateToBudget();
          }
        }}
      >
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`h-4 w-4 ${getBudgetColor(budgetStats.percentage)}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {t("overview.pulseCards.budget")}
            </span>
          </div>
          {budgetStats.total ? (
            <>
              <p className={`text-lg font-bold ${getBudgetColor(budgetStats.percentage)}`}>
                {formatCurrency(budgetStats.spent, currency, { compact: true })}
                <span className="text-sm font-normal text-muted-foreground">
                  {" / "}
                  {formatCurrency(budgetStats.total, currency, { compact: true })}
                </span>
              </p>
              <Progress
                value={Math.min(budgetStats.percentage, 100)}
                className={`h-1.5 mt-2 ${getBudgetBarColor(budgetStats.percentage)}`}
              />
            </>
          ) : (
            <p className="text-lg text-muted-foreground">
              {t("overview.pulseCards.noBudgetSet")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Orders Card */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigation.onNavigateToPurchases()}
      >
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className={`h-4 w-4 ${getOrderColor(orderStats.pendingCount)}`} />
            <span className="text-sm font-medium text-muted-foreground">
              {t("overview.pulseCards.orders")}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getOrderColor(orderStats.pendingCount)}`}>
            {orderStats.pendingCount}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {orderStats.pendingCount > 0
              ? t("overview.pulseCards.needsReview")
              : t("overview.pulseCards.noPending")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
