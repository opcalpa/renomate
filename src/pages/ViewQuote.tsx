import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AppHeader } from "@/components/AppHeader";
import { updateQuoteStatus, createTasksFromQuote } from "@/services/quoteService";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Download, Trash2, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface QuoteData {
  id: string;
  title: string;
  status: string;
  project_id: string;
  creator_id: string;
  total_amount: number;
  total_rot_deduction: number;
  total_after_rot: number;
  created_at: string;
  free_text: string | null;
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  is_rot_eligible: boolean;
  rot_deduction: number;
  sort_order: number;
}

interface CreatorProfile {
  name: string;
  company_name: string | null;
  avatar_url: string | null;
  org_number: string | null;
  company_address: string | null;
  company_postal_code: string | null;
  company_city: string | null;
  email: string | null;
  phone: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-700",
};

export default function ViewQuote() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthSession();

  // Check if we came from a project
  const returnTo = searchParams.get("returnTo");

  const [userName, setUserName] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserName(data.name ?? undefined);
          setAvatarUrl(data.avatar_url ?? undefined);
        }
      });
    setUserEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!quoteId) return;
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    if (!quoteId) return;

    const { data: q, error: qErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (qErr || !q) {
      setLoading(false);
      return;
    }

    setQuote(q as QuoteData);

    const [itemsRes, creatorRes, projectRes] = await Promise.all([
      supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("name, company_name, avatar_url, org_number, company_address, company_postal_code, company_city, email, phone")
        .eq("id", q.creator_id)
        .single(),
      supabase
        .from("projects")
        .select("name")
        .eq("id", q.project_id)
        .single(),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as QuoteItem[]);
    if (creatorRes.data) setCreator(creatorRes.data as CreatorProfile);
    if (projectRes.data) setProjectName(projectRes.data.name);

    // Check if current user owns this quote
    if (user) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (myProfile && myProfile.id === q.creator_id) {
        setIsOwner(true);
      }
    }

    setLoading(false);
  };

  const handleAccept = async () => {
    if (!quote || !quoteId) return;
    setActing(true);

    const result = await updateQuoteStatus(quoteId, "accepted");
    if (!result) {
      setActing(false);
      return;
    }

    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    setQuote({ ...quote, status: "accepted" });

    await createTasksFromQuote(quoteId);

    // Post comment about acceptance
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await supabase.from("comments").insert({
          entity_id: quoteId,
          entity_type: "quote",
          project_id: quote.project_id,
          content: t("quotes.quoteAcceptedMessage", {
            name: profile.name,
            title: quote.title,
          }),
          created_by_user_id: profile.id,
        });
      }
    }

    toast.success(t("quotes.quoteAccepted"));
    setActing(false);
  };

  const handleDecline = async () => {
    if (!quote || !quoteId) return;
    setActing(true);

    const result = await updateQuoteStatus(quoteId, "rejected");
    if (!result) {
      setActing(false);
      return;
    }

    setQuote({ ...quote, status: "rejected" });
    setShowChat(true);
    toast(t("quotes.quoteDeclined"));
    setActing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t("common.notFound", "Quote not found")}</p>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + (i.total_price ?? 0), 0);
  const vat = Math.round(subtotal * 0.25 * 100) / 100;
  const totalRot = items.reduce((s, i) => s + (i.rot_deduction ?? 0), 0);
  const totalToPay = subtotal + vat - totalRot;

  const isSent = quote.status === "sent";

  const handleDelete = async () => {
    if (!quoteId) return;
    // Delete items first, then quote
    await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
    if (error) {
      console.error("Failed to delete quote:", error);
      toast.error(t("errors.generic"));
    } else {
      toast.success(t("quotes.quoteDeleted"));
      navigate("/projects");
    }
    setConfirmDelete(false);
  };

  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pw = 190; // page width usable
    let y = 20;

    // Header
    doc.setFontSize(16);
    doc.text(creator?.company_name || creator?.name || "Renomate", 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(new Date(quote.created_at).toLocaleDateString("sv-SE"), 15, y);
    y += 10;

    // Title
    doc.setFontSize(14);
    doc.text(quote.title, 15, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`${t("quotes.quoteFor")} ${projectName}`, 15, y);
    y += 10;

    // Table header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(t("quotes.description"), 15, y);
    doc.text(t("quotes.quantity"), 115, y, { align: "right" });
    doc.text(t("quotes.unitPrice"), 145, y, { align: "right" });
    doc.text(t("quotes.totalAmount"), 195, y, { align: "right" });
    y += 2;
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    // Items
    for (const item of items) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(item.description || "—", 15, y, { maxWidth: 90 });
      doc.text(`${item.quantity} ${item.unit}`, 115, y, { align: "right" });
      doc.text(`${item.unit_price.toLocaleString()} kr`, 145, y, { align: "right" });
      doc.text(`${item.total_price.toLocaleString()} kr`, 195, y, { align: "right" });
      y += 6;
    }

    // Free text
    if (quote.free_text) {
      y += 4;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(quote.free_text, pw);
      doc.text(lines, 15, y);
      y += lines.length * 4 + 4;
    }

    // Summary
    y += 4;
    doc.line(15, y, 195, y);
    y += 6;
    doc.text(t("quotes.subtotal"), 15, y);
    doc.text(`${subtotal.toLocaleString()} kr`, 195, y, { align: "right" });
    y += 5;
    doc.text(t("quotes.vat"), 15, y);
    doc.text(`${vat.toLocaleString()} kr`, 195, y, { align: "right" });
    y += 5;
    if (totalRot > 0) {
      doc.text(t("quotes.rotDeduction"), 15, y);
      doc.text(`-${totalRot.toLocaleString()} kr`, 195, y, { align: "right" });
      y += 5;
    }
    doc.setFont("helvetica", "bold");
    doc.text(t("quotes.totalToPay"), 15, y);
    doc.text(`${totalToPay.toLocaleString()} kr`, 195, y, { align: "right" });

    // Footer — company contact info
    if (creator) {
      const footerY = 275;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.line(15, footerY - 3, 195, footerY - 3);
      const parts: string[] = [];
      if (creator.company_name) parts.push(creator.company_name);
      if (creator.org_number) parts.push(`Org.nr: ${creator.org_number}`);
      if (creator.company_address) parts.push(creator.company_address);
      if (creator.company_postal_code || creator.company_city) {
        parts.push([creator.company_postal_code, creator.company_city].filter(Boolean).join(" "));
      }
      if (creator.email) parts.push(creator.email);
      if (creator.phone) parts.push(creator.phone);
      doc.text(parts.join("  |  "), 105, footerY, { align: "center" });
    }

    doc.save(`${quote.title.replace(/[^a-zåäö0-9]/gi, "_")}.pdf`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onSignOut={handleSignOut}
      />
      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Back to project link */}
        {returnTo && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("quotes.backToProject")}
          </Button>
        )}

        {/* Company header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {creator?.company_name || creator?.name || "Renomate"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {new Date(quote.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_COLORS[quote.status] ?? ""}>
              {t(`quotes.${quote.status}`)}
            </Badge>
            {isOwner && (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Title + project */}
        <div>
          <h1 className="text-2xl font-bold">{quote.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t("quotes.quoteFor")} {projectName}
          </p>
        </div>

        {/* Items table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{t("quotes.description")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("quotes.quantity")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("quotes.unitPrice")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("quotes.totalAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    {item.description}
                    {item.is_rot_eligible && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0">ROT</Badge>
                    )}
                  </td>
                  <td className="text-right px-3 py-2">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="text-right px-3 py-2">
                    {item.unit_price.toLocaleString()} kr
                  </td>
                  <td className="text-right px-3 py-2">
                    {item.total_price.toLocaleString()} kr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{t("quotes.subtotal")}</span>
            <span>{subtotal.toLocaleString()} kr</span>
          </div>
          <div className="flex justify-between">
            <span>{t("quotes.vat")}</span>
            <span>{vat.toLocaleString()} kr</span>
          </div>
          {totalRot > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t("quotes.rotDeduction")}</span>
              <span>-{totalRot.toLocaleString()} kr</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>{t("quotes.totalToPay")}</span>
            <span>{totalToPay.toLocaleString()} kr</span>
          </div>
        </div>

        {/* Free text */}
        {quote.free_text && (
          <div className="text-sm whitespace-pre-wrap text-muted-foreground border rounded-lg p-4">
            {quote.free_text}
          </div>
        )}

        {/* Company footer */}
        {creator && (creator.company_name || creator.org_number || creator.email) && (
          <div className="border-t pt-4 text-xs text-muted-foreground space-y-0.5 text-center">
            {creator.company_name && <p className="font-medium">{creator.company_name}</p>}
            {creator.org_number && <p>Org.nr: {creator.org_number}</p>}
            {(creator.company_address || creator.company_city) && (
              <p>{[creator.company_address, [creator.company_postal_code, creator.company_city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
            )}
            {(creator.email || creator.phone) && (
              <p>{[creator.email, creator.phone].filter(Boolean).join("  |  ")}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {isSent && (
          <div className="space-y-2">
            <Button
              className="w-full min-h-[48px] bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={acting}
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t("quotes.acceptQuote")}
            </Button>
            <Button
              variant="outline"
              className="w-full min-h-[48px]"
              onClick={handleDecline}
              disabled={acting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("quotes.declineQuote")}
            </Button>
          </div>
        )}

        {/* Chat section */}
        {(showChat || quote.status === "accepted" || quote.status === "rejected") && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("quotes.chatAboutQuote")}</h3>
            <CommentsSection
              entityId={quoteId}
              entityType="quote"
              projectId={quote.project_id}
              chatMode
            />
          </div>
        )}
      </main>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("quotes.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
