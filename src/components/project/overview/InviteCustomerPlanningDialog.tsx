import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, Loader2, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteCustomerPlanningDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteCustomerPlanningDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: InviteCustomerPlanningDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      // Planning contributor permissions: can edit tasks & rooms, nothing else
      const planningPerms = {
        role_type: "planning_contributor",
        timeline_access: "none",
        tasks_access: "edit",
        tasks_scope: "all",
        space_planner_access: "none",
        purchases_access: "none",
        purchases_scope: "assigned",
        overview_access: "view",
        teams_access: "none",
        budget_access: "none",
        files_access: "none",
      };

      const { data: invitationData, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: projectId,
          invited_by_user_id: profile.id,
          email: trimmedEmail,
          role: "client",
          contractor_role: "other",
          delivery_method: "email",
          status: "pending",
          ...planningPerms,
          permissions_snapshot: planningPerms,
        } as Record<string, unknown>)
        .select("id")
        .single();

      if (error) throw error;

      // Send email via Edge Function
      try {
        await supabase.functions.invoke("send-project-invitation", {
          body: { invitationId: invitationData.id },
        });
      } catch (emailErr) {
        console.error("Email send failed (invitation still created):", emailErr);
      }

      setSent(true);
      toast({
        description: t("inviteCustomerPlanning.sent", "Invitation sent to {{email}}", { email: trimmedEmail }),
      });

      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
        setEmail("");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast({ variant: "destructive", description: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) { setSent(false); setEmail(""); }
    }}>
      <DialogContent className="max-w-md">
        {sent ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {t("inviteCustomerPlanning.sentDescription", "The customer will receive an email with a link to fill in their renovation scope.")}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t("inviteCustomerPlanning.title", "Invite customer to plan")}
              </DialogTitle>
              <DialogDescription>
                {t("inviteCustomerPlanning.description", "The customer gets access to add tasks and rooms — nothing else. No pricing, no other tabs.")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-800 space-y-1">
                  <p className="font-medium">{t("inviteCustomerPlanning.whatCustomerSees", "What the customer sees:")}</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li>{t("inviteCustomerPlanning.canAddTasks", "Add and edit tasks (title, description)")}</li>
                    <li>{t("inviteCustomerPlanning.canAddRooms", "Add rooms with dimensions")}</li>
                    <li>{t("inviteCustomerPlanning.canLinkRooms", "Connect tasks to rooms")}</li>
                  </ul>
                  <p className="font-medium mt-2">{t("inviteCustomerPlanning.whatCustomerCantSee", "What they cannot see:")}</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li>{t("inviteCustomerPlanning.noPricing", "No pricing, budget, or cost information")}</li>
                    <li>{t("inviteCustomerPlanning.noOtherTabs", "No other project tabs")}</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("inviteCustomerPlanning.email", "Customer email")}</Label>
                <Input
                  type="email"
                  autoFocus
                  placeholder={t("inviteCustomerPlanning.emailPlaceholder", "customer@email.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim()) handleSend();
                  }}
                />
              </div>

              <Button
                className="w-full gap-1.5"
                onClick={handleSend}
                disabled={sending || !email.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {t("inviteCustomerPlanning.send", "Send invitation")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
