import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface FileLink {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
}

interface MaterialFileAttachmentProps {
  materialId?: string;
  taskId?: string;
  projectId: string;
  compact?: boolean;
}

export function MaterialFileAttachment({
  materialId,
  taskId,
  projectId,
  compact = true,
}: MaterialFileAttachmentProps) {
  const entityId = materialId || taskId || "";
  const entityField = materialId ? "material_id" : "task_id";
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileLink[]>([]);

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from("task_file_links")
      .select("id, file_name, file_path, mime_type")
      .eq(entityField, entityId)
      .eq("project_id", projectId);
    setFiles(data || []);
  }, [entityId, entityField, projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t("common.error"), description: "Max 10 MB", variant: "destructive" });
        return;
      }

      setUploading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!profile) return;

        const ext = file.name.split(".").pop() || "pdf";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `projects/${projectId}/underlag/${entityId}_${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("project-files")
          .upload(storagePath, file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { error: linkErr } = await supabase.from("task_file_links").insert({
          project_id: projectId,
          material_id: materialId || null,
          task_id: taskId || null,
          file_path: storagePath,
          file_name: file.name,
          file_type: ext === "pdf" ? "contract" : "other",
          file_size: file.size,
          mime_type: file.type,
          linked_by_user_id: profile.id,
        });

        if (linkErr) throw linkErr;
        fetchFiles();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: t("common.error"), description: msg, variant: "destructive" });
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [materialId, projectId, fetchFiles, t, toast]
  );

  const handleDelete = useCallback(
    async (link: FileLink) => {
      await supabase.storage.from("project-files").remove([link.file_path]);
      await supabase.from("task_file_links").delete().eq("id", link.id);
      fetchFiles();
    },
    [fetchFiles]
  );

  const handleOpenFile = useCallback((filePath: string) => {
    const { data } = supabase.storage.from("project-files").getPublicUrl(filePath);
    window.open(data.publicUrl, "_blank");
  }, []);

  if (files.length === 0 && compact) {
    return (
      <>
        <input
          ref={fileRef}
          id={`file-${entityId}`}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <button
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground/40 hover:text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          title={t("planningTasks.attachFile", "Attach file")}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
        </button>
      </>
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center gap-0.5 p-0.5 rounded hover:bg-muted transition-colors text-emerald-600"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="h-3 w-3" />
            {files.length > 1 && <span className="text-xs">{files.length}</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5 text-sm group">
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <button
                  className="flex-1 text-left truncate text-xs hover:underline"
                  onClick={() => handleOpenFile(f.file_path)}
                  title={f.file_name}
                >
                  {f.file_name}
                </button>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  onClick={() => handleDelete(f)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs gap-1"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
            {t("planningTasks.attachFile", "Attach file")}
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
}
