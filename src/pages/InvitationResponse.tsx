import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

const InvitationResponse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      const { data, error } = await supabase
        .from("project_invitations")
        .select(`
          id,
          email,
          role,
          status,
          timeline_access,
          tasks_access,
          tasks_scope,
          space_planner_access,
          purchases_access,
          purchases_scope,
          overview_access,
          project:projects(id, name)
        `)
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Invitation not found or expired");
        return;
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

      // Create project share
      const { error: shareError } = await supabase
        .from("project_shares")
        .insert({
          project_id: invitation.project.id,
          shared_with_user_id: profile.id,
          role: invitation.role,
          timeline_access: invitation.timeline_access || 'view',
          tasks_access: invitation.tasks_access || 'view',
          tasks_scope: invitation.tasks_scope || 'assigned',
          space_planner_access: invitation.space_planner_access || 'view',
          purchases_access: invitation.purchases_access || 'view',
          purchases_scope: invitation.purchases_scope || 'assigned',
          overview_access: invitation.overview_access || 'view',
        });

      if (shareError) throw shareError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from("project_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      setAccepted(true);
      toast({
        title: "Invitation accepted!",
        description: "You now have access to the project.",
      });

      // Redirect to project after 2 seconds
      setTimeout(() => {
        navigate(`/projects/${invitation.project.id}`);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">🏠 Project Invitation</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a renovation project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{invitation.project.name}</h3>
            <p className="text-sm text-muted-foreground">
              Invited as: <Badge className="ml-2">{invitation.role}</Badge>
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Your Access Permissions</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {invitation.timeline_access && invitation.timeline_access !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeline:</span>
                  <Badge variant="outline">{invitation.timeline_access}</Badge>
                </div>
              )}
              {invitation.tasks_access && invitation.tasks_access !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks:</span>
                  <Badge variant="outline">
                    {invitation.tasks_access} ({invitation.tasks_scope})
                  </Badge>
                </div>
              )}
              {invitation.space_planner_access && invitation.space_planner_access !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Space Planner:</span>
                  <Badge variant="outline">{invitation.space_planner_access}</Badge>
                </div>
              )}
              {invitation.purchases_access && invitation.purchases_access !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Orders:</span>
                  <Badge variant="outline">
                    {invitation.purchases_access} ({invitation.purchases_scope})
                  </Badge>
                </div>
              )}
              {invitation.overview_access && invitation.overview_access !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overview:</span>
                  <Badge variant="outline">{invitation.overview_access}</Badge>
                </div>
              )}
            </div>
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
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button
              onClick={handleDecline}
              variant="outline"
              size="lg"
              disabled={accepting}
            >
              Decline
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By accepting, you'll gain access to this project with the permissions shown above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationResponse;
