import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Mic, Square, Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface WorkerMessageInputProps {
  token: string;
  taskId: string;
  onMessageSent?: (content: string) => void;
}

export function WorkerMessageInput({ token, taskId, onMessageSent }: WorkerMessageInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount (stop recording if active)
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Text message
  // -------------------------------------------------------------------------
  const handleSendText = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("worker-send-message", {
        body: { token, taskId, message: message.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || "Send failed");
      const sentText = message.trim();
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      onMessageSent?.(sentText);
    } catch (err) {
      console.error("Send failed:", err);
      toast.error(t("common.error", "Could not send message"));
    } finally {
      setSending(false);
    }
  };

  // -------------------------------------------------------------------------
  // Voice recording
  // -------------------------------------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return; // Too short, ignore

        setSending(true);
        try {
          const formData = new FormData();
          formData.append("token", token);
          formData.append("taskId", taskId);
          formData.append("voice", blob, `voice-${Date.now()}.webm`);

          const res = await fetch(`${SUPABASE_URL}/functions/v1/worker-send-message`, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setSent(true);
          setTimeout(() => setSent(false), 3000);
          onMessageSent?.("🎤 Voice message");
        } catch (err) {
          console.error("Voice send failed:", err);
          toast.error(t("common.error", "Could not send voice message"));
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, [token, taskId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (sent) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-600">
        <span>{t("worker.messageSent", "Message sent!")}</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm tabular-nums text-red-600">{formatTime(recordingTime)}</span>
          <span className="text-xs text-muted-foreground">
            {t("worker.recording", "Recording...")}
          </span>
        </div>
        <Button
          size="icon"
          variant="destructive"
          className="h-10 w-10 rounded-full"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("worker.messagePlaceholder", "Ask a question...")}
        className="h-10 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
          }
        }}
        disabled={sending}
      />
      {message.trim() ? (
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleSendText}
          disabled={sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0"
          onClick={startRecording}
          disabled={sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
