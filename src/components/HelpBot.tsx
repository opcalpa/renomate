import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Lightbulb, BookOpen, Wrench, FileText, Bug, MessageSquarePlus, ArrowLeft } from "lucide-react";
import { useJuniorStore } from "@/stores/juniorStore";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Optional inline quick-action buttons rendered below this message */
  actions?: InlineAction[];
}

interface InlineAction {
  labelKey: string;
  fallback: string;
  action: string;
  icon?: React.ReactNode;
}

interface QuickPrompt {
  icon: React.ReactNode;
  labelKey: string;
  fallback: string;
  message?: string;
  action?: string;
}

type FeedbackMode = null | "bug" | "suggestion" | "other";

function getTimeOfDayKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function getPageContext(): "projects" | "project" | "auth" | "other" {
  const path = window.location.pathname;
  if (path.startsWith("/project/")) return "project";
  if (path === "/start" || path === "/") return "projects";
  if (path.startsWith("/auth")) return "auth";
  return "other";
}

export function HelpBot() {
  const { t, i18n } = useTranslation();
  const reminderCount = useJuniorStore((s) => s.reminderCount);
  const juniorReminders = useJuniorStore((s) => s.reminders);
  const juniorProjectName = useJuniorStore((s) => s.projectName);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch user type and name from profile
  useEffect(() => {
    const fetchUserType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_user_type, name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.onboarding_user_type) {
        setUserType(data.onboarding_user_type);
      }
      if (data?.name) {
        setUserName(data.name.split(" ")[0]); // first name only
      }
    };
    fetchUserType();
  }, []);

  const buildGreeting = useCallback(() => {
    const timeKey = getTimeOfDayKey();
    const page = getPageContext();
    const nameGreeting = userName ? `, ${userName}` : "";

    // Time-based hello
    const hello = t(`helpBot.timeGreeting.${timeKey}`, {
      defaultValue: timeKey === "morning" ? "God morgon" : timeKey === "afternoon" ? "Hej" : "God kväll",
    });

    // Role-specific flavor
    const roleIntro = userType === "homeowner"
      ? t("helpBot.roleIntro.homeowner", "I'm your personal renovation sidekick — here to help with everything from planning to punch list.")
      : userType === "contractor"
        ? t("helpBot.roleIntro.contractor", "I'm your project assistant — ready to help with quotes, scheduling, and keeping things on track.")
        : t("helpBot.roleIntro.default", "I'm your renovation expert and platform guide.");

    // Project reminders
    let reminderBlock = "";
    if (page === "project" && juniorReminders.length > 0) {
      const items = juniorReminders.slice(0, 4).map(r => `• ${t(r.titleKey)}`).join("\n");
      reminderBlock = `\n\n${t("helpBot.reminderIntro", "I noticed a few things in your project:")}\n${items}`;
    }

    // Page-specific nudge (only if no reminders)
    let nudge = "";
    if (!reminderBlock) {
      if (page === "projects") {
        nudge = t("helpBot.nudge.projects", "Pick a project to dive into, or ask me anything about renovations!");
      } else if (page === "project") {
        nudge = t("helpBot.nudge.project", "I can see you're working on a project — ask me about next steps, building regulations, or how to use any feature.");
      }
    }

    const disclaimer = t("helpBot.disclaimerShort", "PS: For building regs I give general guidance — always double-check with your municipality.");

    return `${hello}${nameGreeting}! 👋\n\n${roleIntro}${reminderBlock}\n\n${nudge ? nudge + "\n\n" : ""}${disclaimer}`;
  }, [t, userType, userName, juniorReminders]);

  // Reset conversation when language changes
  const currentLang = i18n.language;
  useEffect(() => {
    setMessages([]);
    setFeedbackMode(null);
  }, [currentLang]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: buildGreeting(),
        },
      ]);
    }
    if (open) {
      inputRef.current?.focus();
    }
  }, [open, messages.length, buildGreeting]);

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

  const submitFeedback = useCallback(async (text: string, type: "bug" | "suggestion" | "other") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.functions.invoke("send-feedback", {
        body: {
          message: text,
          email: user?.email,
          type,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          userId: user?.id,
        },
      });

      if (error) throw error;

      const confirmMsg = type === "bug"
        ? t("helpBot.bugSentConfirm")
        : type === "suggestion"
          ? t("helpBot.suggestionSentConfirm")
          : t("helpBot.otherSentConfirm");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: confirmMsg,
          actions: [
            { labelKey: "helpBot.addMore", fallback: "Add more details", action: "add_more" },
            { labelKey: "helpBot.backToChat", fallback: "Back to chat", action: "back_to_chat" },
          ],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("helpBot.feedbackError"),
        },
      ]);
    } finally {
      setFeedbackMode(null);
      setLoading(false);
    }
  }, [t]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // If in feedback mode, submit as feedback
    if (feedbackMode) {
      await submitFeedback(text.trim(), feedbackMode);
      return;
    }

    setLoading(true);

    try {
      const allConversation = [...messages.filter((m) => m === messages[0] ? false : true), userMsg]
        .map((m) => ({ role: m.role, content: m.content }));

      if (allConversation.length === 0) {
        allConversation.push({ role: userMsg.role, content: userMsg.content });
      }

      const conversationMessages = allConversation.slice(-8);

      const { data, error } = await supabase.functions.invoke("help-bot", {
        body: { messages: conversationMessages, language: i18n.language, userType },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || t("helpBot.errorMessage") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("helpBot.errorMessage") },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, t, i18n.language, userType, feedbackMode, submitFeedback]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const startFeedbackMode = useCallback((type: FeedbackMode) => {
    if (!type) return;
    setFeedbackMode(type);

    const prompts: Record<string, string> = {
      bug: t("helpBot.bugPrompt"),
      suggestion: t("helpBot.suggestionPrompt"),
      other: t("helpBot.otherPrompt"),
    };

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: prompts[type],
        actions: [
          { labelKey: "helpBot.goBack", fallback: "Back", action: "reset_chat", icon: <ArrowLeft className="h-3 w-3" /> },
        ],
      },
    ]);
    inputRef.current?.focus();
  }, [t]);

  const handleInlineAction = useCallback((action: string) => {
    if (action === "bug") {
      startFeedbackMode("bug");
    } else if (action === "suggestion") {
      startFeedbackMode("suggestion");
    } else if (action === "other") {
      startFeedbackMode("other");
    } else if (action === "add_more") {
      // Re-enter the same feedback mode type for follow-up
      setFeedbackMode("other");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("helpBot.addMorePrompt") },
      ]);
      inputRef.current?.focus();
    } else if (action === "back_to_chat") {
      setFeedbackMode(null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("helpBot.backToChatMsg") },
      ]);
    } else if (action === "reset_chat") {
      // Reset to initial state — show greeting + quick prompts again
      setFeedbackMode(null);
      setMessages([
        {
          role: "assistant",
          content: buildGreeting(),
        },
      ]);
    } else if (action === "start_feedback") {
      // Show the feedback type picker
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("helpBot.feedbackTypePicker"),
          actions: [
            { labelKey: "helpBot.quick.reportBug", fallback: "Report a bug", action: "bug" },
            { labelKey: "helpBot.quick.suggestion", fallback: "Suggestion", action: "suggestion" },
            { labelKey: "helpBot.quick.otherFeedback", fallback: "Other", action: "other" },
          ],
        },
      ]);
    }
  }, [startFeedbackMode, t]);

  const handleQuickPrompt = useCallback((prompt: QuickPrompt) => {
    if (prompt.action) {
      handleInlineAction(prompt.action);
    } else if (prompt.message) {
      sendMessage(prompt.message);
    }
  }, [sendMessage, handleInlineAction]);

  // Quick prompts shown before first user message
  const quickPrompts: QuickPrompt[] = userType === "contractor" ? [
    {
      icon: <Lightbulb className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.getStarted",
      fallback: "Getting started",
      message: t("helpBot.quickMessage.getStarted"),
    },
    {
      icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.quotesTips",
      fallback: "Quotes & invoicing",
      message: t("helpBot.quickMessage.quotesTips"),
    },
    {
      icon: <Wrench className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.spacePlanner",
      fallback: "Space Planner guide",
      message: t("helpBot.quickMessage.spacePlanner"),
    },
    {
      icon: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.budgetTips",
      fallback: "Budget & cost tracking",
      message: t("helpBot.quickMessage.budgetTips"),
    },
  ] : [
    {
      icon: <Lightbulb className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.getStarted",
      fallback: "Getting started",
      message: t("helpBot.quickMessage.getStarted"),
    },
    {
      icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.permits",
      fallback: "Building permits & regulations",
      message: t("helpBot.quickMessage.permits"),
    },
    {
      icon: <Wrench className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.planningHelp",
      fallback: "Planning & quotes",
      message: t("helpBot.quickMessage.planningHelp"),
    },
    {
      icon: <BookOpen className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.budgetTips",
      fallback: "Budget & cost tracking",
      message: t("helpBot.quickMessage.budgetTips"),
    },
  ];

  // Feedback entry point
  const feedbackPrompts: QuickPrompt[] = [
    {
      icon: <Bug className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.reportBug",
      fallback: "Report a bug",
      action: "bug",
    },
    {
      icon: <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />,
      labelKey: "helpBot.quick.suggestion",
      fallback: "Suggestion",
      action: "suggestion",
    },
  ];

  const showQuickPrompts = messages.length <= 1 && !loading && !feedbackMode;

  const placeholderText = feedbackMode === "bug"
    ? t("helpBot.bugPlaceholder")
    : feedbackMode === "suggestion"
      ? t("helpBot.suggestionPlaceholder")
      : feedbackMode === "other"
        ? t("helpBot.otherPlaceholder", "Write your message...")
        : t("helpBot.placeholder");

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-white border-2 border-primary/20 hover:border-primary/40 transition-colors flex items-center justify-center"
          aria-label={t("helpBot.title", "Renomate Junior")}
        >
          <img src="/chatbot-avatar.jpg" alt="Renomate Junior" className="h-10 w-10 rounded-full object-cover" />
          {reminderCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
              {reminderCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="fixed inset-0 z-50 flex flex-col bg-background md:inset-auto md:bottom-6 md:right-6 md:h-[500px] md:w-[400px] md:max-w-[calc(100vw-2rem)] md:rounded-xl md:border md:shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <img src="/chatbot-avatar.jpg" alt="Renomate Junior" className="h-7 w-7 rounded-full object-cover" />
              <h3 className="font-semibold text-sm">
                {t("helpBot.title", "Renomate Junior")}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {feedbackMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setFeedbackMode(null);
                    setMessages((prev) => [
                      ...prev,
                      { role: "assistant", content: t("helpBot.feedbackCancelled") },
                    ]);
                  }}
                >
                  {t("helpBot.cancelFeedback")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Feedback mode indicator */}
          {feedbackMode && (
            <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 ${
              feedbackMode === "bug" ? "bg-red-50 text-red-700" :
              feedbackMode === "suggestion" ? "bg-blue-50 text-blue-700" :
              "bg-amber-50 text-amber-700"
            }`}>
              {feedbackMode === "bug" && "🐛"}
              {feedbackMode === "suggestion" && "💡"}
              {feedbackMode === "other" && "✉️"}
              {feedbackMode === "bug"
                ? t("helpBot.bugModeLabel")
                : feedbackMode === "suggestion"
                  ? t("helpBot.suggestionModeLabel")
                  : t("helpBot.otherModeLabel", "Your message will be sent to the team")}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                {/* Inline action buttons below a message */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                    {msg.actions.map((action, j) => (
                      <button
                        key={j}
                        onClick={() => handleInlineAction(action.action)}
                        className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {action.icon}
                        {t(action.labelKey, action.fallback)}
                      </button>
                    ))}
                  </div>
                )}
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
                <div className="w-full" />
                {feedbackPrompts.map((prompt, i) => (
                  <button
                    key={`fb-${i}`}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {prompt.icon}
                    {t(prompt.labelKey, prompt.fallback)}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
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
              placeholder={placeholderText}
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
