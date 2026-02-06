import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  Mail,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pencil,
  Send,
  ChevronRight,
  Wrench,
  ClipboardList,
  User,
  Eye,
} from "lucide-react";
import { z } from "zod";
import { FeatureAccessEditor } from "./team/FeatureAccessEditor";
import type { FeatureAccess } from "./team/FeatureAccessEditor";

interface TeamMember {
  id: string;
  user_name: string;
  user_email: string;
  role: string;
  role_type: "contractor" | "client" | "other" | null;
  contractor_category: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  timeline_access?: string;
  tasks_access?: string;
  tasks_scope?: string;
  space_planner_access?: string;
  purchases_access?: string;
  purchases_scope?: string;
  overview_access?: string;
  teams_access?: string;
  budget_access?: string;
  files_access?: string;
}

interface Invitation {
  id: string;
  email: string;
  phone?: string;
  delivery_method: string;
  role: string;
  status: string;
  created_at: string;
  token: string;
  timeline_access?: string;
  tasks_access?: string;
  tasks_scope?: string;
  space_planner_access?: string;
  purchases_access?: string;
  purchases_scope?: string;
  overview_access?: string;
  teams_access?: string;
  budget_access?: string;
  files_access?: string;
}

interface TeamManagementProps {
  projectId: string;
  isOwner: boolean;
}

const ROLE_TEMPLATES: Record<string, { access: FeatureAccess }> = {
  contractor: {
    access: {
      timeline: "view",
      tasks: "edit",
      tasksScope: "assigned",
      spacePlanner: "view",
      purchases: "create",
      purchasesScope: "assigned",
      overview: "view",
      teams: "none",
      budget: "none",
      files: "view",
    },
  },
  project_manager: {
    access: {
      timeline: "edit",
      tasks: "edit",
      tasksScope: "all",
      spacePlanner: "edit",
      purchases: "edit",
      purchasesScope: "all",
      overview: "edit",
      teams: "invite",
      budget: "view",
      files: "edit",
    },
  },
  client: {
    access: {
      timeline: "view",
      tasks: "view",
      tasksScope: "all",
      spacePlanner: "view",
      purchases: "view",
      purchasesScope: "all",
      overview: "view",
      teams: "view",
      budget: "view",
      files: "view",
    },
  },
  viewer: {
    access: {
      timeline: "view",
      tasks: "view",
      tasksScope: "all",
      spacePlanner: "view",
      purchases: "view",
      purchasesScope: "all",
      overview: "view",
      teams: "none",
      budget: "none",
      files: "none",
    },
  },
};

const ROLE_ICONS: Record<string, typeof Wrench> = {
  contractor: Wrench,
  project_manager: ClipboardList,
  client: User,
  viewer: Eye,
};

const invitationSchemaEmail = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255),
});

function accessToDb(access: FeatureAccess) {
  return {
    timeline_access: access.timeline,
    tasks_access: access.tasks,
    tasks_scope: access.tasksScope,
    space_planner_access: access.spacePlanner,
    purchases_access: access.purchases,
    purchases_scope: access.purchasesScope,
    overview_access: access.overview,
    teams_access: access.teams,
    budget_access: access.budget,
    files_access: access.files,
  };
}

function dbToAccess(
  source: Partial<Record<string, string | null | undefined>>,
  fallback: "none" | "view" = "none"
): FeatureAccess {
  return {
    timeline: (source.timeline_access as FeatureAccess["timeline"]) || fallback,
    tasks: (source.tasks_access as FeatureAccess["tasks"]) || fallback,
    tasksScope: (source.tasks_scope as FeatureAccess["tasksScope"]) || "assigned",
    spacePlanner: (source.space_planner_access as FeatureAccess["spacePlanner"]) || fallback,
    purchases: (source.purchases_access as FeatureAccess["purchases"]) || fallback,
    purchasesScope: (source.purchases_scope as FeatureAccess["purchasesScope"]) || "assigned",
    overview: (source.overview_access as FeatureAccess["overview"]) || fallback,
    teams: (source.teams_access as FeatureAccess["teams"]) || "none",
    budget: (source.budget_access as FeatureAccess["budget"]) || "none",
    files: (source.files_access as FeatureAccess["files"]) || "none",
  };
}

function detectTemplate(access: FeatureAccess): string {
  for (const [key, template] of Object.entries(ROLE_TEMPLATES)) {
    const t = template.access;
    if (
      access.timeline === t.timeline &&
      access.tasks === t.tasks &&
      access.tasksScope === t.tasksScope &&
      access.spacePlanner === t.spacePlanner &&
      access.purchases === t.purchases &&
      access.purchasesScope === t.purchasesScope &&
      access.overview === t.overview &&
      access.teams === t.teams &&
      access.budget === t.budget &&
      access.files === t.files
    ) {
      return key;
    }
  }
  return "custom";
}

const TeamManagement = ({ projectId, isOwner }: TeamManagementProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    | { type: "member"; data: TeamMember }
    | { type: "invitation"; data: Invitation }
    | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("contractor");
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    ...ROLE_TEMPLATES.contractor.access,
  });

  const { toast } = useToast();
  const { t } = useTranslation();

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey !== "custom" && ROLE_TEMPLATES[templateKey]) {
      setFeatureAccess({ ...ROLE_TEMPLATES[templateKey].access });
    }
  };

  const handleFeatureAccessChange = (updates: Partial<FeatureAccess>) => {
    const newAccess = { ...featureAccess, ...updates };
    setFeatureAccess(newAccess);
    setSelectedTemplate(detectTemplate(newAccess));
  };

  useEffect(() => {
    fetchTeamData();
  }, [projectId]);

  const fetchTeamData = async () => {
    try {
      const { data: sharesData, error: sharesError } = await supabase
        .from("project_shares")
        .select(
          `id, role, role_type, contractor_category, phone, company, notes,
          timeline_access, tasks_access, tasks_scope, space_planner_access,
          purchases_access, purchases_scope, overview_access, teams_access,
          budget_access, files_access,
          profiles:shared_with_user_id ( name, email )`
        )
        .eq("project_id", projectId);

      if (sharesError) throw sharesError;

      const teamMembers: TeamMember[] =
        (sharesData as unknown as Array<Record<string, unknown>>)?.map(
          (share) => {
            const profiles = share.profiles as Record<string, string> | null;
            return {
              id: share.id as string,
              user_name: profiles?.name || "Unknown",
              user_email: profiles?.email || "",
              role: share.role as string,
              role_type: share.role_type as TeamMember["role_type"],
              contractor_category: share.contractor_category as string | null,
              phone: share.phone as string | null,
              company: share.company as string | null,
              notes: share.notes as string | null,
              timeline_access: share.timeline_access as string | undefined,
              tasks_access: share.tasks_access as string | undefined,
              tasks_scope: share.tasks_scope as string | undefined,
              space_planner_access: share.space_planner_access as string | undefined,
              purchases_access: share.purchases_access as string | undefined,
              purchases_scope: share.purchases_scope as string | undefined,
              overview_access: share.overview_access as string | undefined,
              teams_access: share.teams_access as string | undefined,
              budget_access: share.budget_access as string | undefined,
              files_access: share.files_access as string | undefined,
            };
          }
        ) || [];

      setMembers(teamMembers);

      if (isOwner) {
        const { data: invitesData, error: invitesError } = await supabase
          .from("project_invitations")
          .select(
            `id, email, phone, delivery_method, role, status, created_at, token,
            timeline_access, tasks_access, tasks_scope, space_planner_access,
            purchases_access, purchases_scope, overview_access, teams_access,
            budget_access, files_access`
          )
          .eq("project_id", projectId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (invitesError) throw invitesError;
        setInvitations((invitesData || []) as unknown as Invitation[]);
      }
    } catch (error: unknown) {
      toast({
        title: t("roles.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const validated = invitationSchemaEmail.parse({ email: inviteEmail });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      const permDb = accessToDb(featureAccess);
      const { data: invitationData, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: projectId,
          invited_by_user_id: profile.id,
          email: validated.email,
          invited_name: inviteName.trim() || null,
          role: selectedTemplate !== "custom" ? selectedTemplate : "viewer",
          ...permDb,
          permissions_snapshot: permDb,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      try {
        const { error: sendError } = await supabase.functions.invoke(
          "send-project-invitation",
          { body: { invitationId: invitationData.id } }
        );
        if (sendError) {
          console.error("Error sending invitation:", sendError);
          toast({
            title: t("roles.invitationCreated"),
            description: t("roles.invitationCreatedEmailFailed"),
            variant: "destructive",
          });
        } else {
          toast({
            title: t("roles.invitationSent"),
            description: t("roles.invitationSentDescription"),
          });
        }
      } catch (sendErr: unknown) {
        console.error("Send error:", sendErr);
        toast({
          title: t("roles.invitationCreated"),
          description: t("roles.invitationSavedEmailFailed"),
          variant: "destructive",
        });
      }

      setDialogOpen(false);
      setInviteName("");
      setInviteEmail("");
      setSelectedTemplate("contractor");
      setFeatureAccess({ ...ROLE_TEMPLATES.contractor.access });
      fetchTeamData();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: t("roles.validationError"),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("roles.error"),
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    } finally {
      setInviting(false);
    }
  };

  const openEditDialog = (
    target:
      | { type: "member"; data: TeamMember }
      | { type: "invitation"; data: Invitation }
  ) => {
    setEditTarget(target);
    const access = dbToAccess(
      target.data,
      target.type === "invitation" ? "view" : "none"
    );
    setFeatureAccess(access);
    setSelectedTemplate(detectTemplate(access));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);

    try {
      const permDb = accessToDb(featureAccess);
      const role = selectedTemplate !== "custom" ? selectedTemplate : "viewer";

      if (editTarget.type === "member") {
        const { error } = await supabase
          .from("project_shares")
          .update({ role, ...permDb })
          .eq("id", editTarget.data.id);
        if (error) throw error;
        toast({
          title: t("roles.memberUpdated"),
          description: t("roles.memberUpdatedDescription"),
        });
      } else {
        const { error } = await supabase
          .from("project_invitations")
          .update({
            role,
            ...permDb,
            permissions_snapshot: permDb,
          } as Record<string, unknown>)
          .eq("id", editTarget.data.id);
        if (error) throw error;
        toast({
          title: t("roles.invitationUpdated"),
          description: t("roles.invitationUpdatedDescription"),
        });
      }

      setEditDialogOpen(false);
      setEditTarget(null);
      fetchTeamData();
    } catch (error: unknown) {
      toast({
        title: t("roles.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isOwner || !confirm(t("roles.confirmRemoveMember"))) return;
    setDeleting(memberId);
    try {
      const { error } = await supabase
        .from("project_shares")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
      toast({
        title: t("roles.memberRemoved"),
        description: t("roles.memberRemovedDescription"),
      });
      fetchTeamData();
    } catch (error: unknown) {
      toast({
        title: t("roles.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("project_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
      toast({
        title: t("roles.invitationCancelled"),
        description: t("roles.invitationCancelledDescription"),
      });
      fetchTeamData();
    } catch (error: unknown) {
      toast({
        title: t("roles.error"),
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResending(invitationId);
    try {
      const { error } = await supabase.functions.invoke(
        "send-project-invitation",
        { body: { invitationId } }
      );
      if (error) throw error;
      toast({
        title: t("roles.invitationResent"),
        description: t("roles.invitationResentDescription"),
      });
    } catch (error: unknown) {
      console.error("Error resending invitation:", error);
      toast({
        title: t("roles.error"),
        description: t("roles.resendFailed"),
        variant: "destructive",
      });
    } finally {
      setResending(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "expired":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getMemberRoleLabel = (member: TeamMember): string => {
    const detected = detectTemplate(dbToAccess(member));
    if (detected !== "custom") {
      return t(`roles.roleTemplates.${detected}`);
    }
    return t("roles.roleTemplates.custom");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("roles.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("roles.description")}
          </p>
        </div>
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("roles.inviteButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{t("roles.inviteTitle")}</DialogTitle>
                <DialogDescription>
                  {t("roles.inviteDescription")}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSendInvitation}
                className="space-y-5 overflow-y-auto flex-1 pr-2"
              >
                {/* Name (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="invite-name">{t("roles.nameLabel")}</Label>
                  <Input
                    id="invite-name"
                    placeholder={t("roles.namePlaceholder")}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="invite-email">
                    {t("roles.emailLabel")} *
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={t("roles.emailPlaceholder")}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Role Cards */}
                <div className="space-y-2">
                  <Label>{t("roles.selectRole")}</Label>
                  <RoleCardGrid
                    selected={selectedTemplate}
                    onSelect={handleTemplateChange}
                    t={t}
                  />
                </div>

                {/* More info - collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                    {t("roles.moreInfo")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <RoleInfoPanel
                      templateKey={selectedTemplate}
                      t={t}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Customize permissions - collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                    {t("roles.customizeAccess")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-3">
                      <FeatureAccessEditor
                        featureAccess={featureAccess}
                        onChange={handleFeatureAccessChange}
                        idPrefix="invite"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={inviting}>
                    {inviting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("roles.sendInvitation")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members — Card Layout */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("roles.teamMembers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                  {member.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.user_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                  {(member.company || member.phone) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[member.company, member.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {getMemberRoleLabel(member)}
                  {member.contractor_category && (
                    <span className="text-xs">
                      {" · "}
                      {t(`roles.contractorRoles.${member.contractor_category}`, member.contractor_category)}
                    </span>
                  )}
                </span>
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        openEditDialog({ type: "member", data: member })
                      }
                      title={t("roles.editMember")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteMember(member.id)}
                      disabled={deleting === member.id}
                      title={t("roles.removeMember")}
                    >
                      {deleting === member.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("roles.pendingInvitations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg"
              >
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {t(
                      `roles.roleTemplates.${invitation.role}`,
                      invitation.role
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(invitation.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleResendInvitation(invitation.id)}
                    disabled={resending === invitation.id}
                    title={t("roles.resendInvitationEmail")}
                  >
                    {resending === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      openEditDialog({ type: "invitation", data: invitation })
                    }
                    title={t("roles.editInvitationPermissions")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    title={t("roles.cancelInvitationTitle")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unified Edit Dialog (members + invitations) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editTarget?.type === "member"
                ? t("roles.editMemberTitle")
                : t("roles.editInvitationTitle")}
            </DialogTitle>
            <DialogDescription>
              {editTarget?.type === "member"
                ? t("roles.editMemberDescription", {
                    name: (editTarget.data as TeamMember).user_name,
                  })
                : t("roles.editInvitationDescription", {
                    email: (editTarget?.data as Invitation)?.email,
                  })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 overflow-y-auto flex-1 pr-2">
            {/* Role Cards */}
            <div className="space-y-2">
              <Label>{t("roles.selectRole")}</Label>
              <RoleCardGrid
                selected={selectedTemplate}
                onSelect={handleTemplateChange}
                t={t}
              />
            </div>

            {/* Customize permissions */}
            <Collapsible defaultOpen={selectedTemplate === "custom"}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                {t("roles.customizeAccess")}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-3">
                  <FeatureAccessEditor
                    featureAccess={featureAccess}
                    onChange={handleFeatureAccessChange}
                    idPrefix="edit"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex gap-3 pt-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              {t("roles.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("roles.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {members.length === 0 && invitations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t("roles.noMembers")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("roles.noMembersDescription")}
            </p>
            {isOwner && (
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("roles.inviteButton")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ── Role Card Grid ─────────────────────────────────────────── */

interface RoleCardGridProps {
  selected: string;
  onSelect: (key: string) => void;
  t: (key: string, fallback?: string) => string;
}

function RoleCardGrid({ selected, onSelect, t }: RoleCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.keys(ROLE_TEMPLATES).map((key) => {
        const Icon = ROLE_ICONS[key] || User;
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Icon
              className={`h-5 w-5 mb-1.5 ${
                isSelected ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div className="font-medium text-sm">
              {t(`roles.roleTemplates.${key}`, key)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {t(`roles.cards.${key}.description`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Role Info Panel ────────────────────────────────────────── */

const ACCESS_LABEL_KEYS: Record<string, string> = {
  none: "roles.accessNone",
  view: "roles.accessView",
  edit: "roles.accessEdit",
  create: "roles.accessCreate",
  upload: "roles.accessUpload",
  invite: "roles.accessInvite",
};

const FEATURE_LABEL_KEYS = [
  { key: "timeline" as const, labelKey: "roles.featureTimeline" },
  { key: "tasks" as const, labelKey: "roles.featureTasks" },
  { key: "spacePlanner" as const, labelKey: "roles.featureSpacePlanner" },
  { key: "purchases" as const, labelKey: "roles.featurePurchaseOrders" },
  { key: "overview" as const, labelKey: "roles.featureOverview" },
  { key: "teams" as const, labelKey: "roles.featureTeamManagement" },
  { key: "budget" as const, labelKey: "roles.featureBudget" },
  { key: "files" as const, labelKey: "roles.featureFiles" },
];

interface RoleInfoPanelProps {
  templateKey: string;
  t: (key: string, fallback?: string) => string;
}

function RoleInfoPanel({ templateKey, t }: RoleInfoPanelProps) {
  const template =
    ROLE_TEMPLATES[templateKey]?.access || ROLE_TEMPLATES.contractor.access;

  return (
    <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
      {FEATURE_LABEL_KEYS.map(({ key, labelKey }) => {
        const level = template[key];
        if (level === "none") return null;
        return (
          <div key={key} className="flex justify-between">
            <span className="text-muted-foreground">{t(labelKey)}</span>
            <span className="font-medium">
              {t(ACCESS_LABEL_KEYS[level] || level)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default TeamManagement;
