/**
 * DirectMessageSheet — Slide-out panel for private DMs between project members.
 *
 * Opens when clicking a team member's avatar. Shows chat bubbles (own right,
 * theirs left) with real-time updates via Supabase channels.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Lock, Trash2 } from "lucide-react";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DirectMessageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentUserId: string;
  recipient: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `${time} (igår)`;
  if (diffDays < 7) return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DirectMessageSheet({
  open,
  onOpenChange,
  projectId,
  currentUserId,
  recipient,
}: DirectMessageSheetProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
  } = useDirectMessages({
    projectId,
    currentUserId,
    recipientId: recipient.id,
    enabled: open,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [open, messages.length]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Mark messages as read when panel is open
  useEffect(() => {
    if (open && messages.length > 0) {
      markAsRead();
    }
  }, [open, messages.length, markAsRead]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isOwnMessage = (fromUserId: string) => fromUserId === currentUserId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {recipient.avatar_url && (
                <AvatarImage src={recipient.avatar_url} alt={recipient.name} />
              )}
              <AvatarFallback className={cn("text-white text-xs", getAvatarColor(recipient.name))}>
                {getInitials(recipient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold truncate">
                {recipient.name}
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {t("dm.privateNotice", "Privat konversation")}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t("common.loading", "Laddar...")}
            </p>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("dm.empty", "Inga meddelanden ännu.")}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t("dm.emptyHint", "Meddelanden här är bara synliga för er två.")}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const own = isOwnMessage(msg.from_user_id);
            return (
              <div
                key={msg.id}
                className={cn("flex group", own ? "justify-end" : "justify-start")}
              >
                <div className="max-w-[80%] space-y-0.5">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      own
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-1",
                      own ? "justify-end" : "justify-start"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(msg.created_at)}
                    </span>
                    {own && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t("dm.delete", "Ta bort")}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground/40 hover:text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-3 py-3 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("dm.placeholder", "Skriv ett meddelande...")}
            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
