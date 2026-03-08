import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, Download, CheckCircle2, ClipboardList, Home, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectWorkType,
  WORK_TYPE_LABEL_KEYS,
} from "@/lib/materialRecipes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RfqTask {
  id: string;
  title: string;
  description: string | null;
  room_names: string[];
  cost_center: string | null;
}

interface RfqRoom {
  name: string;
  area_sqm: number | null;
}

interface ShareRfqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  projectAddress?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareRfqDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectAddress,
}: ShareRfqDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<RfqTask[]>([]);
  const [rooms, setRooms] = useState<RfqRoom[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setSent(false);
      setEmail("");
      setMessage("");
      return;
    }
    // Fetch summary data
    const fetchData = async () => {
      const [{ data: taskData }, { data: roomData }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, description, room_id, room_ids, cost_center, rooms!tasks_room_id_fkey(name)")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("rooms")
          .select("name, dimensions")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
      ]);

      if (taskData) {
        setTasks(
          taskData.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            room_names: [],
            cost_center: t.cost_center,
          }))
        );
      }
      if (roomData) {
        setRooms(
          roomData.map((r) => ({
            name: r.name,
            area_sqm: (r.dimensions as Record<string, unknown>)?.area_sqm as number | null ?? null,
          }))
        );
      }
    };
    fetchData();
  }, [open, projectId]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create invitation
      const { error } = await supabase.from("project_invitations").insert({
        project_id: projectId,
        email: email.trim().toLowerCase(),
        role: "editor",
        role_type: "rfq_builder",
        status: "pending",
        delivery_method: "email",
        notes: message || null,
        // Grant builder-level access on accept
        tasks_access: "edit",
        tasks_scope: "all",
        overview_access: "view",
        budget_access: "edit",
        files_access: "view",
        space_planner_access: "view",
      });

      if (error) throw error;

      setSent(true);
      toast({ description: t("shareRfq.inviteSent", "Invitation sent!") });
    } catch {
      toast({ variant: "destructive", description: t("common.errorSaving", "Could not send invitation") });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {t("shareRfq.title", "Share quote request")}
          </DialogTitle>
          <DialogDescription>
            {t("shareRfq.description", "Share your renovation plan with builders to receive quotes.")}
          </DialogDescription>
        </DialogHeader>

        {/* RFQ Preview */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div>
            <p className="font-medium text-sm">{projectName || t("common.project", "Project")}</p>
            {projectAddress && <p className="text-xs text-muted-foreground">{projectAddress}</p>}
          </div>

          {/* Tasks summary */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {t("shareRfq.scopeOfWork", "Scope of work")} ({tasks.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {tasks.map((task) => {
                const wt = detectWorkType(task);
                return (
                  <Badge key={task.id} variant="secondary" className="text-xs font-normal">
                    {wt && (
                      <span className="text-muted-foreground mr-1">
                        {t(WORK_TYPE_LABEL_KEYS[wt], wt)}:
                      </span>
                    )}
                    {task.title}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Rooms summary */}
          {rooms.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Home className="h-3 w-3" />
                {t("shareRfq.rooms", "Rooms")} ({rooms.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {rooms.map((room, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {room.name}
                    {room.area_sqm && <span className="text-muted-foreground ml-1">{room.area_sqm} m²</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Invite builder */}
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm font-medium">{t("shareRfq.sentConfirmation", "Invitation sent to {{email}}", { email })}</p>
            <p className="text-xs text-muted-foreground text-center">
              {t("shareRfq.sentDescription", "The builder will receive an email with a link to view your renovation plan and create a quote.")}
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSent(false); setEmail(""); }}>
              {t("shareRfq.inviteAnother", "Invite another builder")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {t("shareRfq.inviteBuilder", "Invite a builder")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("shareRfq.inviteDescription", "The builder gets access to your scope and rooms, and can create a quote for you.")}
              </p>
            </div>
            <Input
              type="email"
              placeholder={t("shareRfq.emailPlaceholder", "builder@company.com")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
            />
            <Input
              placeholder={t("shareRfq.messagePlaceholder", "Optional message...")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleInvite}
                disabled={!email.trim() || sending}
                className="gap-1.5 flex-1"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("shareRfq.sendInvitation", "Send invitation")}
              </Button>
              <Button variant="outline" disabled className="gap-1.5">
                <Download className="h-4 w-4" />
                {t("shareRfq.downloadPdf", "PDF")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
