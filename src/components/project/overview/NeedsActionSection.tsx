import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PauseCircle, ShoppingCart, TrendingUp } from "lucide-react";
import type { TaskStats, BudgetStats, OrderStats, OverviewNavigation } from "./types";

interface NeedsActionSectionProps {
  taskStats: TaskStats;
  budgetStats: BudgetStats;
  orderStats: OrderStats;
  navigation: OverviewNavigation;
}

interface ActionItem {
  key: string;
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

export function NeedsActionSection({
  taskStats,
  budgetStats,
  orderStats,
  navigation,
}: NeedsActionSectionProps) {
  const { t } = useTranslation();

  const items: ActionItem[] = [];

  if (taskStats.overdue.length > 0) {
    items.push({
      key: "overdue",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      text: t("overview.needsAction.overdueTasks", { count: taskStats.overdue.length }),
      onClick: () => navigation.onNavigateToTasks(),
    });
  }

  if (taskStats.blockedOrOnHold.length > 0) {
    items.push({
      key: "blocked",
      icon: <PauseCircle className="h-4 w-4 text-amber-500" />,
      text: t("overview.needsAction.blockedTasks", { count: taskStats.blockedOrOnHold.length }),
      onClick: () => navigation.onNavigateToTasks(),
    });
  }

  if (orderStats.pendingCount > 0) {
    items.push({
      key: "orders",
      icon: <ShoppingCart className="h-4 w-4 text-amber-500" />,
      text: t("overview.needsAction.pendingOrders", { count: orderStats.pendingCount }),
      onClick: () => navigation.onNavigateToPurchases(),
    });
  }

  if (budgetStats.isWarning) {
    items.push({
      key: "budget",
      icon: <TrendingUp className="h-4 w-4 text-red-500" />,
      text: t("overview.needsAction.budgetWarning", { percentage: budgetStats.percentage }),
      onClick: () => navigation.onNavigateToBudget(),
    });
  }

  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t("overview.needsAction.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="text-sm">{item.text}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={item.onClick}>
              {t("overview.needsAction.view")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
