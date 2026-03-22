import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkerTaskCard, type WorkerTask } from "@/components/worker/WorkerTaskCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkerViewData {
  projectName: string;
  workerName: string;
  language: string;
  canUploadPhotos: boolean;
  canToggleChecklist: boolean;
  tasks: WorkerTask[];
}

type ErrorState = "not_found" | "expired" | "error" | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkerView() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [data, setData] = useState<WorkerViewData | null>(null);

  useEffect(() => {
    if (!token) {
      setError("not_found");
      setLoading(false);
      return;
    }
    loadWorkerData();
  }, [token]);

  const loadWorkerData = async () => {
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "get-worker-data",
        { body: { token } }
      );

      if (fnError) {
        setError("error");
        return;
      }

      if (result?.error === "not_found") {
        setError("not_found");
        return;
      }
      if (result?.error === "expired") {
        setError("expired");
        return;
      }
      if (result?.error) {
        setError("error");
        return;
      }

      // Set language from worker token
      if (result.language && result.language !== i18n.language) {
        i18n.changeLanguage(result.language);
      }

      setData(result as WorkerViewData);
    } catch (err) {
      console.error("Failed to load worker data:", err);
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<WorkerTask>) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        };
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error states
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-semibold">
            {error === "expired"
              ? t("worker.expired", "This link has expired")
              : error === "not_found"
              ? t("worker.notFound", "Link not found")
              : t("common.error", "Something went wrong")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {error === "expired"
              ? t("worker.expiredDescription", "Contact your project manager for a new link.")
              : error === "not_found"
              ? t("worker.notFoundDescription", "This link is invalid or has been revoked.")
              : t("worker.errorDescription", "Please try again later.")}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // -------------------------------------------------------------------------
  // Main view
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 safe-area-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{data.projectName}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {t("worker.hello", "Hello")}, {data.workerName}
            </p>
          </div>
        </div>
      </header>

      {/* Task cards */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-[env(safe-area-inset-bottom,16px)]">
        {data.tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">{t("worker.noTasks", "No tasks assigned yet.")}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {t("worker.taskCount", "{{count}} tasks", { count: data.tasks.length })}
            </p>
            {data.tasks.map((task) => (
              <WorkerTaskCard
                key={task.id}
                task={task}
                token={token!}
                canToggleChecklist={data.canToggleChecklist}
                canUploadPhotos={data.canUploadPhotos}
                onTaskUpdate={handleTaskUpdate}
              />
            ))}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground/50">
        Powered by Renomate
      </footer>
    </div>
  );
}
