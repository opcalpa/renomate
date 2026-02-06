import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverviewData } from "./overview/useOverviewData";
import { PulseCards } from "./overview/PulseCards";
import { NeedsActionSection } from "./overview/NeedsActionSection";
import { ActiveTasksSection } from "./overview/ActiveTasksSection";
import { RecentActivitySection } from "./overview/RecentActivitySection";
import { ProjectSettingsDialog } from "./overview/ProjectSettingsDialog";
import type { OverviewProject, OverviewNavigation } from "./overview/types";
import type { FeedComment } from "./feed/types";

interface OverviewTabProps {
  project: OverviewProject;
  onProjectUpdate?: () => void;
  onNavigateToEntity?: (comment: FeedComment) => void;
  onNavigateToPurchases?: () => void;
  onNavigateToTasks?: (taskId?: string) => void;
  onNavigateToFeed?: () => void;
  onNavigateToBudget?: () => void;
}

const OverviewTab = ({
  project,
  onProjectUpdate,
  onNavigateToPurchases,
  onNavigateToTasks,
  onNavigateToFeed,
  onNavigateToBudget,
}: OverviewTabProps) => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    taskStats,
    budgetStats,
    orderStats,
    timelineStats,
    inProgressTasks,
    recentActivities,
    refetch,
  } = useOverviewData(project);

  const navigation: OverviewNavigation = {
    onNavigateToTasks: (taskId?: string) => onNavigateToTasks?.(taskId),
    onNavigateToPurchases: () => onNavigateToPurchases?.(),
    onNavigateToFeed: () => onNavigateToFeed?.(),
    onNavigateToBudget: () => onNavigateToBudget?.(),
  };

  const handleProjectUpdate = () => {
    onProjectUpdate?.();
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("overview.projectOverview")}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </div>

      <PulseCards
        taskStats={taskStats}
        budgetStats={budgetStats}
        orderStats={orderStats}
        timelineStats={timelineStats}
        navigation={navigation}
        currency={project.currency}
      />

      <NeedsActionSection
        taskStats={taskStats}
        budgetStats={budgetStats}
        orderStats={orderStats}
        navigation={navigation}
      />

      <ActiveTasksSection
        tasks={inProgressTasks}
        navigation={navigation}
      />

      <RecentActivitySection
        activities={recentActivities}
        navigation={navigation}
      />

      <ProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
        onProjectUpdate={handleProjectUpdate}
      />
    </div>
  );
};

export default OverviewTab;
