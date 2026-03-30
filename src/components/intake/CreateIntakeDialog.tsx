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
import { Loader2, Copy, Check, Link2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  createIntakeRequest,
  getIntakeFormUrl,
  type IntakeRequest,
} from "@/services/intakeService";
import { IntakeFormPreview } from "./IntakeFormPreview";

interface CreateIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (request: IntakeRequest) => void;
}

export function CreateIntakeDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateIntakeDialogProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<IntakeRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Optional pre-fill fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [greeting, setGreeting] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    try {
      const request = await createIntakeRequest({
        customer_name: customerName.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
        greeting: greeting.trim() || undefined,
      });
      setCreatedRequest(request);
      onCreated(request);
    } catch (error) {
      console.error("Failed to create intake request:", error);
      toast.error(t("common.error"));
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdRequest) return;
    const url = getIntakeFormUrl(createdRequest.token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("intake.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setCreatedRequest(null);
      setCustomerName("");
      setCustomerEmail("");
      setGreeting("");
      setCopied(false);
    }, 200);
  };

  const formUrl = createdRequest ? getIntakeFormUrl(createdRequest.token) : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("intake.createRequest")}</DialogTitle>
          <DialogDescription>
            {createdRequest
              ? t("intake.sendLinkDescription")
              : t("intake.createRequestDescription")}
          </DialogDescription>
        </DialogHeader>

        {!createdRequest ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  {t("intake.name")} ({t("common.optional")})
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t("intake.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">
                  {t("intake.email")} ({t("common.optional")})
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t("intake.emailPlaceholder")}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {t("intake.optionalFieldsHint")}
              </p>

              {/* Preview link */}
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Eye className="h-4 w-4" />
                {t("intake.previewForm")}
              </button>

              {/* Personal greeting */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="greeting">
                  {t("intake.greetingLabel")} ({t("common.optional")})
                </Label>
                <Textarea
                  id="greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder={t("intake.greetingPlaceholder")}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t("intake.greetingHint")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    {t("intake.createRequest")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Success message */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <Check className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">
                  {t("intake.requestCreated")}
                </span>
              </div>

              {/* Link display */}
              <div className="space-y-2">
                <Label>{t("intake.sendLink")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={formUrl}
                    readOnly
                    className="font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
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
                </div>
              </div>

              {/* Instructions */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>{t("intake.sendVia")}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t("intake.viaSms")}</li>
                  <li>{t("intake.viaEmail")}</li>
                  <li>{t("intake.viaMessenger")}</li>
                </ul>
                <p className="mt-2">
                  {t("intake.linkValidity")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {t("common.done")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* Form Preview Dialog */}
      <IntakeFormPreview open={showPreview} onOpenChange={setShowPreview} />
    </Dialog>
  );
}
