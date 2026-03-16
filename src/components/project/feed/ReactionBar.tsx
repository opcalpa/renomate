/**
 * ReactionBar — Emoji reactions for comments (messenger-style).
 * Shows existing reactions as grouped badges, plus a "+" button to add.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "🎉", "👏", "👎", "😢", "😡", "😤", "🤢"];

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface ReactionBarProps {
  commentId: string;
  profileId: string | null;
}

export function ReactionBar({ commentId, profileId }: ReactionBarProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fetchReactions = useCallback(async () => {
    const { data } = await supabase
      .from("comment_reactions")
      .select("emoji, user_id")
      .eq("comment_id", commentId);

    if (!data) return;

    const emojiMap = new Map<string, { count: number; userReacted: boolean }>();
    for (const r of data) {
      const existing = emojiMap.get(r.emoji) || { count: 0, userReacted: false };
      existing.count++;
      if (r.user_id === profileId) existing.userReacted = true;
      emojiMap.set(r.emoji, existing);
    }

    setReactions(
      Array.from(emojiMap.entries()).map(([emoji, { count, userReacted }]) => ({
        emoji,
        count,
        userReacted,
      }))
    );
  }, [commentId, profileId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = useCallback(async (emoji: string) => {
    if (!profileId) return;

    const existing = reactions.find(r => r.emoji === emoji && r.userReacted);
    if (existing) {
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", profileId)
        .eq("emoji", emoji);
    } else {
      await supabase
        .from("comment_reactions")
        .insert({ comment_id: commentId, user_id: profileId, emoji });
    }
    setPopoverOpen(false);
    fetchReactions();
  }, [commentId, profileId, reactions, fetchReactions]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors ${
            r.userReacted
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted border-transparent hover:border-border"
          }`}
        >
          <span>{r.emoji}</span>
          {r.count > 1 && <span className="text-[10px]">{r.count}</span>}
        </button>
      ))}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors">
            <SmilePlus className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" align="start" side="top">
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
