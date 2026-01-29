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
  
  // Feature-based access control
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>({
    timeline: 'view',
    tasks: 'view',
    tasksScope: 'assigned',
    spacePlanner: 'view',
    purchases: 'view',
    purchasesScope: 'assigned',
    overview: 'view',
    teams: 'none',
    budget: 'none',
    files: 'none',
  });

  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: "Error",
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
      const invitationPayload = {
        project_id: projectId,
        invited_by_user_id: profile.id,
        email: validatedData.email, // Database uses 'email', not 'invited_email'
        role: accessLevel, // Database uses 'role'
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
            title: "Invitation created",
            description: "Invitation created but email could not be sent. Please check logs.",
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
          title: "Invitation created",
          description: "Invitation saved but email failed to send.",
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
      setFeatureAccess({
        timeline: 'view',
        tasks: 'view',
        tasksScope: 'assigned',
        spacePlanner: 'view',
        purchases: 'view',
        purchasesScope: 'assigned',
        overview: 'view',
        teams: 'none',
      });
      fetchTeamData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
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
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });

      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setFeatureAccess({
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
    });
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
          role: accessLevel,
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
        title: "Member updated",
        description: "Team member has been updated.",
      });

      setEditMemberDialogOpen(false);
      setEditingMember(null);
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isOwner) return;
    
    if (!confirm("Are you sure you want to remove this team member from the project?")) {
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
        title: "Member removed",
        description: "Team member has been removed from the project.",
      });

      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleEditInvitation = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setFeatureAccess({
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
    });
    setAccessLevel(invitation.role);
    setEditInvitationDialogOpen(true);
  };

  const handleSaveInvitationEdit = async () => {
    if (!editingInvitation) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("project_invitations")
        .update({
          role: accessLevel,
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
        } as any)
        .eq("id", editingInvitation.id);

      if (error) throw error;

      toast({
        title: "Invitation updated",
        description: "Invitation permissions have been updated.",
      });

      setEditInvitationDialogOpen(false);
      setEditingInvitation(null);
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
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
        title: "Invitation resent",
        description: "The invitation email has been sent again.",
      });
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
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
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
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
                  <Label htmlFor="company">Company</Label>
                    <Input
                    id="company"
                    placeholder="ABC Construction"
                    value={inviteCompany}
                    onChange={(e) => setInviteCompany(e.target.value)}
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="stakeholder-role">Role Type *</Label>
                  <Select value={stakeholderRole} onValueChange={(value: any) => setStakeholderRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {stakeholderRole === 'contractor' && (
                <div className="space-y-2">
                    <Label htmlFor="contractor-category">Contractor Category</Label>
                    <Select value={contractorCategory} onValueChange={setContractorCategory}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {CONTRACTOR_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}

                <Separator className="my-4" />

                {/* Feature-based Access Control */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Feature Access Permissions</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose which features this user can access and their permission level
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Timeline</Label>
                    <RadioGroup
                      value={featureAccess.timeline}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, timeline: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="timeline-none" />
                        <Label htmlFor="timeline-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="timeline-view" />
                        <Label htmlFor="timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                  </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="timeline-edit" />
                        <Label htmlFor="timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between space-x-4">
                      <Label className="flex-1">Tasks</Label>
                      <RadioGroup
                        value={featureAccess.tasks}
                        onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasks: value })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="none" id="tasks-none" />
                          <Label htmlFor="tasks-none" className="text-xs cursor-pointer font-normal">None</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="view" id="tasks-view" />
                          <Label htmlFor="tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="edit" id="tasks-edit" />
                          <Label htmlFor="tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> Edit
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {featureAccess.tasks !== 'none' && (
                      <div className="ml-4 flex items-center gap-2 text-sm">
                        <Label className="text-xs text-muted-foreground">Task Scope:</Label>
                        <RadioGroup
                          value={featureAccess.tasksScope}
                          onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasksScope: value })}
                          className="flex gap-3"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="all" id="tasks-scope-all" />
                            <Label htmlFor="tasks-scope-all" className="text-xs cursor-pointer font-normal">All Tasks</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="assigned" id="tasks-scope-assigned" />
                            <Label htmlFor="tasks-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned Only</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>

                  {/* Space Planner */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Space Planner</Label>
                    <RadioGroup
                      value={featureAccess.spacePlanner}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, spacePlanner: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="planner-none" />
                        <Label htmlFor="planner-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="planner-view" />
                        <Label htmlFor="planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="planner-edit" />
                        <Label htmlFor="planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Purchase Orders */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between space-x-4">
                      <Label className="flex-1">Purchase Orders</Label>
                      <RadioGroup
                        value={featureAccess.purchases}
                        onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchases: value })}
                        className="flex gap-2"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="none" id="purchases-none" />
                          <Label htmlFor="purchases-none" className="text-xs cursor-pointer font-normal">None</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="view" id="purchases-view" />
                          <Label htmlFor="purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="create" id="purchases-create" />
                          <Label htmlFor="purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Create
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="edit" id="purchases-edit" />
                          <Label htmlFor="purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> Edit
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {featureAccess.purchases !== 'none' && (
                      <div className="ml-4 flex items-center gap-2 text-sm">
                        <Label className="text-xs text-muted-foreground">Order Scope:</Label>
                        <RadioGroup
                          value={featureAccess.purchasesScope}
                          onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchasesScope: value })}
                          className="flex gap-3"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="all" id="purchases-scope-all" />
                            <Label htmlFor="purchases-scope-all" className="text-xs cursor-pointer font-normal">All Orders</Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="assigned" id="purchases-scope-assigned" />
                            <Label htmlFor="purchases-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned/Created Only</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Overview</Label>
                    <RadioGroup
                      value={featureAccess.overview}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, overview: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="overview-none" />
                        <Label htmlFor="overview-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="overview-view" />
                        <Label htmlFor="overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="overview-edit" />
                        <Label htmlFor="overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Teams Management */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Team Management</Label>
                    <RadioGroup
                      value={featureAccess.teams}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, teams: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="teams-none" />
                        <Label htmlFor="teams-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="teams-view" />
                        <Label htmlFor="teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="invite" id="teams-invite" />
                        <Label htmlFor="teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <UserPlus className="h-3 w-3" /> Invite
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Budget</Label>
                    <RadioGroup
                      value={featureAccess.budget}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, budget: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="budget-none" />
                        <Label htmlFor="budget-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="budget-view" />
                        <Label htmlFor="budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Files */}
                  <div className="flex items-center justify-between space-x-4">
                    <Label className="flex-1">Files</Label>
                    <RadioGroup
                      value={featureAccess.files}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, files: value })}
                      className="flex gap-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="none" id="files-none" />
                        <Label htmlFor="files-none" className="text-xs cursor-pointer font-normal">None</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="view" id="files-view" />
                        <Label htmlFor="files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="upload" id="files-upload" />
                        <Label htmlFor="files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Upload
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="edit" id="files-edit" />
                        <Label htmlFor="files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional information..."
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
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{member.user_name}</p>
                    <p className="text-sm text-muted-foreground">{member.user_email}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                      {member.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {member.company}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.role_type && (
                        <Badge variant={member.role_type === 'contractor' ? 'default' : member.role_type === 'client' ? 'secondary' : 'outline'}>
                          {member.role_type}
                        </Badge>
                      )}
                      {member.contractor_category && (
                        <Badge variant="outline" className="text-xs">
                          {CONTRACTOR_CATEGORIES.find(c => c.value === member.contractor_category)?.label || member.contractor_category}
                        </Badge>
                      )}
                      {member.timeline_access && member.timeline_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Timeline: {member.timeline_access}
                      </Badge>
                    )}
                      {member.tasks_access && member.tasks_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Tasks: {member.tasks_access} ({member.tasks_scope})
                        </Badge>
                      )}
                      {member.space_planner_access && member.space_planner_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Planner: {member.space_planner_access}
                        </Badge>
                      )}
                      {member.purchases_access && member.purchases_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Purchase Orders: {member.purchases_access} ({member.purchases_scope})
                        </Badge>
                      )}
                      {member.overview_access && member.overview_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Overview: {member.overview_access}
                        </Badge>
                      )}
                      {member.budget_access && member.budget_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Budget: {member.budget_access}
                        </Badge>
                      )}
                      {member.files_access && member.files_access !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          Files: {member.files_access}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                    {isOwner && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                          title="Edit member"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                          disabled={deleting === member.id}
                          title="Remove member"
                        >
                          {deleting === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Removed: All Team Stakeholders section - merged into Team Members */}

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
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
                      title="Resend invitation email"
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
                      title="Edit invitation permissions"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      title="Cancel invitation"
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
            <DialogTitle>Edit Team Member Permissions</DialogTitle>
            <DialogDescription>
              Update access permissions for {editingMember?.user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
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

            {/* Feature-based Access Control - Same as invite dialog */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Feature Access Permissions</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which features this user can access and their permission level
                </p>
              </div>

              {/* Timeline */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Timeline</Label>
                <RadioGroup
                  value={featureAccess.timeline}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, timeline: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-timeline-none" />
                    <Label htmlFor="edit-timeline-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-timeline-view" />
                    <Label htmlFor="edit-timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-timeline-edit" />
                    <Label htmlFor="edit-timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">Tasks</Label>
                  <RadioGroup
                    value={featureAccess.tasks}
                    onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasks: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-tasks-none" />
                      <Label htmlFor="edit-tasks-none" className="text-xs cursor-pointer font-normal">None</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-tasks-view" />
                      <Label htmlFor="edit-tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-tasks-edit" />
                      <Label htmlFor="edit-tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Edit
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.tasks !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">Task Scope:</Label>
                    <RadioGroup
                      value={featureAccess.tasksScope}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasksScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-tasks-scope-all" />
                        <Label htmlFor="edit-tasks-scope-all" className="text-xs cursor-pointer font-normal">All Tasks</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-tasks-scope-assigned" />
                        <Label htmlFor="edit-tasks-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Space Planner */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Space Planner</Label>
                <RadioGroup
                  value={featureAccess.spacePlanner}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, spacePlanner: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-planner-none" />
                    <Label htmlFor="edit-planner-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-planner-view" />
                    <Label htmlFor="edit-planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-planner-edit" />
                    <Label htmlFor="edit-planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Purchase Orders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">Purchase Orders</Label>
                  <RadioGroup
                    value={featureAccess.purchases}
                    onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchases: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-purchases-none" />
                      <Label htmlFor="edit-purchases-none" className="text-xs cursor-pointer font-normal">None</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-purchases-view" />
                      <Label htmlFor="edit-purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="create" id="edit-purchases-create" />
                      <Label htmlFor="edit-purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Create
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-purchases-edit" />
                      <Label htmlFor="edit-purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Edit
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.purchases !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">Order Scope:</Label>
                    <RadioGroup
                      value={featureAccess.purchasesScope}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchasesScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-purchases-scope-all" />
                        <Label htmlFor="edit-purchases-scope-all" className="text-xs cursor-pointer font-normal">All Orders</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-purchases-scope-assigned" />
                        <Label htmlFor="edit-purchases-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned/Created Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Overview</Label>
                <RadioGroup
                  value={featureAccess.overview}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, overview: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-overview-none" />
                    <Label htmlFor="edit-overview-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-overview-view" />
                    <Label htmlFor="edit-overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-overview-edit" />
                    <Label htmlFor="edit-overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Teams Management */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Team Management</Label>
                <RadioGroup
                  value={featureAccess.teams}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, teams: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-teams-none" />
                    <Label htmlFor="edit-teams-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-teams-view" />
                    <Label htmlFor="edit-teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="invite" id="edit-teams-invite" />
                    <Label htmlFor="edit-teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> Invite
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Budget */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Budget</Label>
                <RadioGroup
                  value={featureAccess.budget}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, budget: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-budget-none" />
                    <Label htmlFor="edit-budget-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-budget-view" />
                    <Label htmlFor="edit-budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Files */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Files</Label>
                <RadioGroup
                  value={featureAccess.files}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, files: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-files-none" />
                    <Label htmlFor="edit-files-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-files-view" />
                    <Label htmlFor="edit-files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="upload" id="edit-files-upload" />
                    <Label htmlFor="edit-files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Upload
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-files-edit" />
                    <Label htmlFor="edit-files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stakeholder Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Additional Information</h4>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role-type">Role Type</Label>
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
                  <SelectValue placeholder="Select role type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editMemberRoleType === 'contractor' && (
              <div className="space-y-2">
                <Label htmlFor="edit-contractor-category">Contractor Category</Label>
                <Select 
                  value={editMemberContractorCategory} 
                  onValueChange={setEditMemberContractorCategory}
                >
                  <SelectTrigger id="edit-contractor-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTOR_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="+46 70 123 45 67"
                value={editMemberPhone}
                onChange={(e) => setEditMemberPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                placeholder="Company name"
                value={editMemberCompany}
                onChange={(e) => setEditMemberCompany(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional information..."
                value={editMemberNotes}
                onChange={(e) => setEditMemberNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveMemberEdit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invitation Dialog */}
      <Dialog open={editInvitationDialogOpen} onOpenChange={setEditInvitationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Invitation Permissions</DialogTitle>
            <DialogDescription>
              Update access permissions for invitation to {editingInvitation?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-inv-role">Role</Label>
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

            {/* Reuse same permission UI */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Feature Access Permissions</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  These permissions will apply when the invitation is accepted
                </p>
              </div>

              {/* Same permission controls as member edit - Timeline, Tasks, etc. */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Timeline</Label>
                <RadioGroup
                  value={featureAccess.timeline}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, timeline: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-timeline-none" />
                    <Label htmlFor="edit-inv-timeline-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-timeline-view" />
                    <Label htmlFor="edit-inv-timeline-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-timeline-edit" />
                    <Label htmlFor="edit-inv-timeline-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">Tasks</Label>
                  <RadioGroup
                    value={featureAccess.tasks}
                    onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasks: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-inv-tasks-none" />
                      <Label htmlFor="edit-inv-tasks-none" className="text-xs cursor-pointer font-normal">None</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-inv-tasks-view" />
                      <Label htmlFor="edit-inv-tasks-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-inv-tasks-edit" />
                      <Label htmlFor="edit-inv-tasks-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Edit
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.tasks !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">Task Scope:</Label>
                    <RadioGroup
                      value={featureAccess.tasksScope}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, tasksScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-inv-tasks-scope-all" />
                        <Label htmlFor="edit-inv-tasks-scope-all" className="text-xs cursor-pointer font-normal">All Tasks</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-inv-tasks-scope-assigned" />
                        <Label htmlFor="edit-inv-tasks-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Space Planner */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Space Planner</Label>
                <RadioGroup
                  value={featureAccess.spacePlanner}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, spacePlanner: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-planner-none" />
                    <Label htmlFor="edit-inv-planner-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-planner-view" />
                    <Label htmlFor="edit-inv-planner-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-planner-edit" />
                    <Label htmlFor="edit-inv-planner-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Purchase Orders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between space-x-4">
                  <Label className="flex-1">Purchase Orders</Label>
                  <RadioGroup
                    value={featureAccess.purchases}
                    onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchases: value })}
                    className="flex gap-2"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="none" id="edit-inv-purchases-none" />
                      <Label htmlFor="edit-inv-purchases-none" className="text-xs cursor-pointer font-normal">None</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="view" id="edit-inv-purchases-view" />
                      <Label htmlFor="edit-inv-purchases-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="create" id="edit-inv-purchases-create" />
                      <Label htmlFor="edit-inv-purchases-create" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Create
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="edit" id="edit-inv-purchases-edit" />
                      <Label htmlFor="edit-inv-purchases-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Edit
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {featureAccess.purchases !== 'none' && (
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <Label className="text-xs text-muted-foreground">Order Scope:</Label>
                    <RadioGroup
                      value={featureAccess.purchasesScope}
                      onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, purchasesScope: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="all" id="edit-inv-purchases-scope-all" />
                        <Label htmlFor="edit-inv-purchases-scope-all" className="text-xs cursor-pointer font-normal">All Orders</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="assigned" id="edit-inv-purchases-scope-assigned" />
                        <Label htmlFor="edit-inv-purchases-scope-assigned" className="text-xs cursor-pointer font-normal">Assigned/Created Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Overview</Label>
                <RadioGroup
                  value={featureAccess.overview}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, overview: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-overview-none" />
                    <Label htmlFor="edit-inv-overview-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-overview-view" />
                    <Label htmlFor="edit-inv-overview-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-overview-edit" />
                    <Label htmlFor="edit-inv-overview-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Teams Management */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Team Management</Label>
                <RadioGroup
                  value={featureAccess.teams}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, teams: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-teams-none" />
                    <Label htmlFor="edit-inv-teams-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-teams-view" />
                    <Label htmlFor="edit-inv-teams-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="invite" id="edit-inv-teams-invite" />
                    <Label htmlFor="edit-inv-teams-invite" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <UserPlus className="h-3 w-3" /> Invite
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Budget */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Budget</Label>
                <RadioGroup
                  value={featureAccess.budget}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, budget: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-budget-none" />
                    <Label htmlFor="edit-inv-budget-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-budget-view" />
                    <Label htmlFor="edit-inv-budget-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Files */}
              <div className="flex items-center justify-between space-x-4">
                <Label className="flex-1">Files</Label>
                <RadioGroup
                  value={featureAccess.files}
                  onValueChange={(value: any) => setFeatureAccess({ ...featureAccess, files: value })}
                  className="flex gap-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="none" id="edit-inv-files-none" />
                    <Label htmlFor="edit-inv-files-none" className="text-xs cursor-pointer font-normal">None</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="view" id="edit-inv-files-view" />
                    <Label htmlFor="edit-inv-files-view" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="upload" id="edit-inv-files-upload" />
                    <Label htmlFor="edit-inv-files-upload" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Upload
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="edit" id="edit-inv-files-edit" />
                    <Label htmlFor="edit-inv-files-edit" className="text-xs cursor-pointer font-normal flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditInvitationDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveInvitationEdit} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
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
