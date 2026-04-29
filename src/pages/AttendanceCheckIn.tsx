/**
 * AttendanceCheckIn — public QR check-in page for construction workers.
 * No login required. Workers scan QR → enter name → check in/out.
 * Route: /checkin/:projectId
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LogIn, LogOut, Clock, Loader2, CheckCircle, HardHat } from "lucide-react";

export default function AttendanceCheckIn() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();

  const [projectName, setProjectName] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("attendance_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("attendance_phone") || "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeCheckIn, setActiveCheckIn] = useState<{ id: string; check_in: string } | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [justCheckedOut, setJustCheckedOut] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    // Fetch project name (public — no auth needed, uses anon key)
    const { data } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    if (data) setProjectName(data.name);

    // Check if this worker has an active check-in (no check-out yet)
    if (name.trim()) {
      const { data: active } = await supabase
        .from("attendance_logs")
        .select("id, check_in")
        .eq("project_id", projectId)
        .eq("worker_name", name.trim())
        .is("check_out", null)
        .order("check_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) setActiveCheckIn(active);
    }

    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!name.trim() || !projectId) return;
    setSubmitting(true);

    localStorage.setItem("attendance_name", name.trim());
    if (phone.trim()) localStorage.setItem("attendance_phone", phone.trim());

    const { data, error } = await supabase
      .from("attendance_logs")
      .insert({
        project_id: projectId,
        worker_name: name.trim(),
        worker_phone: phone.trim() || null,
      })
      .select("id, check_in")
      .single();

    setSubmitting(false);

    if (error) {
      toast.error(t("attendance.checkInFailed", "Kunde inte checka in"));
      return;
    }

    setActiveCheckIn(data);
    setJustCheckedIn(true);
    setTimeout(() => setJustCheckedIn(false), 3000);
  };

  const handleCheckOut = async () => {
    if (!activeCheckIn) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString() })
      .eq("id", activeCheckIn.id);

    setSubmitting(false);

    if (error) {
      toast.error(t("attendance.checkOutFailed", "Kunde inte checka ut"));
      return;
    }

    setActiveCheckIn(null);
    setJustCheckedOut(true);
    setTimeout(() => setJustCheckedOut(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <HardHat className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">{t("attendance.title", "Personalliggare")}</h1>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>

          {/* Success states */}
          {justCheckedIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800">{t("attendance.checkedIn", "Incheckad!")}</p>
              <p className="text-sm text-green-600">{new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          )}

          {justCheckedOut && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-blue-800">{t("attendance.checkedOut", "Utcheckad!")}</p>
              <p className="text-sm text-blue-600">{new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          )}

          {/* Active check-in status */}
          {activeCheckIn && !justCheckedIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
              <Clock className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">{t("attendance.activeCheckIn", "Du är incheckad")}</p>
                <p className="text-xs text-green-600">
                  {t("attendance.since", "Sedan")} {new Date(activeCheckIn.check_in).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )}

          {/* Name + phone input */}
          {!justCheckedIn && !justCheckedOut && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("attendance.name", "Namn")} *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("attendance.namePlaceholder", "Ditt namn")}
                    className="h-12 text-base"
                    disabled={!!activeCheckIn}
                  />
                </div>
                {!activeCheckIn && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("attendance.phone", "Telefon")}</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07X XXX XX XX"
                      className="h-12 text-base"
                      type="tel"
                    />
                  </div>
                )}
              </div>

              {/* Action button */}
              {activeCheckIn ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="w-full h-14 text-lg gap-2"
                  variant="outline"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                  {t("attendance.checkOut", "Checka ut")}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  disabled={submitting || !name.trim()}
                  className="w-full h-14 text-lg gap-2"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  {t("attendance.checkIn", "Checka in")}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Renofine · {t("attendance.legalNotice", "Personalliggare enligt lag")}
      </p>
    </div>
  );
}
