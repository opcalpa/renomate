import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

const Feedback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-for-header"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .single();
      return { ...data, email: user.email };
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-feedback", {
        body: { message: message.trim(), email: email.trim() || undefined },
      });

      if (error) throw error;

      toast.success(t("feedback.sent"));
      setMessage("");
      setEmail("");
    } catch {
      toast.error(t("feedback.sendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        userName={profile?.name ?? undefined}
        userEmail={profile?.email ?? undefined}
        avatarUrl={profile?.avatar_url ?? undefined}
        onSignOut={handleSignOut}
      />

      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">{t("feedback.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("feedback.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="message">{t("feedback.messageLabel")}</Label>
            <Textarea
              id="message"
              placeholder={t("feedback.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {t("feedback.emailLabel")}{" "}
              <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("feedback.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("feedback.emailHint")}</p>
          </div>

          <Button type="submit" disabled={sending || !message.trim()} className="w-full gap-2">
            <Send className="h-4 w-4" />
            {sending ? t("feedback.sending") : t("feedback.send")}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t("feedback.anonymous")}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
