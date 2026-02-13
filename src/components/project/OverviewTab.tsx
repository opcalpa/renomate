import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Receipt, FileText, Mail, MessageSquare, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverviewData } from "./overview/useOverviewData";
import { PulseCards } from "./overview/PulseCards";
import { ProjectQuotesCard } from "./overview/ProjectQuotesCard";
import { NeedsActionSection } from "./overview/NeedsActionSection";
import { ActiveTasksSection } from "./overview/ActiveTasksSection";
import { RecentActivitySection } from "./overview/RecentActivitySection";
import { RecentPhotos } from "./overview/RecentPhotos";
import { ProjectSettingsDialog } from "./overview/ProjectSettingsDialog";
import { QuickReceiptCaptureModal } from "./QuickReceiptCaptureModal";
import { CreateQuoteDialog } from "./CreateQuoteDialog";
import { SendCustomerFormDialog } from "./SendCustomerFormDialog";
import { ProjectLockBanner } from "./ProjectLockBanner";
import { useProjectLock } from "@/hooks/useProjectLock";
import { CommentsSection } from "@/components/comments/CommentsSection";
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
  onNavigateToFiles?: () => void;
}

const OverviewTab = ({
  project,
  onProjectUpdate,
  onNavigateToPurchases,
  onNavigateToTasks,
  onNavigateToFeed,
  onNavigateToBudget,
  onNavigateToFiles,
}: OverviewTabProps) => {
  const { t } = useTranslation();
  const { lockStatus } = useProjectLock(project.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

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
    onOpenSettings: () => setSettingsOpen(true),
  };

  const handleProjectUpdate = () => {
    onProjectUpdate?.();
    refetch();
  };

  return (
    <div className="space-y-6">
      <ProjectLockBanner lockStatus={lockStatus} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">{t("overview.projectOverview")}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t("overview.quoteMenu")}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem
                onClick={() => setCustomerFormOpen(true)}
                className="flex flex-col items-start cursor-pointer py-3"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">{t("overview.customerForm")}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-6">
                  {t("overview.customerFormHint")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQuoteDialogOpen(true)}
                className="flex flex-col items-start cursor-pointer py-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{t("overview.createQuote")}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-6">
                  {t("overview.createQuoteHint")}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReceiptModalOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Receipt className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("overview.addPurchase")}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <PulseCards
        taskStats={taskStats}
        budgetStats={budgetStats}
        orderStats={orderStats}
        timelineStats={timelineStats}
        navigation={navigation}
        currency={project.currency}
      />

      <RecentPhotos
        projectId={project.id}
        onViewAll={() => onNavigateToFiles?.()}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("overview.projectChat.title", "Project chat")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("overview.projectChat.description", "Write a message to your project team")}
          </p>
        </CardHeader>
        <CardContent>
          <CommentsSection
            projectId={project.id}
            entityId={project.id}
            entityType="project"
            chatMode
          />
        </CardContent>
      </Card>

      <ProjectQuotesCard
        projectId={project.id}
        currency={project.currency}
        onCreateQuote={() => setQuoteDialogOpen(true)}
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

      <QuickReceiptCaptureModal
        projectId={project.id}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        onSuccess={() => {
          refetch();
          onNavigateToPurchases?.();
        }}
      />

      <CreateQuoteDialog
        projectId={project.id}
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
      />

      <SendCustomerFormDialog
        projectId={project.id}
        projectName={project.name}
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default OverviewTab;
