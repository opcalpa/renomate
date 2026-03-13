import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectMessage {
  id: string;
  project_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  images: { id: string; url: string; filename: string }[];
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  from_user?: { id: string; name: string; avatar_url: string | null };
}

interface UseDirectMessagesOptions {
  projectId: string;
  currentUserId: string;
  recipientId: string;
  enabled?: boolean;
}

export function useDirectMessages({
  projectId,
  currentUserId,
  recipientId,
  enabled = true,
}: UseDirectMessagesOptions) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!projectId || !currentUserId || !recipientId) return;

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("project_id", projectId)
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${recipientId}),and(from_user_id.eq.${recipientId},to_user_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch DMs:", error);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }, [projectId, currentUserId, recipientId]);

  // Fetch on mount + setup realtime
  useEffect(() => {
    if (!enabled || !projectId || !currentUserId || !recipientId) return;

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`dm-${projectId}-${currentUserId}-${recipientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const msg = payload.new as DirectMessage | undefined;
          const oldMsg = payload.old as { id: string } | undefined;

          if (!msg && !oldMsg) return;

          // Only care about messages in this conversation
          const isRelevant =
            msg &&
            ((msg.from_user_id === currentUserId && msg.to_user_id === recipientId) ||
              (msg.from_user_id === recipientId && msg.to_user_id === currentUserId));

          if (payload.eventType === "INSERT" && isRelevant) {
            setMessages((prev) => [...prev, msg]);
          } else if (payload.eventType === "UPDATE" && isRelevant) {
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
          } else if (payload.eventType === "DELETE" && oldMsg) {
            setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, projectId, currentUserId, recipientId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !projectId || !currentUserId || !recipientId) return null;

      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          project_id: projectId,
          from_user_id: currentUserId,
          to_user_id: recipientId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to send DM:", error);
        return null;
      }

      return data;
    },
    [projectId, currentUserId, recipientId]
  );

  const markAsRead = useCallback(async () => {
    if (!projectId || !currentUserId || !recipientId) return;

    const unread = messages.filter(
      (m) => m.to_user_id === currentUserId && !m.is_read
    );
    if (unread.length === 0) return;

    const ids = unread.map((m) => m.id);
    await supabase
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
  }, [messages, projectId, currentUserId, recipientId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase
      .from("direct_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Failed to delete DM:", error);
    }
  }, []);

  const unreadCount = messages.filter(
    (m) => m.to_user_id === currentUserId && !m.is_read
  ).length;

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    unreadCount,
    refetch: fetchMessages,
  };
}

/**
 * Hook to get unread DM counts per conversation for a project
 */
export function useUnreadDmCounts(projectId: string, currentUserId: string) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!projectId || !currentUserId) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("from_user_id")
        .eq("project_id", projectId)
        .eq("to_user_id", currentUserId)
        .eq("is_read", false);

      if (error || !data) return;

      const map: Record<string, number> = {};
      for (const row of data) {
        map[row.from_user_id] = (map[row.from_user_id] || 0) + 1;
      }
      setCounts(map);
    };

    fetch();

    // Poll every 30s
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [projectId, currentUserId]);

  return counts;
}
