import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Receipt, FileText, Mail, MessageSquare, ChevronDown, ChevronRight, ExternalLink, UserPlus } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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
import { HomeownerPlanningView } from "./overview/HomeownerPlanningView";
import { GuestPlanningSection } from "./overview/GuestPlanningSection";
import { ProjectHeader } from "./overview/ProjectHeader";
import { RotDetailsCard } from "./overview/RotDetailsCard";
import { normalizeStatus, isQuotePhase } from "@/lib/projectStatus";
import { supabase } from "@/integrations/supabase/client";
import { updateGuestProject } from "@/services/guestStorageService";
import { useContextualTips } from "@/hooks/useContextualTips";
import { TipList } from "@/components/ui/TipCard";
import type { TipContext } from "@/lib/contextualTips";
import { InviteCustomerPlanningDialog } from "./overview/InviteCustomerPlanningDialog";
import type { OverviewProject, OverviewNavigation } from "./overview/types";
import type { FeedComment } from "./feed/types";

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left py-2 group">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          {icon}
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 sm:space-y-6 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface OverviewTabProps {
  project: OverviewProject;
  userType?: string | null;
  isGuest?: boolean;
  isProjectOwner?: boolean;
  isPlanningContributor?: boolean;
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
  isProjectOwner = false,
  isPlanningContributor = false,
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
  const isInvitedClient = isHomeowner && !isProjectOwner;
  const projectStatus = normalizeStatus(project.status);
  const isPlanning = projectStatus === "planning" || isQuotePhase(projectStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [invoiceMethodOpen, setInvoiceMethodOpen] = useState(false);
  const [inviteCustomerOpen, setInviteCustomerOpen] = useState(false);
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
        .maybeSingle();

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
      <div className="space-y-4 sm:space-y-6">
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

  // ----- Contextual tips -----
  const tipContext: TipContext = {
    projectStatus: projectStatus || undefined,
    userRole: isHomeowner ? "homeowner" : "contractor",
    contexts: isPlanning ? ["planningPhase"] : [],
  };
  const { tips, dismiss } = useContextualTips(tipContext);

  const isRfqProject = !!project.source_rfq_project_id;

  // ----- Scope / Planning section (always available for authenticated users) -----
  const planningSection = (isHomeowner && isProjectOwner) || isPlanningContributor ? (
    <HomeownerPlanningView
      projectId={project.id}
      projectName={project.name}
      projectAddress={project.address}
      currency={project.currency}
      onActivate={isPlanningContributor ? undefined : handleProjectUpdate}
      contributorMode={isPlanningContributor}
    />
  ) : (
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
    <div className="space-y-4 sm:space-y-6">
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

      {/* RFQ banner — builder working on a homeowner's quote request */}
      {isRfqProject && !isHomeowner && isPlanning && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {t("rfqBanner.title", "Quote request from homeowner")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("rfqBanner.description", "Review the scope below, add your pricing, then create a quote.")}
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setQuoteDialogOpen(true)}
            >
              <FileText className="h-3.5 w-3.5" />
              {t("rfqBanner.createQuote", "Create quote")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents card - contractors in planning/quote phases */}
      {!isHomeowner && isPlanning && (
        <CollapsibleSection
          title={t("overview.documents", "Documents")}
          icon={<FileText className="h-4 w-4" />}
          defaultOpen
        >
          <ProjectDocumentsCard
            projectId={project.id}
            currency={project.currency}
            onCreateQuote={() => setQuoteDialogOpen(true)}
            onCreateInvoice={() => setInvoiceMethodOpen(true)}
          />
        </CollapsibleSection>
      )}

      {/* Invite customer to fill in planning — builder only, planning phase */}
      {!isHomeowner && isPlanning && !isRfqProject && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setInviteCustomerOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("inviteCustomerPlanning.button", "Invite customer")}
          </Button>
        </div>
      )}

      {/* Scope / Planning section — during planning: prominent; after planning: moved to bottom */}
      {isPlanning && (!isInvitedClient || isPlanningContributor) && planningSection}

      {/* Contextual tips */}
      {tips.length > 0 && (
        <TipList tips={tips} onDismiss={dismiss} maxTips={2} compact />
      )}

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

      <CollapsibleSection
        title={t("overview.projectChat.title", "Project chat")}
        icon={<MessageSquare className="h-4 w-4" />}
        defaultOpen
      >
        <Card id="project-chat">
          <CardContent className="pt-4">
            <CommentsSection
              projectId={project.id}
              entityId={project.id}
              entityType="project"
              chatMode
            />
          </CardContent>
        </Card>
      </CollapsibleSection>

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

      <OverviewFeedSection
        projectId={project.id}
        navigation={navigation}
        userType={userType}
        onNavigateToEntity={onNavigateToEntity}
        onNavigateToFiles={onNavigateToFiles}
        onNavigateToTask={(taskId) => onNavigateToTasks?.(taskId)}
        onNavigateToMaterial={(materialId) => onNavigateToPurchases?.(materialId)}
        onNavigateToRoom={onNavigateToRoom}
      />

      {/* Collapsible planning reference — after planning phase, at bottom */}
      {!isPlanning && (!isInvitedClient || isPlanningContributor) && (
        <CollapsibleSection
          title={t("overview.planningReference", "Planning reference")}
          icon={<FileText className="h-4 w-4" />}
        >
          {planningSection}
        </CollapsibleSection>
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

      <InviteCustomerPlanningDialog
        projectId={project.id}
        projectName={project.name}
        open={inviteCustomerOpen}
        onOpenChange={setInviteCustomerOpen}
      />
    </div>
  );
};

export default OverviewTab;
