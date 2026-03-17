import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUp, Sparkles, Paperclip, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UploadMode = "attach" | "smart";

interface LinkTarget {
  id: string;
  name: string;
  type: "task" | "material";
}

interface UploadFileDialogProps {
  projectId: string;
  targets: LinkTarget[];
  onComplete: () => void;
  onSmartImport: (file: File) => void;
}

export function useUploadFileDialog() {
  const [open, setOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const triggerUpload = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPendingFile(f);
      setOpen(true);
    }
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  return { open, setOpen, pendingFile, setPendingFile, fileRef, triggerUpload, onFileSelected };
}

export function UploadFileDialog({
  projectId,
  targets,
  onComplete,
  onSmartImport,
  open,
  onOpenChange,
  pendingFile,
}: UploadFileDialogProps & {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pendingFile: File | null;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<UploadMode>("attach");
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setMode("attach");
    setSelectedTargets(new Set());
  };

  const canSubmit =
    pendingFile &&
    (mode === "smart" || selectedTargets.size > 0);

  const handleSubmit = async () => {
    if (!pendingFile || !canSubmit) return;

    if (mode === "smart") {
      onSmartImport(pendingFile);
      reset();
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) return;

      const ext = pendingFile.name.split(".").pop() || "pdf";
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `projects/${projectId}/underlag/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, pendingFile, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Create a link for each selected target
      const links = Array.from(selectedTargets).map((targetId) => {
        const target = targets.find((t) => t.id === targetId);
        return {
          project_id: projectId,
          file_path: storagePath,
          file_name: pendingFile.name,
          file_type: ext === "pdf" ? "contract" : "other",
          file_size: pendingFile.size,
          mime_type: pendingFile.type,
          linked_by_user_id: profile.id,
          task_id: target?.type === "task" ? targetId : null,
          material_id: target?.type === "material" ? targetId : null,
        };
      });

      const { error: linkErr } = await supabase.from("task_file_links").insert(links);
      if (linkErr) throw linkErr;

      onComplete();
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const taskTargets = targets.filter((t) => t.type === "task");
  const materialTargets = targets.filter((t) => t.type === "material");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            {t("planningTasks.uploadFile", "Upload file")}
          </DialogTitle>
        </DialogHeader>

        {pendingFile && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{pendingFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              ({Math.round(pendingFile.size / 1024)} KB)
            </span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "attach" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setMode("attach")}
            >
              <Paperclip className="h-3.5 w-3.5" />
              {t("planningTasks.attachAsFile", "Attach as file")}
            </Button>
            <Button
              type="button"
              variant={mode === "smart" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setMode("smart")}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t("planningTasks.smartImport", "Smart import")}
            </Button>
          </div>

          {/* Attach mode — select targets */}
          {mode === "attach" && (
            <div className="space-y-2">
              <Label>{t("planningTasks.linkFileTo", "Link file to")}</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {taskTargets.map((target) => (
                  <label
                    key={target.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTargets.has(target.id)}
                      onCheckedChange={() => toggleTarget(target.id)}
                    />
                    {target.name}
                  </label>
                ))}
                {materialTargets.length > 0 && taskTargets.length > 0 && (
                  <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/30">
                    {t("planningTasks.typeMaterial")} / {t("planningTasks.typeSubcontractor")}
                  </div>
                )}
                {materialTargets.map((target) => (
                  <label
                    key={target.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTargets.has(target.id)}
                      onCheckedChange={() => toggleTarget(target.id)}
                    />
                    {target.name}
                  </label>
                ))}
              </div>
              {selectedTargets.size > 1 && (
                <p className="text-xs text-muted-foreground">
                  {t("planningTasks.linkedToMultiple", "File will be linked to {{count}} items", { count: selectedTargets.size })}
                </p>
              )}
            </div>
          )}

          {/* Smart mode — explanation */}
          {mode === "smart" && (
            <p className="text-sm text-muted-foreground">
              {t("planningSmartImport.description")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "smart"
              ? t("planningTasks.smartImport", "Smart import")
              : t("planningTasks.attachFile", "Attach file")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
