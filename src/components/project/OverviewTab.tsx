import { useState, useEffect } from "react";
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
import { ProjectDocumentsCard } from "./overview/ProjectDocumentsCard";
import { OverviewFeedSection } from "./overview/OverviewFeedSection";
import { ProjectSettingsDialog } from "./overview/ProjectSettingsDialog";
import { QuickReceiptCaptureModal } from "./QuickReceiptCaptureModal";
import { CreateQuoteDialog } from "./CreateQuoteDialog";
import { SendCustomerFormDialog } from "./SendCustomerFormDialog";
import { InvoiceMethodDialog } from "@/components/invoices/InvoiceMethodDialog";
import { useProjectLock } from "@/hooks/useProjectLock";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { ProjectStatusCTA } from "./overview/ProjectStatusCTA";
import { PlanningTaskList } from "./overview/PlanningTaskList";
import { PlanningRoomList } from "./overview/PlanningRoomList";
import { GuestPlanningSection } from "./overview/GuestPlanningSection";
import { ProjectHeader } from "./overview/ProjectHeader";
import { RotDetailsCard } from "./overview/RotDetailsCard";
import { normalizeStatus, isQuotePhase } from "@/lib/projectStatus";
import { supabase } from "@/integrations/supabase/client";
import { updateGuestProject } from "@/services/guestStorageService";
import type { OverviewProject, OverviewNavigation } from "./overview/types";
import type { FeedComment } from "./feed/types";

interface OverviewTabProps {
  project: OverviewProject;
  userType?: string | null;
  isGuest?: boolean;
  onProjectUpdate?: () => void;
  onNavigateToEntity?: (comment: FeedComment) => void;
  onNavigateToPurchases?: (materialId?: string) => void;
  onNavigateToTasks?: (taskId?: string) => void;
  onNavigateToFeed?: () => void;
  onNavigateToBudget?: () => void;
  onNavigateToFiles?: () => void;
  onNavigateToRoom?: (roomId: string) => void;
}

const OverviewTab = ({
  project,
  userType,
  isGuest,
  onProjectUpdate,
  onNavigateToEntity,
  onNavigateToPurchases,
  onNavigateToTasks,
  onNavigateToFeed,
  onNavigateToBudget,
  onNavigateToFiles,
  onNavigateToRoom,
}: OverviewTabProps) => {
  const { t } = useTranslation();
  const { lockStatus } = useProjectLock(isGuest ? undefined : project.id);
  const isHomeowner = userType === "homeowner";
  const projectStatus = normalizeStatus(project.status);
  const isPlanning = projectStatus === "planning" || isQuotePhase(projectStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [invoiceMethodOpen, setInvoiceMethodOpen] = useState(false);
  const [rotPersonnummer, setRotPersonnummer] = useState<string | null>(null);

  // Fetch client personnummer for ROT card (builder view)
  useEffect(() => {
    if (isHomeowner || isGuest) return;
    const fetchClientPersonnummer = async () => {
      // Find client share for this project
      const { data: shares } = await supabase
        .from("project_shares")
        .select("shared_with_user_id")
        .eq("project_id", project.id)
        .eq("role", "client")
        .limit(1);

      const clientProfileId = shares?.[0]?.shared_with_user_id;
      if (!clientProfileId) return;

      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("personnummer")
        .eq("id", clientProfileId)
        .single();

      if (clientProfile?.personnummer) {
        setRotPersonnummer(clientProfile.personnummer);
      }
    };
    fetchClientPersonnummer();
  }, [project.id, isHomeowner]);

  const {
    taskStats,
    budgetStats,
    orderStats,
    timelineStats,
    refetch,
  } = useOverviewData(project, isGuest);

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

  // ----- Guest: show planning tools (localStorage-backed) -----
  if (isGuest) {
    const handleActivateProject = () => {
      updateGuestProject(project.id, { status: "active" });
      handleProjectUpdate();
    };

    return (
      <div className="space-y-6">
        <ProjectHeader project={project} onOpenSettings={() => setSettingsOpen(true)} />
        <GuestPlanningSection
          projectId={project.id}
          projectStatus={project.status}
          onActivate={handleActivateProject}
        />
        <ProjectSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          project={project}
          isGuest={isGuest}
          onProjectUpdate={handleProjectUpdate}
        />
      </div>
    );
  }

  // ----- Scope / Planning section (always available for authenticated users) -----
  const planningSection = (
    <>
      <PlanningTaskList
        projectId={project.id}
        currency={project.currency}
        isHomeowner={isHomeowner}
        onNavigateToTasks={(taskId) => onNavigateToTasks?.(taskId)}
        onCreateQuote={() => setQuoteDialogOpen(true)}
        locked={lockStatus.isLocked}
      />
      <PlanningRoomList
        projectId={project.id}
        locked={lockStatus.isLocked}
      />
    </>
  );

  // ----- All phases: unified dashboard view -----
  return (
    <div className="space-y-6">
      {/* Status CTA - only in active phases */}
      {!isHomeowner && !isPlanning && (
        <ProjectStatusCTA
          status={project.status}
          taskCount={taskStats.total}
          currency={project.currency}
          onNavigateToTasks={() => onNavigateToTasks?.()}
          onCreateQuote={() => setQuoteDialogOpen(true)}
          onViewQuote={() => setQuoteDialogOpen(true)}
          onCreateInvoice={() => setInvoiceMethodOpen(true)}
          onReviseQuote={() => setQuoteDialogOpen(true)}
        />
      )}

      <ProjectHeader project={project} onOpenSettings={() => setSettingsOpen(true)} />

      {/* Documents card - contractors in planning/quote phases */}
      {!isHomeowner && isPlanning && (
        <ProjectDocumentsCard
          projectId={project.id}
          currency={project.currency}
          onCreateQuote={() => setQuoteDialogOpen(true)}
          onCreateInvoice={() => setInvoiceMethodOpen(true)}
        />
      )}

      {/* Scope / Planning section — always visible */}
      {planningSection}

      {/* TODO: Homeowner RFQ sharing button can be added here later */}

      {/* Dashboard toolbar + pulse cards — hidden during pure planning phase */}
      {!isPlanning && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-medium text-muted-foreground">{t("overview.projectOverview")}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {!isHomeowner && !projectStatus?.startsWith("active") && (
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
              )}
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
        </>
      )}

      {!isPlanning && (
        <PulseCards
          taskStats={taskStats}
          budgetStats={budgetStats}
          orderStats={orderStats}
          timelineStats={timelineStats}
          navigation={navigation}
          currency={project.currency}
          isBuilder={!isHomeowner}
        />
      )}

      <Card id="project-chat">
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

      {/* Quotes & Invoices unified card - contractors, active phases */}
      {!isHomeowner && !isPlanning && (
        <ProjectDocumentsCard
          projectId={project.id}
          currency={project.currency}
          onCreateQuote={() => setQuoteDialogOpen(true)}
          onCreateInvoice={() => setInvoiceMethodOpen(true)}
          estimatedProfit={budgetStats.estimatedProfit}
        />
      )}

      {/* ROT details card - contractors, active phases */}
      {!isHomeowner && !isPlanning && (
        <RotDetailsCard
          personnummer={rotPersonnummer}
          propertyAddress={project.address}
          propertyDesignation={project.property_designation}
        />
      )}

      {!isPlanning && (
        <OverviewFeedSection
          projectId={project.id}
          navigation={navigation}
          onNavigateToEntity={onNavigateToEntity}
          onNavigateToFiles={onNavigateToFiles}
          onNavigateToTask={(taskId) => onNavigateToTasks?.(taskId)}
          onNavigateToMaterial={(materialId) => onNavigateToPurchases?.(materialId)}
          onNavigateToRoom={onNavigateToRoom}
        />
      )}

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

      <InvoiceMethodDialog
        projectId={project.id}
        open={invoiceMethodOpen}
        onOpenChange={setInvoiceMethodOpen}
      />
    </div>
  );
};

export default OverviewTab;
