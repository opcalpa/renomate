import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: "sv", name: "Svenska", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "en", name: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "uk", name: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "pl", name: "Polski", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "ro", name: "Rom\u00E2n\u0103", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "lt", name: "Lietuvi\u0173", flag: "\u{1F1F1}\u{1F1F9}" },
  { code: "et", name: "Eesti", flag: "\u{1F1EA}\u{1F1EA}" },
  { code: "de", name: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "fr", name: "Fran\u00E7ais", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "es", name: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskOption {
  id: string;
  title: string;
  roomName: string | null;
}

interface InviteWorkerDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InviteWorkerDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: InviteWorkerDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("sv");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load project tasks
  useEffect(() => {
    if (!open) return;
    loadTasks();
    // Reset on open
    setName("");
    setPhone("");
    setLanguage("sv");
    setSelectedTaskIds([]);
    setGeneratedLink(null);
  }, [open]);

  const loadTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, room_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // Fetch room names
    const roomIds = [...new Set(data.map((t) => t.room_id).filter(Boolean))];
    let roomMap: Record<string, string> = {};
    if (roomIds.length > 0) {
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name")
        .in("id", roomIds);
      for (const r of rooms || []) {
        roomMap[r.id] = r.name;
      }
    }

    setTasks(
      data.map((t) => ({
        id: t.id,
        title: t.title,
        roomName: t.room_id ? roomMap[t.room_id] || null : null,
      }))
    );
  };

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedTaskIds.length === 0) return;

    setSaving(true);
    try {
      // Get current user profile id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Profile not found");

      const { data: tokenRecord, error } = await supabase
        .from("worker_access_tokens")
        .insert({
          project_id: projectId,
          created_by_user_id: profile.id,
          worker_name: name.trim(),
          worker_phone: phone.trim() || null,
          worker_language: language,
          assigned_task_ids: selectedTaskIds,
        })
        .select("token")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/w/${tokenRecord.token}`;
      setGeneratedLink(link);

      // Trigger translation in background (best-effort, don't block)
      if (language !== "en" && language !== "sv") {
        supabase.functions
          .invoke("translate-task-content", {
            body: { taskIds: selectedTaskIds, targetLanguage: language },
          })
          .then(() => {
            console.info("Translations triggered for", language);
          })
          .catch((err) => {
            console.error("Translation trigger failed:", err);
          });
      }

      toast({
        title: t("teamWorker.workerInvited", "Worker invited"),
        description: t("teamWorker.linkCreated", "Link created. Share it with the worker."),
      });

      onCreated?.();
    } catch (err) {
      console.error("Failed to create worker token:", err);
      toast({
        title: t("common.error", "Error"),
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ description: t("teamWorker.linkCopied", "Link copied to clipboard") });
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("teamWorker.inviteWorker", "Invite Worker")}</DialogTitle>
          <DialogDescription>
            {t(
              "teamWorker.inviteWorkerDescription",
              "Create a link with work instructions for a subcontractor."
            )}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          // Success view — show link
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">
                {t("teamWorker.copyLink", "Copy link")}
              </p>
              <p className="text-sm font-mono break-all select-all">{generatedLink}</p>
            </div>
            <Button className="w-full gap-2" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied
                ? t("teamWorker.linkCopied", "Link copied")
                : t("teamWorker.copyLink", "Copy link")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t("common.close", "Close")}
            </Button>
          </div>
        ) : (
          // Form view
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="worker-name">
                {t("teamWorker.workerName", "Worker name")} *
              </Label>
              <Input
                id="worker-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dmytro"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="worker-phone">
                {t("teamWorker.workerPhone", "Phone number (optional)")}
              </Label>
              <Input
                id="worker-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380 ..."
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>{t("teamWorker.workerLanguage", "Language")}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign tasks */}
            <div className="space-y-2">
              <Label>
                {t("teamWorker.assignTasks", "Assign tasks")} *
              </Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">
                    {t("tasks.noTasks", "No tasks")}
                  </p>
                ) : (
                  tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTaskIds.includes(task.id)}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{task.title}</p>
                        {task.roomName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.roomName}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedTaskIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("teamWorker.tasksAssigned", "{{count}} tasks", {
                    count: selectedTaskIds.length,
                  })}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={saving || !name.trim() || selectedTaskIds.length === 0}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("teamWorker.inviteWorker", "Invite Worker")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
