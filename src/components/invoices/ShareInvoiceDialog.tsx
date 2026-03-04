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
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { shareInvoiceWithCustomer } from "@/services/invoiceService";

interface ShareInvoiceDialogProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ShareInvoiceDialog({
  invoiceId,
  open,
  onOpenChange,
  onSuccess,
}: ShareInvoiceDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const success = await shareInvoiceWithCustomer(
        invoiceId,
        email.trim(),
        name.trim() || undefined
      );
      if (success) {
        toast.success(t("invoices.invoiceShared"));
        setEmail("");
        setName("");
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("invoices.shareInvoiceTitle")}</DialogTitle>
            <DialogDescription>
              {t("invoices.shareInvoiceDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-customer-email">
                {t("invoices.customerEmail")}
              </Label>
              <Input
                id="invoice-customer-email"
                type="email"
                required
                placeholder="kund@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-customer-name">
                {t("invoices.customerName")}
              </Label>
              <Input
                id="invoice-customer-name"
                type="text"
                placeholder="Anna Svensson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={sending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t("invoices.sharing")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {t("invoices.shareInvoice")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
