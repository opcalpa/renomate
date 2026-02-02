import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, X } from "lucide-react";
import type { FeedComment } from "./types";
import { getContextType, getContextLabel, parseMentions } from "./utils";
import { MentionTextarea } from "./MentionTextarea";

interface FeedReplyInputProps {
  replyTarget: FeedComment;
  projectId: string;
  onPosted: () => void;
  onCancel: () => void;
}

export const FeedReplyInput = ({ replyTarget, projectId, onPosted, onCancel }: FeedReplyInputProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const contextType = getContextType(replyTarget);
  const contextLabel = getContextLabel(replyTarget);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) throw new Error("Profile not found");

      // Constraint requires exactly 1 FK set — use entity FK, not project_id
      const insertData: Record<string, unknown> = {
        content: content.trim(),
        created_by_user_id: profile.id,
      };

      if (replyTarget.task_id) {
        insertData.task_id = replyTarget.task_id;
      } else if (replyTarget.material_id) {
        insertData.material_id = replyTarget.material_id;
      } else if (replyTarget.entity_id) {
        insertData.entity_id = replyTarget.entity_id;
        insertData.entity_type = replyTarget.entity_type;
      } else if (replyTarget.drawing_object_id) {
        insertData.drawing_object_id = replyTarget.drawing_object_id;
      } else {
        insertData.project_id = projectId;
      }

      const { data: commentData, error } = await supabase.from("comments").insert(insertData).select("id").single();
      if (error) throw error;

      const mentions = parseMentions(content.trim());
      if (mentions.length > 0 && commentData) {
        await supabase.from("comment_mentions").insert(
          mentions.map((m) => ({ comment_id: commentData.id, mentioned_user_id: m.profileId }))
        );
      }

      setContent("");
      onPosted();
      toast({ title: t("comments.commentPosted"), description: t("comments.commentPostedDescription") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("comments.postError");
      toast({ title: t("errors.generic"), description: message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ml-11 p-3 rounded-lg border bg-muted/50 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t("feed.replyingTo", { context: `${t(`feed.contextTypes.${contextType}`)}${contextLabel ? ` · ${contextLabel}` : ""}` })}</span>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <MentionTextarea
        projectId={projectId}
        placeholder={t("feed.generalCommentPlaceholder")}
        value={content}
        onChange={setContent}
        className="min-h-12 resize-none text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePost(); }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
          {t("feed.cancelReply")}
        </Button>
        <Button onClick={handlePost} disabled={posting || !content.trim()} size="sm" className="h-7 text-xs">
          {posting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
          {t("feed.postGeneral")}
        </Button>
      </div>
    </div>
  );
};
