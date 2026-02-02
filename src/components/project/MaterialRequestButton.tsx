import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MaterialRequestButtonProps {
  materialId: string;
  materialName: string;
  existingRequestStatus?: string | null;
  canCreateRequests: boolean;
}

const MaterialRequestButton = ({ 
  materialId, 
  materialName,
  existingRequestStatus,
  canCreateRequests 
}: MaterialRequestButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("purchase_requests")
        .insert({
          material_id: materialId,
          requested_by_user_id: profile.id,
          notes: notes.trim() || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: t('purchases.requestSubmitted', 'Request Submitted'),
        description: t('purchases.requestSubmittedDescription', 'Your purchase request has been submitted for approval.'),
      });

      setDialogOpen(false);
      setNotes("");
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (existingRequestStatus) {
    const statusConfig = {
      pending: { color: "secondary", text: t('purchases.requestPending', 'Request Pending') },
      approved: { color: "default", text: t('materialStatuses.approved') },
      rejected: { color: "destructive", text: t('materialStatuses.declined') },
    };

    const config = statusConfig[existingRequestStatus as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.color as any} className="cursor-default">
        {config.text}
      </Badge>
    );
  }

  if (!canCreateRequests) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ShoppingCart className="h-4 w-4 mr-2" />
          {t('purchases.requestPurchase', 'Request Purchase')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('purchases.requestPurchaseApproval', 'Request Purchase Approval')}</DialogTitle>
          <DialogDescription>
            {t('purchases.submitRequestFor', 'Submit a purchase request for:')} <strong>{materialName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="request-notes">{t('common.notes')} ({t('common.optional')})</Label>
            <Textarea
              id="request-notes"
              placeholder={t('purchases.addInfoPlaceholder', 'Add any additional information about this purchase request...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {t('purchases.explainWhy', 'Explain why this material is needed or any specific requirements.')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('purchases.submitting', 'Submitting...')}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('purchases.submitRequest', 'Submit Request')}
                </>
              )}
            </Button>
            <Button
              onClick={() => setDialogOpen(false)}
              variant="outline"
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaterialRequestButton;
