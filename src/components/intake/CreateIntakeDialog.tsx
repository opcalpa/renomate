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
import { Loader2, Copy, Check, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  createIntakeRequest,
  getIntakeFormUrl,
  type IntakeRequest,
} from "@/services/intakeService";

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

  // Optional pre-fill fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    try {
      const request = await createIntakeRequest({
        customer_name: customerName.trim() || undefined,
        customer_email: customerEmail.trim() || undefined,
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
                Du kan lämna dessa fält tomma. Kunden fyller i sina uppgifter i formuläret.
              </p>
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
                  Förfrågan skapad! Dela länken med din kund.
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
                <p>Skicka denna länk till din kund via:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>SMS</li>
                  <li>E-post</li>
                  <li>Meddelandeapp (WhatsApp, Messenger, etc.)</li>
                </ul>
                <p className="mt-2">
                  Länken är giltig i 30 dagar. Du får en notifikation när kunden fyller i formuläret.
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
    </Dialog>
  );
}
