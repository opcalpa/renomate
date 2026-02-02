import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { UserPlus, Mail, X, CheckCircle, XCircle, Clock, Loader2, Building2, Eye, Edit3, Plus, Phone, Pencil, Send } from "lucide-react";
import { z } from "zod";

interface TeamMember {
  id: string;
  user_name: string;
  user_email: string;
  role: string;
  role_type: 'contractor' | 'client' | 'other' | null;
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

interface FeatureAccess {
  timeline: 'none' | 'view' | 'edit';
  tasks: 'none' | 'view' | 'edit';
  tasksScope: 'all' | 'assigned';
  spacePlanner: 'none' | 'view' | 'edit';
  purchases: 'none' | 'view' | 'create' | 'edit';
  purchasesScope: 'all' | 'assigned';
  overview: 'none' | 'view' | 'edit';
  teams: 'none' | 'view' | 'invite';
  budget: 'none' | 'view';
  files: 'none' | 'view' | 'upload' | 'edit';
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

const STAKEHOLDER_ROLES = ['contractor', 'client', 'other'];

const CONTRACTOR_CATEGORIES = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'painter', label: 'Painter' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'general_renovator', label: 'General Renovator' },
  { value: 'flooring_specialist', label: 'Flooring Specialist' },
  { value: 'hvac_technician', label: 'HVAC Technician' },
  { value: 'mason', label: 'Mason' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'tiler', label: 'Tiler' },
  { value: 'glazier', label: 'Glazier' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'architect', label: 'Architect' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
];

const ACCESS_LEVELS = ['viewer', 'editor', 'admin', 'material_requester'];

const ROLE_TEMPLATES: Record<string, { label: string; access: FeatureAccess }> = {
  contractor: {
    label: 'Hantverkare',
    access: {
      timeline: 'view',
      tasks: 'edit',
      tasksScope: 'assigned',
      spacePlanner: 'view',
      purchases: 'create',
      purchasesScope: 'assigned',
      overview: 'view',
      teams: 'none',
      budget: 'none',
      files: 'view',
    },
  },
  project_manager: {
    label: 'Projektledare',
    access: {
      timeline: 'edit',
      tasks: 'edit',
      tasksScope: 'all',
      spacePlanner: 'edit',
      purchases: 'edit',
      purchasesScope: 'all',
      overview: 'edit',
      teams: 'invite',
      budget: 'view',
      files: 'edit',
    },
  },
  client: {
    label: 'Kund / Beställare',
    access: {
      timeline: 'view',
      tasks: 'view',
      tasksScope: 'all',
      spacePlanner: 'view',
      purchases: 'view',
      purchasesScope: 'all',
      overview: 'view',
      teams: 'view',
      budget: 'view',
      files: 'view',
    },
  },
  viewer: {
    label: 'Betraktare',
    access: {
      timeline: 'view',
      tasks: 'view',
      tasksScope: 'all',
      spacePlanner: 'view',
      purchases: 'view',
      purchasesScope: 'all',
      overview: 'view',
      teams: 'none',
      budget: 'none',
      files: 'none',
    },
  },
};

const invitationSchemaEmail = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  access_level: z.enum(['viewer', 'editor', 'admin', 'material_requester']),
});

const TeamManagement = ({ projectId, isOwner }: TeamManagementProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [editInvitationDialogOpen, setEditInvitationDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteCompany, setInviteCompany] = useState("");
  const [stakeholderRole, setStakeholderRole] = useState<'contractor' | 'client' | 'other'>('contractor');
  const [contractorCategory, setContractorCategory] = useState("");
  const [accessLevel, setAccessLevel] = useState("viewer");
  const [inviteNotes, setInviteNotes] = useState("");
  
  // Edit member stakeholder fields
  const [editMemberRoleType, setEditMemberRoleType] = useState<'contractor' | 'client' | 'other' | 'none'>('none');
  const [editMemberContractorCategory, setEditMemberContractorCategory] = useState("");
  const [editMemberPhone, setEditMemberPhone] = useState("");
  const [editMemberCompany, setEditMemberCompany] = useState("");
  const [editMemberNotes, setEditMemberNotes] = useState("");
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('contractor');

  // Feature-based access control - default to contractor template
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    ...ROLE_TEMPLATES.contractor.access,
  });

  const { toast } = useToast();
  const { t } = useTranslation();

  const getRoleTemplateLabel = (key: string): string => {
    return t(`roles.roleTemplates.${key}`, key);
  };

  const getContractorCategoryLabel = (value: string): string => {
    return t(`roles.contractorRoles.${value}`, value);
  };

  const detectTemplate = (access: FeatureAccess): string => {
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
    return 'custom';
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey !== 'custom' && ROLE_TEMPLATES[templateKey]) {
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
      // Fetch existing team members with stakeholder fields
      const { data: sharesData, error: sharesError } = await supabase
        .from("project_shares")
        .select(`
          id,
          role,
          role_type,
          contractor_category,
          phone,
          company,
          notes,
          timeline_access,
          tasks_access,
          tasks_scope,
          space_planner_access,
          purchases_access,
          purchases_scope,
          overview_access,
          teams_access,
          budget_access,
          files_access,
          profiles:shared_with_user_id (
            name,
            email
          )
        `)
        .eq("project_id", projectId);

      if (sharesError) throw sharesError;

      const teamMembers = sharesData?.map((share: any) => ({
        id: share.id,
        user_name: share.profiles?.name || "Unknown",
        user_email: share.profiles?.email || "",
        role: share.role,
        contractor_role: share.contractor_category || null,
        timeline_access: share.timeline_access,
        tasks_access: share.tasks_access,
        tasks_scope: share.tasks_scope,
        space_planner_access: share.space_planner_access,
        purchases_access: share.purchases_access,
        purchases_scope: share.purchases_scope,
        overview_access: share.overview_access,
        teams_access: share.teams_access,
        budget_access: share.budget_access,
        files_access: share.files_access,
        role_type: share.role_type,
        contractor_category: share.contractor_category,
        phone: share.phone,
        company: share.company,
        notes: share.notes,
      })) || [];

      setMembers(teamMembers);

      // Fetch pending invitations if owner
      if (isOwner) {
        const { data: invitesData, error: invitesError } = await supabase
          .from("project_invitations")
          .select(`
            id,
            email,
            phone,
            delivery_method,
            role,
            status,
            created_at,
            token,
            timeline_access,
            tasks_access,
            tasks_scope,
            space_planner_access,
            purchases_access,
            purchases_scope,
            overview_access,
            teams_access,
            budget_access,
            files_access
          `)
          .eq("project_id", projectId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (invitesError) {
          console.error("Error fetching invitations:", invitesError);
          throw invitesError;
        }
        // Type assertion needed because Supabase types may not match actual schema
        setInvitations((invitesData || []) as unknown as Invitation[]);
      }
    } catch (error: any) {
      toast({
        title: t('roles.error'),
        description: error.message,
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
      // Validate email input
      const validatedData = invitationSchemaEmail.parse({
          email: inviteEmail,
          access_level: accessLevel,
        });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create invitation - match actual database schema
      const permissionsSnapshot = {
        timeline_access: featureAccess.timeline,
        tasks_access: featureAccess.tasks,
        tasks_scope: featureAccess.tasksScope,
        space_planner_access: featureAccess.spacePlanner,
        purchases_access: featureAccess.purchases,
        purchases_scope: featureAccess.purchasesScope,
        overview_access: featureAccess.overview,
        teams_access: featureAccess.teams,
        budget_access: featureAccess.budget,
        files_access: featureAccess.files,
      };
      const invitationPayload = {
        project_id: projectId,
        invited_by_user_id: profile.id,
        email: validatedData.email,
        role: selectedTemplate !== 'custom' ? selectedTemplate : accessLevel,
        ...permissionsSnapshot,
        permissions_snapshot: permissionsSnapshot,
      };

      const { data: invitationData, error } = await supabase
        .from("project_invitations")
        .insert(invitationPayload as any)
        .select()
        .single();

      if (error) throw error;

      // Send invitation via edge function
      try {
        const { error: sendError } = await supabase.functions.invoke('send-project-invitation', {
          body: { invitationId: invitationData.id },
        });

        if (sendError) {
          console.error("Error sending invitation:", sendError);
          toast({
            title: t('roles.invitationCreated'),
            description: t('roles.invitationCreatedEmailFailed'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('roles.invitationSent'),
            description: t('roles.invitationSentDescription'),
          });
        }
      } catch (sendErr: any) {
        console.error("Send error:", sendErr);
        toast({
          title: t('roles.invitationCreated'),
          description: t('roles.invitationSavedEmailFailed'),
          variant: "destructive",
        });
      }

      setDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteCompany("");
      setStakeholderRole('contractor');
      setContractorCategory("");
      setAccessLevel("viewer");
      setInviteNotes("");
      setSelectedTemplate('contractor');
      setFeatureAccess({ ...ROLE_TEMPLATES.contractor.access });
      fetchTeamData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('roles.validationError'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('roles.error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setInviting(false);
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
        title: t('roles.invitationCancelled'),
        description: t('roles.invitationCancelledDescription'),
      });

      fetchTeamData();
    } catch (error: any) {
      toast({
        title: t('roles.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    const access: FeatureAccess = {
      timeline: (member.timeline_access as any) || 'none',
      tasks: (member.tasks_access as any) || 'none',
      tasksScope: (member.tasks_scope as any) || 'assigned',
      spacePlanner: (member.space_planner_access as any) || 'none',
      purchases: (member.purchases_access as any) || 'none',
      purchasesScope: (member.purchases_scope as any) || 'assigned',
      overview: (member.overview_access as any) || 'none',
      teams: (member.teams_access as any) || 'none',
      budget: (member.budget_access as any) || 'none',
      files: (member.files_access as any) || 'none',
    };
    setFeatureAccess(access);
    setSelectedTemplate(detectTemplate(access));
    setAccessLevel(member.role);
    setEditMemberRoleType(member.role_type || 'none');
    setEditMemberContractorCategory(member.contractor_category || '');
    setEditMemberPhone(member.phone || '');
    setEditMemberCompany(member.company || '');
    setEditMemberNotes(member.notes || '');
    setEditMemberDialogOpen(true);
  };

  const handleSaveMemberEdit = async () => {
    if (!editingMember) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_shares")
        .update({
          role: selectedTemplate !== 'custom' ? selectedTemplate : accessLevel,
          timeline_access: featureAccess.timeline,
          tasks_access: featureAccess.tasks,
          tasks_scope: featureAccess.tasksScope,
          space_planner_access: featureAccess.spacePlanner,
          purchases_access: featureAccess.purchases,
          purchases_scope: featureAccess.purchasesScope,
          overview_access: featureAccess.overview,
          teams_access: featureAccess.teams,
          budget_access: featureAccess.budget,
          files_access: featureAccess.files,
          role_type: editMemberRoleType === 'none' ? null : editMemberRoleType,
          contractor_category: editMemberRoleType === 'contractor' && editMemberContractorCategory ? editMemberContractorCategory : null,
          phone: editMemberPhone || null,
          company: editMemberCompany || null,
          notes: editMemberNotes || null,
        })
        .eq("id", editingMember.id);

      if (error) throw error;

      toast({
        title: t('roles.memberUpdated'),
        description: t('roles.memberUpdatedDescription'),
      });

      setEditMemberDialogOpen(false);
      setEditingMember(null);
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: t('roles.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isOwner) return;
    
    if (!confirm(t('roles.confirmRemoveMember'))) {
      return;
    }

    setDeleting(memberId);
    try {
      const { error } = await supabase
        .from("project_shares")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: t('roles.memberRemoved'),
        description: t('roles.memberRemovedDescription'),
      });

      fetchTeamData();
    } catch (error: any) {
      toast({
        title: t('roles.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleEditInvitation = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    const access: FeatureAccess = {
      timeline: (invitation.timeline_access as any) || 'view',
      tasks: (invitation.tasks_access as any) || 'view',
      tasksScope: (invitation.tasks_scope as any) || 'assigned',
      spacePlanner: (invitation.space_planner_access as any) || 'view',
      purchases: (invitation.purchases_access as any) || 'view',
      purchasesScope: (invitation.purchases_scope as any) || 'assigned',
      overview: (invitation.overview_access as any) || 'view',
      teams: (invitation.teams_access as any) || 'none',
      budget: (invitation.budget_access as any) || 'none',
      files: (invitation.files_access as any) || 'none',
    };
    setFeatureAccess(access);
    setSelectedTemplate(detectTemplate(access));
    setAccessLevel(invitation.role);
    setEditInvitationDialogOpen(true);
  };

  const handleSaveInvitationEdit = async () => {
    if (!editingInvitation) return;
    
    setSaving(true);
    try {
      const permissionsSnapshot = {
        timeline_access: featureAccess.timeline,
        tasks_access: featureAccess.tasks,
        tasks_scope: featureAccess.tasksScope,
        space_planner_access: featureAccess.spacePlanner,
        purchases_access: featureAccess.purchases,
        purchases_scope: featureAccess.purchasesScope,
        overview_access: featureAccess.overview,
        teams_access: featureAccess.teams,
        budget_access: featureAccess.budget,
        files_access: featureAccess.files,
      };
      const { error } = await supabase
        .from("project_invitations")
        .update({
          role: selectedTemplate !== 'custom' ? selectedTemplate : accessLevel,
          ...permissionsSnapshot,
          permissions_snapshot: permissionsSnapshot,
        } as any)
        .eq("id", editingInvitation.id);

      if (error) throw error;

      toast({
        title: t('roles.invitationUpdated'),
        description: t('roles.invitationUpdatedDescription'),
      });

      setEditInvitationDialogOpen(false);
      setEditingInvitation(null);
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: t('roles.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResending(invitationId);
    try {
      const { error } = await supabase.functions.invoke('send-project-invitation', {
        body: { invitationId },
      });

      if (error) {
        throw error;
      }

      toast({
        title: t('roles.invitationResent'),
        description: t('roles.invitationResentDescription'),
      });
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: t('roles.error'),
        description: t('roles.resendFailed'),
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('roles.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('roles.description')}
          </p>
        </div>
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('roles.inviteButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{t('roles.inviteTitle')}</DialogTitle>
                <DialogDescription>
                  {t('roles.inviteDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendInvitation} className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('roles.nameLabel')} *</Label>
                  <Input
                    id="name"
                    placeholder={t('roles.namePlaceholder')}
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('roles.emailLabel')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('roles.emailPlaceholder')}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                  <Label htmlFor="company">{t('roles.companyLabel')}</Label>
                    <Input
                    id="company"
                    placeholder={t('roles.companyInvitePlaceholder')}
                    value={inviteCompany}
                    onChange={(e) => setInviteCompany(e.target.value)}
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="stakeholder-role">{t('roles.roleTypeLabel')} *</Label>
                  <Select value={stakeholderRole} onValueChange={(value: any) => setStakeholderRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">{t('roles.roleType_contractor')}</SelectItem>
                      <SelectItem value="client">{t('roles.roleType_client')}</SelectItem>
                      <SelectItem value="other">{t('roles.roleType_other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {stakeholderRole === 'contractor' && (
                <div className="space-y-2">
                    <Label htmlFor="contractor-category">{t('roles.contractorCategoryLabel')}</Label>
                    <Select value={contractorCategory} onValueChange={setContractorCategory}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('roles.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                        {CONTRACTOR_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {getContractorCategoryLabel(cat.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}

                <Separator className="my-4" />

                {/* Role Template Selector */}
                <div className="space-y-2">
                  <Label htmlFor="role-template">{t('roles.roleTemplateLabel')}</Label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger id="role-template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                        <SelectItem key={key} value={key}>
                          {getRoleTemplateLabel(key)}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">{getRoleTemplateLabel('custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Feature-based Access Control */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('roles.featureAccessTitle')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('roles.featureAccessDescription')}
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureTimeline')}</Label>
                    <RadioGroup
                      value={featureAccess.timeline}
                      onValueChange={(value: any) => handleFeatureAccessChange({ timeline: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="timeline-none" />
                        <Label htmlFor="timeline-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="timeline-view" />
                        <Label htmlFor="timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                  </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="timeline-edit" />
                        <Label htmlFor="timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between space-x-4">
                      <Label className="flex-1">{t('roles.featureTasks')}</Label>
                      <RadioGroup
                        value={featureAccess.tasks}
                        onValueChange={(value: any) => handleFeatureAccessChange({ tasks: value })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="none" id="tasks-none" />
                          <Label htmlFor="tasks-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="view" id="tasks-view" />
                          <Label htmlFor="tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {t('roles.accessView')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="edit" id="tasks-edit" />
                          <Label htmlFor="tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {featureAccess.tasks !== 'none' && (
                      <div className="ml-4 flex items-center gap-2 text-sm">
                        <Label className="text-xs text-muted-foreground">{t('roles.taskScope')}:</Label>
                        <RadioGroup
                          value={featureAccess.tasksScope}
                          onValueChange={(value: any) => handleFeatureAccessChange({ tasksScope: value })}
                          className="flex gap-3"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="all" id="tasks-scope-all" />
                            <Label htmlFor="tasks-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allTasks')}</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="assigned" id="tasks-scope-assigned" />
                            <Label htmlFor="tasks-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedOnly')}</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>

                  {/* Space Planner */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureSpacePlanner')}</Label>
                    <RadioGroup
                      value={featureAccess.spacePlanner}
                      onValueChange={(value: any) => handleFeatureAccessChange({ spacePlanner: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="planner-none" />
                        <Label htmlFor="planner-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="planner-view" />
                        <Label htmlFor="planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="planner-edit" />
                        <Label htmlFor="planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Purchase Orders */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between space-x-4">
                      <Label className="flex-1">{t('roles.featurePurchaseOrders')}</Label>
                      <RadioGroup
                        value={featureAccess.purchases}
                        onValueChange={(value: any) => handleFeatureAccessChange({ purchases: value })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="none" id="purchases-none" />
                          <Label htmlFor="purchases-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="view" id="purchases-view" />
                          <Label htmlFor="purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {t('roles.accessView')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="create" id="purchases-create" />
                          <Label htmlFor="purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Plus className="h-3 w-3" /> {t('roles.accessCreate')}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="edit" id="purchases-edit" />
                          <Label htmlFor="purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {featureAccess.purchases !== 'none' && (
                      <div className="ml-4 flex items-center gap-2 text-sm">
                        <Label className="text-xs text-muted-foreground">{t('roles.orderScope')}:</Label>
                        <RadioGroup
                          value={featureAccess.purchasesScope}
                          onValueChange={(value: any) => handleFeatureAccessChange({ purchasesScope: value })}
                          className="flex gap-3"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="all" id="purchases-scope-all" />
                            <Label htmlFor="purchases-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allOrders')}</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="assigned" id="purchases-scope-assigned" />
                            <Label htmlFor="purchases-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedCreatedOnly')}</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureOverview')}</Label>
                    <RadioGroup
                      value={featureAccess.overview}
                      onValueChange={(value: any) => handleFeatureAccessChange({ overview: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="overview-none" />
                        <Label htmlFor="overview-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="overview-view" />
                        <Label htmlFor="overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="overview-edit" />
                        <Label htmlFor="overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Teams Management */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureTeamManagement')}</Label>
                    <RadioGroup
                      value={featureAccess.teams}
                      onValueChange={(value: any) => handleFeatureAccessChange({ teams: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="teams-none" />
                        <Label htmlFor="teams-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="teams-view" />
                        <Label htmlFor="teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="invite" id="teams-invite" />
                        <Label htmlFor="teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <UserPlus className="h-3 w-3" /> {t('roles.accessInvite')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureBudget')}</Label>
                    <RadioGroup
                      value={featureAccess.budget}
                      onValueChange={(value: any) => handleFeatureAccessChange({ budget: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="budget-none" />
                        <Label htmlFor="budget-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="budget-view" />
                        <Label htmlFor="budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Files */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">{t('roles.featureFiles')}</Label>
                    <RadioGroup
                      value={featureAccess.files}
                      onValueChange={(value: any) => handleFeatureAccessChange({ files: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="files-none" />
                        <Label htmlFor="files-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="files-view" />
                        <Label htmlFor="files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {t('roles.accessView')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="upload" id="files-upload" />
                        <Label htmlFor="files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Plus className="h-3 w-3" /> {t('roles.accessUpload')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="files-edit" />
                        <Label htmlFor="files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="notes">{t('roles.notesLabel')}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t('roles.notesPlaceholder')}
                    value={inviteNotes}
                    onChange={(e) => setInviteNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? t('roles.sending') : t('roles.sendInvitation')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('roles.teamMembers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">{t('common.name')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('roles.roleLabel_role')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('roles.roleTypeLabel', 'Role Type')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('roles.featureAccessTitle', 'Feature Access')}</th>
                    {isOwner && <th className="pb-2 font-medium w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const accessEntries = [
                      { label: t('roles.featureTimeline'), value: member.timeline_access },
                      { label: t('roles.featureTasks'), value: member.tasks_access, scope: member.tasks_scope },
                      { label: t('roles.featureSpacePlanner'), value: member.space_planner_access },
                      { label: t('roles.featurePurchaseOrders'), value: member.purchases_access, scope: member.purchases_scope },
                      { label: t('roles.featureOverview'), value: member.overview_access },
                      { label: t('roles.featureBudget'), value: member.budget_access },
                      { label: t('roles.featureFiles'), value: member.files_access },
                      { label: t('roles.featureTeams'), value: member.teams_access },
                    ].filter((e) => e.value && e.value !== 'none');

                    return (
                      <tr key={member.id} className="border-b border-border/50 last:border-b-0">
                        <td className="py-3 pr-4 align-top">
                          <p className="font-medium">{member.user_name}</p>
                          <p className="text-xs text-muted-foreground">{member.user_email}</p>
                          {(member.company || member.phone) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                              {member.company && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {member.company}
                                </span>
                              )}
                              {member.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {member.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <Badge variant="outline" className="capitalize">
                            {member.role}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          {member.role_type ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant={member.role_type === 'contractor' ? 'default' : member.role_type === 'client' ? 'secondary' : 'outline'}>
                                {member.role_type}
                              </Badge>
                              {member.contractor_category && (
                                <span className="text-xs text-muted-foreground">
                                  {getContractorCategoryLabel(member.contractor_category)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 align-top">
                          {accessEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {accessEntries.map((e) => (
                                <Badge key={e.label} variant="secondary" className="text-[11px] font-normal">
                                  {e.label}: {e.value}{e.scope ? ` (${e.scope})` : ''}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t('roles.accessNone')}</span>
                          )}
                        </td>
                        {isOwner && (
                          <td className="py-3 align-top">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditMember(member)}
                                title={t('roles.editMember')}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={deleting === member.id}
                                title={t('roles.removeMember')}
                              >
                                {deleting === member.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed: All Team Stakeholders section - merged into Team Members */}

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('roles.pendingInvitations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {invitation.email}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {invitation.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invitation.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.id)}
                      disabled={resending === invitation.id}
                      title={t('roles.resendInvitationEmail')}
                    >
                      {resending === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditInvitation(invitation)}
                      title={t('roles.editInvitationPermissions')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      title={t('roles.cancelInvitationTitle')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('roles.editMemberTitle')}</DialogTitle>
            <DialogDescription>
              {t('roles.editMemberDescription', { name: editingMember?.user_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('roles.roleLabel_role')}</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Role Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="edit-role-template">{t('roles.roleTemplateLabel')}</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger id="edit-role-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                    <SelectItem key={key} value={key}>
                      {getRoleTemplateLabel(key)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{getRoleTemplateLabel('custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Feature-based Access Control - Same as invite dialog */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t('roles.featureAccessTitle')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('roles.featureAccessDescription')}
                </p>
              </div>

              {/* Timeline */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureTimeline')}</Label>
                <RadioGroup
                  value={featureAccess.timeline}
                  onValueChange={(value: any) => handleFeatureAccessChange({ timeline: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-timeline-none" />
                    <Label htmlFor="edit-timeline-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-timeline-view" />
                    <Label htmlFor="edit-timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-timeline-edit" />
                    <Label htmlFor="edit-timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">{t('roles.featureTasks')}</Label>
                  <RadioGroup
                    value={featureAccess.tasks}
                    onValueChange={(value: any) => handleFeatureAccessChange({ tasks: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-tasks-none" />
                      <Label htmlFor="edit-tasks-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-tasks-view" />
                      <Label htmlFor="edit-tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {t('roles.accessView')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-tasks-edit" />
                      <Label htmlFor="edit-tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.tasks !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">{t('roles.taskScope')}:</Label>
                    <RadioGroup
                      value={featureAccess.tasksScope}
                      onValueChange={(value: any) => handleFeatureAccessChange({ tasksScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-tasks-scope-all" />
                        <Label htmlFor="edit-tasks-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allTasks')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-tasks-scope-assigned" />
                        <Label htmlFor="edit-tasks-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedOnly')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Space Planner */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureSpacePlanner')}</Label>
                <RadioGroup
                  value={featureAccess.spacePlanner}
                  onValueChange={(value: any) => handleFeatureAccessChange({ spacePlanner: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-planner-none" />
                    <Label htmlFor="edit-planner-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-planner-view" />
                    <Label htmlFor="edit-planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-planner-edit" />
                    <Label htmlFor="edit-planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Purchase Orders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">{t('roles.featurePurchaseOrders')}</Label>
                  <RadioGroup
                    value={featureAccess.purchases}
                    onValueChange={(value: any) => handleFeatureAccessChange({ purchases: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-purchases-none" />
                      <Label htmlFor="edit-purchases-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-purchases-view" />
                      <Label htmlFor="edit-purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {t('roles.accessView')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="create" id="edit-purchases-create" />
                      <Label htmlFor="edit-purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Plus className="h-3 w-3" /> {t('roles.accessCreate')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-purchases-edit" />
                      <Label htmlFor="edit-purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.purchases !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">{t('roles.orderScope')}:</Label>
                    <RadioGroup
                      value={featureAccess.purchasesScope}
                      onValueChange={(value: any) => handleFeatureAccessChange({ purchasesScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-purchases-scope-all" />
                        <Label htmlFor="edit-purchases-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allOrders')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-purchases-scope-assigned" />
                        <Label htmlFor="edit-purchases-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedCreatedOnly')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureOverview')}</Label>
                <RadioGroup
                  value={featureAccess.overview}
                  onValueChange={(value: any) => handleFeatureAccessChange({ overview: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-overview-none" />
                    <Label htmlFor="edit-overview-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-overview-view" />
                    <Label htmlFor="edit-overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-overview-edit" />
                    <Label htmlFor="edit-overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Teams Management */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureTeamManagement')}</Label>
                <RadioGroup
                  value={featureAccess.teams}
                  onValueChange={(value: any) => handleFeatureAccessChange({ teams: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-teams-none" />
                    <Label htmlFor="edit-teams-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-teams-view" />
                    <Label htmlFor="edit-teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="invite" id="edit-teams-invite" />
                    <Label htmlFor="edit-teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> {t('roles.accessInvite')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Budget */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureBudget')}</Label>
                <RadioGroup
                  value={featureAccess.budget}
                  onValueChange={(value: any) => handleFeatureAccessChange({ budget: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-budget-none" />
                    <Label htmlFor="edit-budget-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-budget-view" />
                    <Label htmlFor="edit-budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Files */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureFiles')}</Label>
                <RadioGroup
                  value={featureAccess.files}
                  onValueChange={(value: any) => handleFeatureAccessChange({ files: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-files-none" />
                    <Label htmlFor="edit-files-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-files-view" />
                    <Label htmlFor="edit-files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="upload" id="edit-files-upload" />
                    <Label htmlFor="edit-files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Plus className="h-3 w-3" /> {t('roles.accessUpload')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-files-edit" />
                    <Label htmlFor="edit-files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Stakeholder Information */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('roles.additionalInfo')}</h4>

            <div className="space-y-2">
              <Label htmlFor="edit-role-type">{t('roles.roleTypeLabel')}</Label>
              <Select
                value={editMemberRoleType}
                onValueChange={(value: any) => {
                  setEditMemberRoleType(value);
                  if (value !== 'contractor') {
                    setEditMemberContractorCategory('');
                  }
                }}
              >
                <SelectTrigger id="edit-role-type">
                  <SelectValue placeholder={t('roles.selectRoleType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('roles.roleType_none')}</SelectItem>
                  <SelectItem value="contractor">{t('roles.roleType_contractor')}</SelectItem>
                  <SelectItem value="client">{t('roles.roleType_client')}</SelectItem>
                  <SelectItem value="other">{t('roles.roleType_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editMemberRoleType === 'contractor' && (
              <div className="space-y-2">
                <Label htmlFor="edit-contractor-category">{t('roles.contractorCategoryLabel')}</Label>
                <Select
                  value={editMemberContractorCategory}
                  onValueChange={setEditMemberContractorCategory}
                >
                  <SelectTrigger id="edit-contractor-category">
                    <SelectValue placeholder={t('roles.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTOR_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {getContractorCategoryLabel(category.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('roles.phoneLabel')}</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder={t('roles.phonePlaceholder')}
                value={editMemberPhone}
                onChange={(e) => setEditMemberPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company">{t('roles.companyLabel')}</Label>
              <Input
                id="edit-company"
                placeholder={t('roles.companyPlaceholder')}
                value={editMemberCompany}
                onChange={(e) => setEditMemberCompany(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t('roles.notesLabel')}</Label>
              <Textarea
                id="edit-notes"
                placeholder={t('roles.notesPlaceholder')}
                value={editMemberNotes}
                onChange={(e) => setEditMemberNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          </div>

          <div className="flex gap-3 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)} disabled={saving}>
              {t('roles.cancel')}
            </Button>
            <Button onClick={handleSaveMemberEdit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('roles.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invitation Dialog */}
      <Dialog open={editInvitationDialogOpen} onOpenChange={setEditInvitationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('roles.editInvitationTitle')}</DialogTitle>
            <DialogDescription>
              {t('roles.editInvitationDescription', { email: editingInvitation?.email })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-inv-role">{t('roles.roleLabel_role')}</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger id="edit-inv-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Role Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="edit-inv-role-template">{t('roles.roleTemplateLabel')}</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger id="edit-inv-role-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_TEMPLATES).map(([key, tmpl]) => (
                    <SelectItem key={key} value={key}>
                      {getRoleTemplateLabel(key)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">{getRoleTemplateLabel('custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reuse same permission UI */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t('roles.featureAccessTitle')}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('roles.featureAccessInvitationDescription')}
                </p>
              </div>

              {/* Same permission controls as member edit - Timeline, Tasks, etc. */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureTimeline')}</Label>
                <RadioGroup
                  value={featureAccess.timeline}
                  onValueChange={(value: any) => handleFeatureAccessChange({ timeline: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-timeline-none" />
                    <Label htmlFor="edit-inv-timeline-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-timeline-view" />
                    <Label htmlFor="edit-inv-timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-timeline-edit" />
                    <Label htmlFor="edit-inv-timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">{t('roles.featureTasks')}</Label>
                  <RadioGroup
                    value={featureAccess.tasks}
                    onValueChange={(value: any) => handleFeatureAccessChange({ tasks: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-inv-tasks-none" />
                      <Label htmlFor="edit-inv-tasks-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-inv-tasks-view" />
                      <Label htmlFor="edit-inv-tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {t('roles.accessView')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-inv-tasks-edit" />
                      <Label htmlFor="edit-inv-tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.tasks !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">{t('roles.taskScope')}:</Label>
                    <RadioGroup
                      value={featureAccess.tasksScope}
                      onValueChange={(value: any) => handleFeatureAccessChange({ tasksScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-inv-tasks-scope-all" />
                        <Label htmlFor="edit-inv-tasks-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allTasks')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-inv-tasks-scope-assigned" />
                        <Label htmlFor="edit-inv-tasks-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedOnly')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Space Planner */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureSpacePlanner')}</Label>
                <RadioGroup
                  value={featureAccess.spacePlanner}
                  onValueChange={(value: any) => handleFeatureAccessChange({ spacePlanner: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-planner-none" />
                    <Label htmlFor="edit-inv-planner-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-planner-view" />
                    <Label htmlFor="edit-inv-planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-planner-edit" />
                    <Label htmlFor="edit-inv-planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Purchase Orders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">{t('roles.featurePurchaseOrders')}</Label>
                  <RadioGroup
                    value={featureAccess.purchases}
                    onValueChange={(value: any) => handleFeatureAccessChange({ purchases: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-inv-purchases-none" />
                      <Label htmlFor="edit-inv-purchases-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-inv-purchases-view" />
                      <Label htmlFor="edit-inv-purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {t('roles.accessView')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="create" id="edit-inv-purchases-create" />
                      <Label htmlFor="edit-inv-purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Plus className="h-3 w-3" /> {t('roles.accessCreate')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-inv-purchases-edit" />
                      <Label htmlFor="edit-inv-purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.purchases !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">{t('roles.orderScope')}:</Label>
                    <RadioGroup
                      value={featureAccess.purchasesScope}
                      onValueChange={(value: any) => handleFeatureAccessChange({ purchasesScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-inv-purchases-scope-all" />
                        <Label htmlFor="edit-inv-purchases-scope-all" className="text-xs cursor-pointer font-normal">{t('roles.allOrders')}</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-inv-purchases-scope-assigned" />
                        <Label htmlFor="edit-inv-purchases-scope-assigned" className="text-xs cursor-pointer font-normal">{t('roles.assignedCreatedOnly')}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureOverview')}</Label>
                <RadioGroup
                  value={featureAccess.overview}
                  onValueChange={(value: any) => handleFeatureAccessChange({ overview: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-overview-none" />
                    <Label htmlFor="edit-inv-overview-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-overview-view" />
                    <Label htmlFor="edit-inv-overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-overview-edit" />
                    <Label htmlFor="edit-inv-overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Teams Management */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureTeamManagement')}</Label>
                <RadioGroup
                  value={featureAccess.teams}
                  onValueChange={(value: any) => handleFeatureAccessChange({ teams: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-teams-none" />
                    <Label htmlFor="edit-inv-teams-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-teams-view" />
                    <Label htmlFor="edit-inv-teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="invite" id="edit-inv-teams-invite" />
                    <Label htmlFor="edit-inv-teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> {t('roles.accessInvite')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Budget */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureBudget')}</Label>
                <RadioGroup
                  value={featureAccess.budget}
                  onValueChange={(value: any) => handleFeatureAccessChange({ budget: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-budget-none" />
                    <Label htmlFor="edit-inv-budget-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-budget-view" />
                    <Label htmlFor="edit-inv-budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Files */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">{t('roles.featureFiles')}</Label>
                <RadioGroup
                  value={featureAccess.files}
                  onValueChange={(value: any) => handleFeatureAccessChange({ files: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-files-none" />
                    <Label htmlFor="edit-inv-files-none" className="text-xs cursor-pointer font-normal">{t('roles.accessNone')}</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-files-view" />
                    <Label htmlFor="edit-inv-files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t('roles.accessView')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="upload" id="edit-inv-files-upload" />
                    <Label htmlFor="edit-inv-files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Plus className="h-3 w-3" /> {t('roles.accessUpload')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-files-edit" />
                    <Label htmlFor="edit-inv-files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> {t('roles.accessEdit')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditInvitationDialogOpen(false)} disabled={saving}>
              {t('roles.cancel')}
            </Button>
            <Button onClick={handleSaveInvitationEdit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('roles.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {members.length === 0 && invitations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('roles.noMembers')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('roles.noMembersDescription')}
            </p>
            {isOwner && (
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('roles.inviteButton')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagement;
