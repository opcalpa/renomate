import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListChecks } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getDateLocale } from "@/lib/dateFnsLocale";
import type { OverviewTask, OverviewNavigation } from "./types";

interface ActiveTasksSectionProps {
  tasks: OverviewTask[];
  navigation: OverviewNavigation;
}

export function ActiveTasksSection({ tasks, navigation }: ActiveTasksSectionProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t("overview.activeTasks.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ListChecks className="h-8 w-8 mb-2" />
            <p className="text-sm">{t("overview.activeTasks.noTasks")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigation.onNavigateToTasks(task.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap md:w-20 md:text-right">
                    {task.assignee_name || t("overview.activeTasks.unassigned")}
                  </span>
                  <Progress
                    value={task.progress}
                    className="h-1.5 w-16 flex-shrink-0"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap md:w-14 md:text-right">
                    {task.due_date ? format(parseISO(task.due_date), "d MMM", { locale: dateLocale }) : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigation.onNavigateToTasks()}
          >
            {t("overview.activeTasks.viewAllTasks")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
