import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function HelpBot() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset conversation when language changes so greeting appears in new language
  const currentLang = i18n.language;
  useEffect(() => {
    setMessages([]);
  }, [currentLang]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: t("helpBot.greeting", "Hi! I'm Renomate — your renovation expert and platform guide. Ask me about building regulations, renovation tips, or how to get the most out of the app!") +
            "\n\n" +
            t("helpBot.disclaimer", "NOTE: I provide general guidance — always contact your municipality's building committee for final decisions."),
        },
      ]);
    }
    if (open) {
      inputRef.current?.focus();
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const conversationMessages = [...messages.filter((m) => m === messages[0] ? false : true), userMsg]
        .map((m) => ({ role: m.role, content: m.content }));

      if (conversationMessages.length === 0) {
        conversationMessages.push({ role: userMsg.role, content: userMsg.content });
      }

      const { data, error } = await supabase.functions.invoke("help-bot", {
        body: { messages: conversationMessages, language: i18n.language },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || t("helpBot.errorMessage", "Something went wrong. Please try again.") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("helpBot.errorMessage", "Something went wrong. Please try again.") },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, t, i18n.language]);

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          aria-label={t("helpBot.title", "Renomate")}
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-2 md:bottom-6 md:right-6 z-50 flex h-[500px] max-h-[calc(100vh-10rem)] md:max-h-none w-[400px] max-w-[calc(100vw-1rem)] md:max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-background shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-sm">
              {t("helpBot.title", "Renomate")}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                  ...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t("helpBot.placeholder", "Ask about renovations or how to use the app...")}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
