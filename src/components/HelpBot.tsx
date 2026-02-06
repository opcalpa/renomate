import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle, Send, X, Lightbulb, BookOpen, Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuickPrompt {
  icon: React.ReactNode;
  labelKey: string;
  fallback: string;
  message: string;
}

export function HelpBot() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user type from profile
  useEffect(() => {
    const fetchUserType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_user_type")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarding_user_type) {
        setUserType(data.onboarding_user_type);
      }
    };
    fetchUserType();
  }, []);

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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const allConversation = [...messages.filter((m) => m === messages[0] ? false : true), userMsg]
        .map((m) => ({ role: m.role, content: m.content }));

      if (allConversation.length === 0) {
        allConversation.push({ role: userMsg.role, content: userMsg.content });
      }

      // Trim to last 8 messages to reduce token usage
      const conversationMessages = allConversation.slice(-8);

      const { data, error } = await supabase.functions.invoke("help-bot", {
        body: { messages: conversationMessages, language: i18n.language, userType },
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
  }, [loading, messages, t, i18n.language, userType]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickPrompt = useCallback((prompt: QuickPrompt) => {
    sendMessage(prompt.message);
  }, [sendMessage]);

  // Quick prompts shown before first user message
  const quickPrompts: QuickPrompt[] = userType === "contractor"
    ? [
        {
          icon: <Wrench className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.projectManagement",
          fallback: "Project management tips",
          message: t("helpBot.quickMessage.projectManagement", "How can I manage my renovation projects more efficiently in the app?"),
        },
        {
          icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.permits",
          fallback: "Building permits & regulations",
          message: t("helpBot.quickMessage.permits", "What building permits and regulations should I be aware of for renovation work?"),
        },
        {
          icon: <Lightbulb className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.spacePlanner",
          fallback: "Space Planner guide",
          message: t("helpBot.quickMessage.spacePlanner", "How do I use the Space Planner to create floor plans and link rooms to tasks?"),
        },
        {
          icon: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.teamBudget",
          fallback: "Team & budget tracking",
          message: t("helpBot.quickMessage.teamBudget", "How do I invite team members and track costs across projects?"),
        },
      ]
    : [
        {
          icon: <Lightbulb className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.getStarted",
          fallback: "Getting started",
          message: t("helpBot.quickMessage.getStarted", "I'm new — what's the best way to set up my first renovation project?"),
        },
        {
          icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.permits",
          fallback: "Building permits & regulations",
          message: t("helpBot.quickMessage.permits", "What building permits and regulations should I be aware of for renovation work?"),
        },
        {
          icon: <Wrench className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.spacePlanner",
          fallback: "Space Planner guide",
          message: t("helpBot.quickMessage.spacePlanner", "How do I use the Space Planner to create floor plans and link rooms to tasks?"),
        },
        {
          icon: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
          labelKey: "helpBot.quick.budgetTips",
          fallback: "Budget & cost tracking",
          message: t("helpBot.quickMessage.budgetTips", "How do I track renovation costs and manage my budget in the app?"),
        },
      ];

  const showQuickPrompts = messages.length <= 1 && !loading;

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

            {/* Quick prompt buttons */}
            {showQuickPrompts && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {prompt.icon}
                    {t(prompt.labelKey, prompt.fallback)}
                  </button>
                ))}
              </div>
            )}

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
