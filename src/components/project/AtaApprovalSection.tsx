import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Send, Copy, Loader2 } from "lucide-react";

interface AtaApprovalSectionProps {
  taskId: string;
  projectId: string;
  ataStatus: string | null;
}

export function AtaApprovalSection({ taskId, projectId, ataStatus }: AtaApprovalSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);

  const handleSendForApproval = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create approval token
      const { data: tokenData, error } = await supabase
        .from("ata_approval_tokens")
        .insert({
          task_id: taskId,
          project_id: projectId,
          created_by_user_id: profile.id,
        })
        .select("token")
        .single();

      if (error) throw error;

      // Update task status
      await supabase
        .from("tasks")
        .update({ ata_status: "pending" })
        .eq("id", taskId);

      const link = `${window.location.origin}/ata/${tokenData.token}`;
      setApprovalLink(link);

      toast({ description: t("ata.linkCreated", "Approval link created") });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create link";
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (approvalLink) {
      navigator.clipboard.writeText(approvalLink);
      toast({ description: t("common.copied", "Copied to clipboard") });
    }
  };

  // Already approved
  if (ataStatus === "approved") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
        <Check className="h-4 w-4" />
        {t("ata.approved", "ÄTA approved by customer")}
      </div>
    );
  }

  // Rejected
  if (ataStatus === "rejected") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
        <X className="h-4 w-4" />
        {t("ata.rejected", "ÄTA rejected by customer")}
      </div>
    );
  }

  // Pending
  if (ataStatus === "pending" && !approvalLink) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
        <Send className="h-4 w-4" />
        {t("ata.pendingApproval", "Waiting for customer approval")}
      </div>
    );
  }

  // Link just created
  if (approvalLink) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          <Send className="h-4 w-4" />
          {t("ata.pendingApproval", "Waiting for customer approval")}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={approvalLink}
            className="flex-1 text-xs bg-muted px-2 py-1.5 rounded border text-muted-foreground"
          />
          <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
            <Copy className="h-3.5 w-3.5 mr-1" />
            {t("common.copy", "Copy")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("ata.sendLinkInstruction", "Send this link to your customer via SMS, email or chat.")}
        </p>
      </div>
    );
  }

  // Not sent yet — show send button
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={handleSendForApproval}
      disabled={sending}
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
      {t("ata.sendForApproval", "Send for customer approval")}
    </Button>
  );
}
