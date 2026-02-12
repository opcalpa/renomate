import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Home, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PermissionsSnapshot {
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

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  project: {
    id: string;
    name: string;
  };
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
  permissions_snapshot?: PermissionsSnapshot | null;
}

const getAccessAbilities = (inv: InvitationDetails, t: (key: string, fallback?: string) => string): string[] => {
  const abilities: string[] = [];
  if (inv.overview_access && inv.overview_access !== "none")
    abilities.push(t("invitation.abilities.viewProgress", "View project progress"));
  if (inv.files_access && inv.files_access !== "none")
    abilities.push(t("invitation.abilities.viewPhotos", "See photos and documents"));
  if (inv.tasks_access === "edit")
    abilities.push(t("invitation.abilities.manageTasks", "Create and manage tasks"));
  else if (inv.tasks_access && inv.tasks_access !== "none")
    abilities.push(t("invitation.abilities.viewTasks", "Follow tasks and progress"));
  if (inv.budget_access && inv.budget_access !== "none")
    abilities.push(t("invitation.abilities.viewBudget", "View budget overview"));
  if (inv.purchases_access && inv.purchases_access !== "none" && inv.purchases_access !== "view")
    abilities.push(t("invitation.abilities.reportMaterials", "Report materials"));
  abilities.push(t("invitation.abilities.comment", "Comment and communicate"));
  return abilities;
};

const InvitationResponse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("project_invitations")
        .select(`
          id,
          email,
          role,
          status,
          project_id,
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
          permissions_snapshot,
          project:projects(id, name)
        `)
        .eq("token", token)
        .single();

      if (fetchError || !data) {
        setError("Invitation not found or expired");
        return;
      }

      // If project join failed (RLS blocks unauthenticated reads), use project_id as fallback
      if (!data.project) {
        (data as any).project = { id: data.project_id, name: "Project" };
      }

      if (data.status === "accepted") {
        setError("This invitation has already been accepted");
        return;
      }

      if (data.status === "rejected") {
        setError("This invitation has been declined");
        return;
      }

      setInvitation(data as any);
    } catch (err: any) {
      console.error("Error fetching invitation:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;

    setAccepting(true);
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=/invitation?token=${token}`);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Verify email matches (normalize Gmail +alias addresses)
      const normalizeEmail = (email: string) =>
        email.toLowerCase().replace(/(\+[^@]*)@/, "@");
      if (normalizeEmail(profile.email) !== normalizeEmail(invitation.email)) {
        throw new Error(`This invitation was sent to ${invitation.email}. Please log in with that email.`);
      }

      // Fetch contractor_role from invitation (requires auth, so done here)
      let contractorRole: string | null = null;
      const { data: invData, error: invError } = await supabase
        .from("project_invitations")
        .select("contractor_role")
        .eq("id", invitation.id)
        .single();

      if (!invError && invData?.contractor_role) {
        contractorRole = invData.contractor_role;
      }

      const isContractor = contractorRole && contractorRole !== 'other';
      const roleType = isContractor ? 'contractor' : 'other';
      const contractorCategory = isContractor ? contractorRole : null;

      // Use permissions_snapshot if available, fallback to individual columns
      const perms = invitation.permissions_snapshot || {};

      const { error: shareError } = await supabase
        .from("project_shares")
        .insert({
          project_id: invitation.project.id,
          shared_with_user_id: profile.id,
          role: invitation.role,
          contractor_role: contractorCategory,
          timeline_access: perms.timeline_access || invitation.timeline_access || 'view',
          tasks_access: perms.tasks_access || invitation.tasks_access || 'view',
          tasks_scope: perms.tasks_scope || invitation.tasks_scope || 'assigned',
          space_planner_access: perms.space_planner_access || invitation.space_planner_access || 'view',
          purchases_access: perms.purchases_access || invitation.purchases_access || 'view',
          purchases_scope: perms.purchases_scope || invitation.purchases_scope || 'assigned',
          overview_access: perms.overview_access || invitation.overview_access || 'view',
          teams_access: perms.teams_access || invitation.teams_access || 'none',
          budget_access: perms.budget_access || invitation.budget_access || 'none',
          files_access: perms.files_access || invitation.files_access || 'none',
        });

      if (shareError) throw shareError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from("project_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Flag profile as invited client — skip WelcomeModal and adapt onboarding
      await supabase
        .from("profiles")
        .update({
          onboarding_welcome_completed: true,
          onboarding_user_type: "invited_client",
        })
        .eq("id", profile.id);

      setAccepted(true);
      toast({
        title: t("invitation.accepted", "Invitation accepted!"),
        description: t("invitation.acceptedDescription", "You now have access to the project."),
      });

      // Redirect to project with welcome flag
      setTimeout(() => {
        navigate(`/projects/${invitation.project.id}?welcome=invited`);
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    try {
      const { error } = await supabase
        .from("project_invitations")
        .update({ status: "rejected" })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation declined",
        description: "You have declined the invitation.",
      });

      navigate("/");
    } catch (err: any) {
      console.error("Error declining invitation:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-success" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
            <CardDescription>Redirecting to project...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const abilities = getAccessAbilities(invitation, t);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {t("invitation.youreInvited", "You're invited!")}
          </CardTitle>
          <CardDescription>
            {t("invitation.invitedToProject", "You've been invited to follow a renovation project")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{invitation.project?.name || "Project"}</h3>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("invitation.youCan", "In this project you can:")}
            </p>
            <ul className="space-y-2">
              {abilities.map((ability, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  {ability}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("invitation.accepting", "Accepting...")}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("invitation.accept", "Accept Invitation")}
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="lg"
              disabled={accepting}
            >
              {t("invitation.decline", "Decline")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationResponse;
