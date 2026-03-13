import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, X, Send, Loader2 } from "lucide-react";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { DirectMessageSheet } from "../DirectMessageSheet";
import { useDirectMessages, useUnreadDmCounts } from "@/hooks/useDirectMessages";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getDateLocale } from "@/lib/dateFnsLocale";

interface TeamMemberInfo {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ProjectChatSectionProps {
  projectId: string;
}

export function ProjectChatSection({ projectId }: ProjectChatSectionProps) {
  const { t, i18n } = useTranslation();
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberInfo[]>([]);
  const [dmRecipient, setDmRecipient] = useState<TeamMemberInfo | null>(null);
  const [dmInput, setDmInput] = useState("");
  const [sending, setSending] = useState(false);

  const unreadCounts = useUnreadDmCounts(projectId, currentProfileId || "");

  const {
    messages: dmMessages,
    sendMessage: sendDm,
    markAsRead: markDmRead,
  } = useDirectMessages({
    projectId,
    currentUserId: currentProfileId || "",
    recipientId: dmRecipient?.id || "",
    enabled: !!dmRecipient && !!currentProfileId,
  });

  // Mark DMs as read when viewing
  useEffect(() => {
    if (dmRecipient && dmMessages.length > 0) {
      markDmRead();
    }
  }, [dmRecipient, dmMessages.length, markDmRead]);

  // Fetch current user + team members
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) return;
      setCurrentProfileId(profile.id);

      const { data: project } = await supabase
        .from("projects")
        .select("owner_id")
        .eq("id", projectId)
        .single();
      if (!project) return;

      const [ownerRes, sharesRes] = await Promise.all([
        supabase.from("profiles").select("id, name, avatar_url").eq("id", project.owner_id).single(),
        supabase
          .from("project_shares")
          .select("shared_with_user_id, profiles:shared_with_user_id(id, name, avatar_url)")
          .eq("project_id", projectId),
      ]);

      const members: TeamMemberInfo[] = [];
      if (ownerRes.data) {
        members.push({ id: ownerRes.data.id, name: ownerRes.data.name || "Owner", avatar_url: ownerRes.data.avatar_url });
      }
      for (const share of sharesRes.data || []) {
        const p = share.profiles as unknown as { id: string; name: string | null; avatar_url: string | null } | null;
        if (p && !members.some((m) => m.id === p.id)) {
          members.push({ id: p.id, name: p.name || share.shared_with_user_id, avatar_url: p.avatar_url });
        }
      }
      // Exclude self
      setTeamMembers(members.filter((m) => m.id !== profile.id));
    })();
  }, [projectId]);

  const handleToggleDm = useCallback((member: TeamMemberInfo) => {
    setDmRecipient((prev) => (prev?.id === member.id ? null : member));
    setDmInput("");
  }, []);

  const handleSendDm = useCallback(async () => {
    if (!dmInput.trim() || !dmRecipient) return;
    setSending(true);
    try {
      await sendDm(dmInput.trim());
      setDmInput("");
    } finally {
      setSending(false);
    }
  }, [dmInput, dmRecipient, sendDm]);

  const locale = getDateLocale(i18n.language);

  return (
    <div className="space-y-3">
      {/* Team member avatars */}
      {teamMembers.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wide font-medium">
            {t("dm.teamLabel", "DM")}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {teamMembers.map((member) => {
              const isSelected = dmRecipient?.id === member.id;
              const unread = unreadCounts[member.id] || 0;
              return (
                <button
                  key={member.id}
                  onClick={() => handleToggleDm(member)}
                  className={cn(
                    "relative shrink-0 rounded-full transition-all",
                    isSelected
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
                      : "hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-1 hover:ring-offset-background"
                  )}
                  title={member.name}
                >
                  <Avatar className="h-7 w-7">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name} />}
                    <AvatarFallback className="text-[9px] bg-muted">
                      {member.name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DM mode: show DM conversation */}
      {dmRecipient ? (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20">
          {/* DM header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-200 dark:border-blue-800/40">
            <Lock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-1">
              {t("dm.privateTo", { name: dmRecipient.name })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700"
              onClick={() => setDmRecipient(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* DM messages */}
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {dmMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                <Lock className="h-5 w-5 mb-1.5 opacity-40" />
                <p className="text-xs">{t("dm.empty")}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{t("dm.emptyHint")}</p>
              </div>
            ) : (
              dmMessages.map((msg) => {
                const isOwn = msg.from_user_id === currentProfileId;
                return (
                  <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap break-words",
                      isOwn
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white dark:bg-blue-900/40 rounded-bl-sm"
                    )}>
                      {msg.content}
                      <div className={cn("text-[9px] mt-0.5", isOwn ? "text-blue-200" : "text-muted-foreground/60")}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DM input */}
          <div className="border-t border-blue-200 dark:border-blue-800/40 px-3 py-2 flex gap-2">
            <input
              type="text"
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendDm();
                }
              }}
              placeholder={t("dm.placeholder")}
              className="flex-1 rounded-full border bg-white dark:bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSendDm}
              disabled={!dmInput.trim() || sending}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <p className="text-[10px] text-blue-400 px-3 pb-2">
            {t("dm.onlyVisibleToTwo", { name: dmRecipient.name })}
          </p>
        </div>
      ) : (
        /* Normal project chat */
        <CommentsSection
          projectId={projectId}
          entityId={projectId}
          entityType="project"
          chatMode
        />
      )}
    </div>
  );
}
