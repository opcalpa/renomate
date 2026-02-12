import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  createIntakeRequest,
  getIntakeFormUrl,
  sendIntakeFormEmail,
} from "@/services/intakeService";

interface SendCustomerFormDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendCustomerFormDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  onSuccess,
}: SendCustomerFormDialogProps) {
  const { t } = useTranslation();
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    if (!customerEmail.trim()) {
      toast.error(t("intake.emailRequired"));
      return;
    }

    setSending(true);

    try {
      // Create intake request linked to this project
      const intake = await createIntakeRequest({
        customer_email: customerEmail.trim(),
        customer_name: customerName.trim() || undefined,
        project_id: projectId,
      });

      const url = getIntakeFormUrl(intake.token);
      setFormUrl(url);

      // Try to send email, but don't fail if it doesn't work
      try {
        await sendIntakeFormEmail(
          intake.id,
          customerEmail.trim(),
          customerName.trim() || undefined
        );
        toast.success(t("intake.formSent"));
      } catch (emailError) {
        console.error("Failed to send email, but form was created:", emailError);
        toast.success(t("intake.formCreated"));
      }

      onSuccess?.();
    } catch (error) {
      console.error("Failed to send customer form:", error);
      toast.error(t("intake.sendError"));
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!formUrl) return;

    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      toast.success(t("intake.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("errors.generic"));
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setCustomerEmail("");
    setCustomerName("");
    setMessage("");
    setFormUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("intake.sendCustomerForm")}
          </DialogTitle>
          <DialogDescription>
            {t("intake.sendCustomerFormDescription", { project: projectName })}
          </DialogDescription>
        </DialogHeader>

        {formUrl ? (
          // Success state - show link
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                {t("intake.formSentTo", { email: customerEmail })}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("intake.formLink")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formUrl}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(formUrl, "_blank")}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("intake.formSentInfo")}
            </p>
          </div>
        ) : (
          // Input state
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail">{t("intake.customerEmail")} *</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="kund@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">{t("intake.customerName")}</Label>
              <Input
                id="customerName"
                placeholder={t("intake.customerNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={sending}
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p>{t("intake.whatCustomerWillFill")}:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>{t("intake.formItem.contactInfo")}</li>
                <li>{t("intake.formItem.propertyInfo")}</li>
                <li>{t("intake.formItem.rooms")}</li>
                <li>{t("intake.formItem.workTypes")}</li>
                <li>{t("intake.formItem.timeline")}</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {formUrl ? (
            <Button onClick={handleClose} className="w-full">
              {t("common.done")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSend} disabled={sending || !customerEmail.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("intake.sending")}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t("intake.sendForm")}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
