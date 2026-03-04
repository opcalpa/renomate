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
import { shareQuoteWithCustomer } from "@/services/quoteService";

interface ShareQuoteDialogProps {
  quoteId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ShareQuoteDialog({
  quoteId,
  open,
  onOpenChange,
  onSuccess,
}: ShareQuoteDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const success = await shareQuoteWithCustomer(
        quoteId,
        email.trim(),
        name.trim() || undefined
      );
      if (success) {
        toast.success(t("quotes.quoteShared"));
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
            <DialogTitle>{t("quotes.shareQuoteTitle")}</DialogTitle>
            <DialogDescription>
              {t("quotes.shareQuoteDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-email">
                {t("quotes.customerEmail")}
              </Label>
              <Input
                id="customer-email"
                type="email"
                required
                placeholder="kund@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                {t("quotes.customerName")}
              </Label>
              <Input
                id="customer-name"
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
                  {t("quotes.sharing")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  {t("quotes.shareQuote")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
